<?php

namespace App\Services\Integrations;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class SpecialAllowancesClient
{
    private const SYSTEM = 'special_allowances';

    private function request(?string $idempotencyKey = null): PendingRequest
    {
        $baseUrl = config('services.special_allowances.base_url');
        $request = Http::acceptJson()
            ->asJson()
            ->timeout((int) config('services.special_allowances.timeout', 15))
            ->withHeaders([
                'X-Correlation-ID' => (string) Str::uuid(),
                'X-OneData-Client' => config('app.name', 'one-data-system'),
            ]);

        if (filled($idempotencyKey)) {
            $request = $request->withHeader('Idempotency-Key', $idempotencyKey);
        }

        if (filled(config('services.special_allowances.integration_token'))) {
            $request = $request->withToken((string) config('services.special_allowances.integration_token'));
        }

        if (blank($baseUrl)) {
            throw new RuntimeException('SPECIAL_ALLOWANCES_BASE_URL is not configured.');
        }

        return $request->baseUrl(rtrim((string) $baseUrl, '/'));
    }

    /** @return list<array<string, mixed>> */
    public function healthCenters(): array
    {
        return $this->data($this->request()->get('/internal/api/v1/master-data/health-centers'));
    }

    /** @return list<array<string, mixed>> */
    public function employees(): array
    {
        return $this->data($this->request()->get('/internal/api/v1/master-data/employees'));
    }

    /** @return list<array<string, mixed>> */
    public function users(): array
    {
        return $this->data($this->request()->get('/internal/api/v1/master-data/users'));
    }

    /** @return array<string, mixed> */
    public function sendLeaveSnapshot(array $snapshot): array
    {
        $response = $this->request($snapshot['idempotency_key'] ?? null)
            ->post('/internal/api/v1/periods/'.$snapshot['period'].'/leave-snapshot', $snapshot);

        return $this->dataObject($response);
    }

    /** @return list<array<string, mixed>> */
    private function data($response): array
    {
        return $this->dataObject($response)['data'] ?? [];
    }

    /** @return array<string, mixed> */
    private function dataObject($response): array
    {
        if ($response->failed()) {
            throw new RuntimeException(sprintf(
                'Special-Allowances API failed with HTTP %s.',
                $response->status(),
            ));
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            throw new RuntimeException('Special-Allowances API returned an invalid JSON payload.');
        }

        return $payload;
    }
}
