<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PortalLaunchTest extends TestCase
{
    use RefreshDatabase;

    public function test_portal_launch_token_creates_a_local_session(): void
    {
        config([
            'onedata.portal.shared_secret' => 'test-portal-secret',
            'onedata.portal.audience' => 'one_data',
        ]);
        $token = $this->token([
            'sub' => 'portal-user-1',
            'aud' => 'one_data',
            'name' => 'Portal User',
            'username' => 'portal.user',
            'roles' => ['pcu_staff'],
            'exp' => now()->addMinute()->timestamp,
            'jti' => 'jti-1',
        ]);

        $response = $this->get('/auth/portal/launch?token='.urlencode($token));
        $response->assertRedirect('/dashboard');
        $this->assertAuthenticated();
        $this->assertSame('portal-user-1', User::query()->firstOrFail()->portal_user_id);
    }

    public function test_portal_launch_token_cannot_be_replayed(): void
    {
        config([
            'onedata.portal.shared_secret' => 'test-portal-secret',
            'onedata.portal.audience' => 'one_data',
        ]);
        $token = $this->token([
            'sub' => 'portal-user-2',
            'aud' => 'one_data',
            'exp' => now()->addMinute()->timestamp,
            'jti' => 'jti-replay',
        ]);

        $this->get('/auth/portal/launch?token='.urlencode($token))->assertRedirect('/dashboard');
        $this->get('/auth/portal/launch?token='.urlencode($token))->assertStatus(401);
    }

    /** @param array<string, mixed> $payload */
    private function token(array $payload): string
    {
        $header = $this->base64Url(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_THROW_ON_ERROR));
        $body = $this->base64Url(json_encode($payload, JSON_THROW_ON_ERROR));
        $signature = $this->base64Url(hash_hmac('sha256', $header.'.'.$body, 'test-portal-secret', true));

        return $header.'.'.$body.'.'.$signature;
    }

    private function base64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
