<script setup lang="ts">
import { Head, Link, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import AppLayout from '../Layouts/AppLayout.vue';

interface Stats {
    people: number;
    draftLeaves: number;
    confirmedLeaves: number;
    todayLeaves: number;
}

interface PositionSummary {
    label: string;
    count: number;
    percentage: number;
}

interface RecentLeave {
    id: string;
    person: string | null;
    tenant: string | null;
    type: string;
    starts_on: string;
    ends_on: string;
    status: string;
}

interface DashboardContext {
    tenant_count: number;
    tenant_name: string | null;
}

const props = defineProps<{
    stats: Stats;
    positionSummary: PositionSummary[];
    leaveStatus: Record<string, number>;
    recentLeaves: RecentLeave[];
    dashboardContext: DashboardContext;
}>();
const page = usePage<any>();

const typeLabels: Record<string, string> = {
    PERSONAL_LEAVE: 'ลากิจส่วนตัว',
    SICK_LEAVE: 'ลาป่วย',
    VACATION_LEAVE: 'ลาพักผ่อน',
    ABSENT: 'ขาดงาน',
    MATERNITY_LEAVE: 'ลาคลอดบุตร',
    HAJJ_LEAVE: 'ลาฮัจย์',
    ORDAIN_LEAVE: 'ลาอุปสมบท',
};

const statusLabels: Record<string, string> = {
    DRAFT: 'แบบร่าง',
    CONFIRMED: 'มีผล',
    CANCELLED: 'ยกเลิก',
    VOID: 'โมฆะ',
};

const statusItems = [
    { key: 'confirmed', label: 'ใบลาที่มีผล', color: 'bg-emerald-500' },
    { key: 'draft', label: 'รอตรวจสอบ', color: 'bg-amber-400' },
    { key: 'cancelled', label: 'ยกเลิก', color: 'bg-slate-400' },
    { key: 'void', label: 'โมฆะ', color: 'bg-slate-300' },
];

const monthLabel = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(new Date());
const todayLabel = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

const totalStatus = computed(() => Object.values(props.leaveStatus).reduce((sum, value) => sum + value, 0));
const tenantLabel = computed(() => props.dashboardContext.tenant_name || 'ทุกหน่วยงานในสังกัด');

function statusPercentage(value: number): number {
    return totalStatus.value > 0 ? Math.round((value * 100) / totalStatus.value) : 0;
}
</script>

<template>
    <Head title="แดชบอร์ด" />
    <AppLayout title="แดชบอร์ด">
        <div class="space-y-6">
            <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <div class="text-xs font-semibold text-blue-700">ภาพรวมหน่วยงาน · {{ monthLabel }}</div>
                    <h1 class="mt-1 text-3xl font-bold tracking-tight text-slate-950">แดชบอร์ด</h1>
                    <p class="mt-1 text-sm text-slate-500">สรุปกำลังคนและการลาของ {{ tenantLabel }}</p>
                </div>
                <div class="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
                    <span class="h-2 w-2 rounded-full bg-blue-600" />
                    {{ todayLabel }}
                </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <section class="stat-card">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="stat-label">พนักงานทั้งหมด</div>
                            <div class="stat-value">{{ stats.people }} <span class="text-sm font-medium text-slate-500">คน</span></div>
                        </div>
                        <span class="metric-icon"><span>♙</span></span>
                    </div>
                    <div class="mt-3 text-xs text-slate-500">{{ positionSummary.length }} ประเภทตำแหน่ง</div>
                </section>
                <section class="stat-card">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="stat-label">ปฏิบัติงานวันนี้</div>
                            <div class="stat-value text-slate-500">—</div>
                        </div>
                        <span class="metric-icon"><span>✓</span></span>
                    </div>
                    <div class="mt-3 text-xs text-slate-500">ยังไม่เปิดโมดูลการปฏิบัติงาน</div>
                </section>
                <section class="stat-card">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="stat-label">ลาวันนี้</div>
                            <div class="stat-value">{{ stats.todayLeaves }} <span class="text-sm font-medium text-slate-500">คน</span></div>
                        </div>
                        <span class="metric-icon"><span>◷</span></span>
                    </div>
                    <div class="mt-3 flex items-center gap-1.5 text-xs" :class="stats.todayLeaves ? 'text-amber-700' : 'text-emerald-600'">
                        <span class="h-1.5 w-1.5 rounded-full" :class="stats.todayLeaves ? 'bg-amber-500' : 'bg-emerald-500'" />
                        {{ stats.todayLeaves ? 'มีพนักงานลาในวันนี้' : 'ไม่มีพนักงานลา' }}
                    </div>
                </section>
                <section class="stat-card border-blue-200 bg-blue-50/50">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="stat-label text-blue-800">ใบลารอจัดการ</div>
                            <div class="stat-value text-blue-900">{{ stats.draftLeaves }} <span class="text-sm font-medium text-blue-700">รายการ</span></div>
                        </div>
                        <span class="metric-icon metric-icon-blue"><span>!</span></span>
                    </div>
                    <div class="mt-3 text-xs text-blue-700">ตรวจสอบและยืนยันก่อนส่งระบบ ฉ.</div>
                </section>
            </div>

            <section class="panel overflow-hidden">
                <div class="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center">
                    <div>
                        <h2 class="section-title">สรุปข้อมูล One Data · ระบบ ฉ.10/11</h2>
                        <p class="section-help">ข้อมูลบุคลากรจากระบบ ฉ. และสถานะข้อมูลการลาที่พร้อมนำไปประมวลผล</p>
                    </div>
                    <Link v-if="['ADMIN', 'PUBLIC_HEALTH_OFFICER'].includes(page.props.auth?.user?.role)" href="/integrations" class="text-sm font-semibold text-blue-700 hover:text-blue-900">ดูรายละเอียด →</Link>
                </div>
                <div class="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
                    <div class="summary-card">
                        <div class="summary-label">บุคลากรในขอบเขต</div>
                        <div class="summary-value">{{ stats.people }} <span>คน</span></div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">หน่วยงานในขอบเขต</div>
                        <div class="summary-value">{{ dashboardContext.tenant_count }} <span>แห่ง</span></div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">ใบลาที่มีผล</div>
                        <div class="summary-value">{{ stats.confirmedLeaves }} <span>รายการ</span></div>
                    </div>
                </div>
            </section>

            <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <section class="panel overflow-hidden">
                    <div class="border-b border-slate-100 px-5 py-5">
                        <h2 class="section-title">พนักงานแยกตามตำแหน่ง</h2>
                        <p class="section-help">รวม {{ stats.people }} คน ในขอบเขตที่คุณเข้าถึงได้</p>
                    </div>
                    <div v-if="positionSummary.length" class="space-y-5 p-5">
                        <div v-for="position in positionSummary" :key="position.label">
                            <div class="mb-2 flex items-center justify-between gap-3 text-sm">
                                <span class="truncate font-medium text-slate-700">{{ position.label }}</span>
                                <span class="shrink-0 font-semibold text-slate-800">{{ position.count }} <span class="font-normal text-slate-400">· {{ position.percentage }}%</span></span>
                            </div>
                            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div class="h-full rounded-full bg-blue-600 transition-all" :style="{ width: `${position.percentage}%` }" />
                            </div>
                        </div>
                    </div>
                    <div v-else class="empty-state">ยังไม่มีข้อมูลตำแหน่ง</div>
                </section>

                <section class="panel overflow-hidden">
                    <div class="border-b border-slate-100 px-5 py-5">
                        <h2 class="section-title">สถานะใบลา</h2>
                        <p class="section-help">ภาพรวมรายการใบลาทั้งหมดในขอบเขต</p>
                    </div>
                    <div class="space-y-4 p-5">
                        <div v-for="item in statusItems" :key="item.key">
                            <div class="mb-1.5 flex items-center justify-between text-sm">
                                <div class="flex items-center gap-2 text-slate-600"><span class="h-2.5 w-2.5 rounded-full" :class="item.color" />{{ item.label }}</div>
                                <div class="font-semibold text-slate-800">{{ leaveStatus[item.key] || 0 }} <span class="ml-1 text-xs font-normal text-slate-400">{{ statusPercentage(leaveStatus[item.key] || 0) }}%</span></div>
                            </div>
                            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div class="h-full rounded-full transition-all" :class="item.color" :style="{ width: `${statusPercentage(leaveStatus[item.key] || 0)}%` }" />
                            </div>
                        </div>
                        <div v-if="!totalStatus" class="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">ยังไม่มีรายการใบลา</div>
                    </div>
                </section>
            </div>

            <section class="panel overflow-hidden">
                <div class="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center">
                    <div>
                        <h2 class="section-title">รายการใบลาล่าสุด</h2>
                        <p class="section-help">เฉพาะใบลา CONFIRMED เท่านั้นที่จะถูกนำไปจัดทำ snapshot ให้ระบบ ฉ.</p>
                    </div>
                    <Link href="/leaves" class="text-sm font-semibold text-blue-700 hover:text-blue-900">ดูทั้งหมด →</Link>
                </div>
                <div v-if="recentLeaves.length" class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr><th>บุคลากร</th><th>ประเภท</th><th>ช่วงวันลา</th><th>หน่วยงาน</th><th>สถานะ</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="leave in recentLeaves" :key="leave.id">
                                <td class="font-medium">{{ leave.person || 'ไม่ระบุ' }}</td>
                                <td>{{ typeLabels[leave.type] || leave.type }}</td>
                                <td>{{ leave.starts_on }} – {{ leave.ends_on }}</td>
                                <td>{{ leave.tenant || 'ไม่ระบุ' }}</td>
                                <td><span class="status-pill" :class="`status-${leave.status.toLowerCase()}`">{{ statusLabels[leave.status] || leave.status }}</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-else class="empty-state">ยังไม่มีรายการใบลา</div>
            </section>

            <section class="panel border-dashed bg-slate-50/70">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 class="section-title">โมดูลที่กำลังจะเปิดใช้งาน</h2>
                        <p class="section-help">โครงสร้าง One Data พร้อมรองรับการต่อยอด โดยรอบนี้เปิดใช้งานเฉพาะบุคลากร การลา และการเชื่อมต่อระบบ ฉ.</p>
                    </div>
                    <span class="status-pill status-pending">กำลังพัฒนา</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                    <span class="roadmap-chip">ตารางเวร</span><span class="roadmap-chip">การปฏิบัติงาน</span><span class="roadmap-chip">วัสดุ</span><span class="roadmap-chip">ยานพาหนะ</span><span class="roadmap-chip">การเงิน</span>
                </div>
            </section>
        </div>
    </AppLayout>
</template>
