<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Integrations\SpecialMasterDataSyncService;
use Illuminate\Console\Command;

class SyncSpecialMasterData extends Command
{
    protected $signature = 'special:sync-master-data {--user= : Local One Data actor user id}';

    protected $description = 'Import Special-Allowances health centers, employees and users into One Data';

    public function handle(SpecialMasterDataSyncService $sync): int
    {
        $actor = $this->actor();
        $summary = $sync->sync($actor?->id);
        $this->info(sprintf(
            'Synced %d tenants, %d persons and %d users; %d users remain unmapped.',
            $summary['tenants'],
            $summary['persons'],
            $summary['users'],
            $summary['unmapped_users'],
        ));

        return self::SUCCESS;
    }

    private function actor(): ?User
    {
        if ($this->option('user')) {
            return User::query()->findOrFail((int) $this->option('user'));
        }

        return User::query()->where('role', 'ADMIN')->where('is_active', true)->first();
    }
}
