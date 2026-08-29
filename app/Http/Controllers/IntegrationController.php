<?php

namespace App\Http\Controllers;

use App\Models\LeaveExportBatch;
use App\Services\Integrations\SpecialMasterDataSyncService;
use App\Services\Leave\LeaveSnapshotService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationController extends Controller
{
    public function __construct(
        private readonly SpecialMasterDataSyncService $masterDataSync,
        private readonly LeaveSnapshotService $snapshotService,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Integration/Index', [
            'dryRun' => (bool) config('services.special_allowances.dry_run', true),
            'batches' => LeaveExportBatch::query()
                ->with('affiliation')
                ->latest()
                ->limit(30)
                ->get()
                ->map(fn (LeaveExportBatch $batch): array => [
                    'id' => $batch->id,
                    'period' => sprintf('%04d-%02d', $batch->period_year, $batch->period_month),
                    'snapshot_version' => $batch->snapshot_version,
                    'status' => $batch->status,
                    'item_count' => $batch->item_count,
                    'source_hash' => $batch->source_hash,
                    'created_at' => $batch->created_at?->toIso8601String(),
                    'error_message' => $batch->error_message,
                ]),
        ]);
    }

    public function syncMasterData(Request $request): RedirectResponse
    {
        abort_unless($request->user()->hasRole('ADMIN', 'PUBLIC_HEALTH_OFFICER'), 403);
        $summary = $this->masterDataSync->sync($request->user()->id);

        return back()->with('success', sprintf(
            'sync master data สำเร็จ: รพ.สต. %d แห่ง บุคลากร %d คน บัญชี %d บัญชี (ยังจับคู่ไม่ได้ %d บัญชี)',
            $summary['tenants'],
            $summary['persons'],
            $summary['users'],
            $summary['unmapped_users'],
        ));
    }

    public function createAndSendSnapshot(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2200'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
        ]);
        $batch = $this->snapshotService->prepare((int) $data['year'], (int) $data['month'], $request->user());
        $this->snapshotService->send($batch, $request->user());

        return back()->with('success', 'สร้างและส่ง leave snapshot แล้ว สถานะ: '.$batch->fresh()->status);
    }

    public function sendSnapshot(Request $request, LeaveExportBatch $batch): RedirectResponse
    {
        $this->snapshotService->send($batch, $request->user());

        return back()->with('success', 'ส่ง leave snapshot ซ้ำแล้ว');
    }
}
