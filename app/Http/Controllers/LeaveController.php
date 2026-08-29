<?php

namespace App\Http\Controllers;

use App\Models\LeaveRequest;
use App\Models\Person;
use App\Models\Tenant;
use App\Services\Leave\LeaveRequestService;
use App\Services\Platform\TenantAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LeaveController extends Controller
{
    public function __construct(
        private readonly TenantAccess $tenantAccess,
        private readonly LeaveRequestService $leaveService,
    ) {}

    public function index(Request $request): Response
    {
        $tenantIds = $this->tenantAccess->idsFor($request->user());
        $tenants = Tenant::query()->whereIn('id', $tenantIds)->orderBy('name')->get(['id', 'code', 'name']);
        $people = Person::query()
            ->whereHas('memberships', fn ($query) => $query->whereIn('tenant_id', $tenantIds))
            ->with(['memberships' => fn ($query) => $query->whereIn('tenant_id', $tenantIds)->with('tenant')])
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Person $person): array => [
                'id' => $person->id,
                'name' => $person->displayName(),
                'memberships' => $person->memberships->map(fn ($membership): array => [
                    'tenant_id' => $membership->tenant_id,
                    'tenant_name' => $membership->tenant?->name,
                ])->values(),
            ])->values();
        $leaves = LeaveRequest::query()
            ->whereIn('tenant_id', $tenantIds)
            ->with(['person', 'tenant'])
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (LeaveRequest $leave): array => $this->serializeLeave($leave));

        return Inertia::render('Leave/Index', [
            'people' => $people,
            'tenants' => $tenants,
            'leaves' => $leaves,
            'leaveTypes' => [
                'PERSONAL_LEAVE' => 'ลากิจส่วนตัว',
                'SICK_LEAVE' => 'ลาป่วย',
                'VACATION_LEAVE' => 'ลาพักผ่อน',
                'ABSENT' => 'ขาดงาน/ไม่มาปฏิบัติงาน',
                'MATERNITY_LEAVE' => 'ลาคลอดบุตร',
                'HAJJ_LEAVE' => 'ลาไปประกอบพิธีฮัจย์',
                'ORDAIN_LEAVE' => 'ลาอุปสมบท',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'person_id' => ['required', 'uuid', 'exists:persons,id'],
            'tenant_id' => ['required', 'uuid', 'exists:tenants,id'],
            'leave_type' => ['required', Rule::in(LeaveRequest::TYPES)],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
            'duration_days' => ['nullable', 'numeric', 'min:0.5', 'max:366'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $this->leaveService->create($data, $request->user());

        return to_route('leaves.index')->with('success', 'บันทึกใบลาเป็นแบบร่างแล้ว กรุณายืนยันเมื่อข้อมูลถูกต้อง');
    }

    public function confirm(Request $request, LeaveRequest $leave): RedirectResponse
    {
        $this->leaveService->transition($leave, 'CONFIRMED', $request->user());

        return back()->with('success', 'ยืนยันใบลาแล้ว และใบลานี้จะถูกนำไปรวมใน snapshot ของระบบ ฉ.');
    }

    public function cancel(Request $request, LeaveRequest $leave): RedirectResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:2000']]);
        $this->leaveService->transition($leave, 'CANCELLED', $request->user(), $data['reason'] ?? null);

        return back()->with('success', 'ยกเลิกใบลาแล้ว');
    }

    public function void(Request $request, LeaveRequest $leave): RedirectResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:2000']]);
        $this->leaveService->transition($leave, 'VOID', $request->user(), $data['reason'] ?? null);

        return back()->with('success', 'ทำให้ใบลาเป็นโมฆะแล้ว ประวัติยังคงอยู่ในระบบ');
    }

    /** @return array<string, mixed> */
    private function serializeLeave(LeaveRequest $leave): array
    {
        return [
            'id' => $leave->id,
            'person_id' => $leave->person_id,
            'person_name' => $leave->person?->displayName(),
            'tenant_id' => $leave->tenant_id,
            'tenant_name' => $leave->tenant?->name,
            'leave_type' => $leave->leave_type,
            'starts_on' => $leave->starts_on?->toDateString(),
            'ends_on' => $leave->ends_on?->toDateString(),
            'duration_days' => $leave->duration_days,
            'reason' => $leave->reason,
            'status' => $leave->status,
            'revision' => $leave->revision,
        ];
    }
}
