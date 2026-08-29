<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use App\Services\Governance\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class PortalLaunchController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function launch(Request $request): RedirectResponse
    {
        $token = (string) $request->query('token', '');
        $payload = $this->decode($token);
        $portalUserId = (string) $payload['sub'];

        if (! empty($payload['jti'])) {
            $accepted = Cache::add(
                'portal-launch-jti:'.$payload['jti'],
                true,
                max(1, ((int) $payload['exp']) - now()->timestamp),
            );
            abort_unless($accepted, 401, 'Launch token ถูกใช้แล้ว');
        }

        $username = filled($payload['username'] ?? null) ? (string) $payload['username'] : null;
        $user = User::query()->where('portal_user_id', $portalUserId)->first();
        if (! $user && $username) {
            $user = User::query()->where('username', $username)->first();
        }
        $user ??= new User;
        $user->fill([
            'name' => (string) ($payload['name'] ?? $username ?? $portalUserId),
            'username' => $username ?: $user->username,
            'role' => $this->roleFromPayload($payload),
            'is_active' => true,
            'portal_user_id' => $portalUserId,
        ]);
        $user->save();
        $this->syncOrganizationScope($user, $payload);

        abort_unless($user->is_active, 403, 'บัญชีผู้ใช้ถูกระงับ');
        Auth::login($user);
        $request->session()->regenerate();

        $this->audit->record(
            'auth.portal_launch',
            'User',
            (string) $user->id,
            null,
            ['portal_user_id' => $portalUserId],
            ['issuer' => $payload['iss'] ?? null, 'audience' => $payload['aud'] ?? null],
            $user->id,
        );

        $returnTo = (string) ($payload['return_to'] ?? '');

        return redirect()->to(Str::startsWith($returnTo, '/') ? $returnTo : route('dashboard'));
    }

    /** @return array<string, mixed> */
    private function decode(string $token): array
    {
        $parts = explode('.', $token);
        abort_unless(count($parts) === 3, 401, 'Launch token ไม่ถูกต้อง');
        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
        $secret = (string) config('onedata.portal.shared_secret');
        abort_unless($secret !== '', 503, 'ยังไม่ได้ตั้งค่า Portal shared secret');

        $expected = $this->base64UrlEncode(hash_hmac('sha256', $encodedHeader.'.'.$encodedPayload, $secret, true));
        abort_unless(hash_equals($expected, $encodedSignature), 401, 'ลายเซ็น Launch token ไม่ถูกต้อง');

        $header = $this->decodeJson($encodedHeader);
        $payload = $this->decodeJson($encodedPayload);
        abort_unless(($header['alg'] ?? null) === 'HS256', 401, 'ไม่รองรับ algorithm นี้');
        abort_unless(isset($payload['sub'], $payload['aud'], $payload['exp']), 401, 'Launch token ขาดข้อมูลสำคัญ');
        abort_unless((int) $payload['exp'] >= now()->timestamp, 401, 'Launch token หมดอายุ');

        $expectedAudience = (string) config('onedata.portal.audience', 'one_data');
        $audiences = is_array($payload['aud']) ? $payload['aud'] : [$payload['aud']];
        abort_unless(in_array($expectedAudience, $audiences, true), 401, 'Launch token audience ไม่ตรงระบบ');

        $expectedIssuer = config('onedata.portal.issuer');
        if (filled($expectedIssuer)) {
            abort_unless(($payload['iss'] ?? null) === $expectedIssuer, 401, 'Launch token issuer ไม่ตรงระบบ');
        }

        return $payload;
    }

    /** @return array<string, mixed> */
    private function decodeJson(string $value): array
    {
        $base64 = strtr($value, '-_', '+/');
        $base64 .= str_repeat('=', (4 - strlen($base64) % 4) % 4);
        $decoded = base64_decode($base64, true);
        if ($decoded === false) {
            throw new RuntimeException('Invalid base64url token segment.');
        }

        $json = json_decode($decoded, true);
        if (! is_array($json)) {
            throw new RuntimeException('Invalid JSON token segment.');
        }

        return $json;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    /** @param array<string, mixed> $payload */
    private function roleFromPayload(array $payload): string
    {
        $roles = array_merge(
            is_array($payload['roles'] ?? null) ? $payload['roles'] : [],
            is_array($payload['entitlements'] ?? null) ? $payload['entitlements'] : [],
        );
        $normalized = array_map(static fn (mixed $role): string => strtoupper((string) $role), $roles);

        return match (true) {
            in_array('ADMIN', $normalized, true),
            in_array('SUPER_ADMIN', $normalized, true),
            in_array('HEALTH_ADMIN', $normalized, true) => 'ADMIN',
            in_array('PUBLIC_HEALTH_OFFICER', $normalized, true),
            in_array('PUBLIC-HEALTH-OFFICER', $normalized, true),
            in_array('HEALTH_STAFF', $normalized, true) => 'PUBLIC_HEALTH_OFFICER',
            default => 'HEALTH_CENTER_USER',
        };
    }

    /** @param array<string, mixed> $payload */
    private function syncOrganizationScope(User $user, array $payload): void
    {
        $organization = $payload['organization'] ?? null;
        if (! is_array($organization)) {
            return;
        }

        $identifiers = collect([
            $organization['code'] ?? null,
            $organization['health_service_code'] ?? null,
        ])->filter()->map(fn (mixed $value): string => (string) $value)->values()->all();
        $name = filled($organization['name'] ?? null) ? (string) $organization['name'] : null;
        if ($identifiers === [] && ! $name) {
            return;
        }
        $tenant = Tenant::query()
            ->when($identifiers !== [], fn ($query) => $query->where(function ($query) use ($identifiers) {
                $query->whereIn('code', $identifiers)->orWhereIn('source_code', $identifiers);
            }))
            ->when($name, fn ($query) => $query->orWhere('name', $name))
            ->first();

        if (! $tenant) {
            return;
        }

        DB::table('user_tenant_memberships')->updateOrInsert(
            ['user_id' => $user->id, 'tenant_id' => $tenant->id],
            ['role' => $user->role, 'starts_on' => today()->toDateString(), 'updated_at' => now(), 'created_at' => now()],
        );
    }
}
