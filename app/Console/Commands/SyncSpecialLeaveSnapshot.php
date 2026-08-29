<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Leave\LeaveSnapshotService;
use Illuminate\Console\Command;

class SyncSpecialLeaveSnapshot extends Command
{
    protected $signature = 'special:sync-leave {year : Gregorian calendar year} {month : Month number 1-12} {--user= : Local One Data actor user id}';

    protected $description = 'Prepare and send a complete confirmed-leave snapshot to Special-Allowances';

    public function handle(LeaveSnapshotService $snapshots): int
    {
        $actor = $this->actor();
        $batch = $snapshots->prepare((int) $this->argument('year'), (int) $this->argument('month'), $actor);
        $batch = $snapshots->send($batch, $actor);
        $this->info(sprintf('Snapshot %s is %s.', $batch->id, $batch->status));

        return self::SUCCESS;
    }

    private function actor(): User
    {
        if ($this->option('user')) {
            return User::query()->findOrFail((int) $this->option('user'));
        }

        return User::query()->where('role', 'ADMIN')->where('is_active', true)->firstOrFail();
    }
}
