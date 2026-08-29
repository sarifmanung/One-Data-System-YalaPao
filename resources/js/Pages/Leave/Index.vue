<script setup lang="ts">
import { Head, router, useForm } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';

interface Tenant { id: string; code: string; name: string; }
interface Membership { tenant_id: string; tenant_name: string | null; }
interface Person { id: string; name: string; memberships: Membership[]; }
interface Leave {
    id: string;
    person_name: string | null;
    tenant_name: string | null;
    leave_type: string;
    starts_on: string;
    ends_on: string;
    duration_days: string | null;
    reason: string | null;
    status: string;
    revision: number;
}

const props = defineProps<{
    people: Person[];
    tenants: Tenant[];
    leaves: Leave[];
    leaveTypes: Record<string, string>;
}>();

const form = useForm({
    person_id: '',
    tenant_id: '',
    leave_type: 'PERSONAL_LEAVE',
    starts_on: '',
    ends_on: '',
    duration_days: '',
    reason: '',
});

const statusLabels: Record<string, string> = {
    DRAFT: 'แบบร่าง',
    CONFIRMED: 'มีผล',
    CANCELLED: 'ยกเลิก',
    VOID: 'โมฆะ',
};

function submit() {
    form.post('/leaves', { preserveScroll: true, onSuccess: () => form.reset('starts_on', 'ends_on', 'duration_days', 'reason') });
}

function confirmLeave(id: string) {
    router.post(`/leaves/${id}/confirm`, {}, { preserveScroll: true });
}

function cancelLeave(id: string) {
    const reason = window.prompt('เหตุผลการยกเลิก (ไม่บังคับ)') || '';
    router.post(`/leaves/${id}/cancel`, { reason }, { preserveScroll: true });
}

function voidLeave(id: string) {
    const reason = window.prompt('เหตุผลการทำให้เป็นโมฆะ (ไม่บังคับ)') || '';
    router.post(`/leaves/${id}/void`, { reason }, { preserveScroll: true });
}
</script>

<template>
    <Head title="ระบบการลา" />
    <AppLayout title="ระบบการลา">
        <div class="grid gap-8 xl:grid-cols-[minmax(0,420px)_1fr]">
            <section class="panel h-fit">
                <div class="mb-5">
                    <h2 class="section-title">บันทึกใบลา</h2>
                    <p class="section-help">บันทึกเป็นแบบร่างก่อน แล้วกดยืนยันเมื่อข้อมูลถูกต้อง</p>
                </div>
                <form class="space-y-4" @submit.prevent="submit">
                    <div>
                        <label class="label" for="person_id">บุคลากร</label>
                        <select id="person_id" v-model="form.person_id" class="field" required>
                            <option value="" disabled>เลือกบุคลากร</option>
                            <option v-for="person in people" :key="person.id" :value="person.id">{{ person.name }}</option>
                        </select>
                        <p v-if="form.errors.person_id" class="form-error">{{ form.errors.person_id }}</p>
                    </div>
                    <div>
                        <label class="label" for="tenant_id">หน่วยงาน</label>
                        <select id="tenant_id" v-model="form.tenant_id" class="field" required>
                            <option value="" disabled>เลือกหน่วยงาน</option>
                            <option v-for="tenant in tenants" :key="tenant.id" :value="tenant.id">{{ tenant.name }}</option>
                        </select>
                        <p v-if="form.errors.tenant_id" class="form-error">{{ form.errors.tenant_id }}</p>
                    </div>
                    <div>
                        <label class="label" for="leave_type">ประเภทการลา</label>
                        <select id="leave_type" v-model="form.leave_type" class="field" required>
                            <option v-for="(label, value) in leaveTypes" :key="value" :value="value">{{ label }}</option>
                        </select>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div><label class="label" for="starts_on">วันเริ่มลา</label><input id="starts_on" v-model="form.starts_on" type="date" class="field" required /></div>
                        <div><label class="label" for="ends_on">วันสิ้นสุด</label><input id="ends_on" v-model="form.ends_on" type="date" class="field" required /></div>
                    </div>
                    <div>
                        <label class="label" for="duration_days">จำนวนวัน (เว้นว่างให้คำนวณจากช่วงวัน)</label>
                        <input id="duration_days" v-model="form.duration_days" type="number" min="0.5" max="366" step="0.5" class="field" placeholder="เช่น 1 หรือ 0.5" />
                        <p v-if="form.errors.duration_days" class="form-error">{{ form.errors.duration_days }}</p>
                    </div>
                    <div><label class="label" for="reason">หมายเหตุ</label><textarea id="reason" v-model="form.reason" class="field min-h-20" rows="3" /></div>
                    <button type="submit" class="btn-primary w-full" :disabled="form.processing">{{ form.processing ? 'กำลังบันทึก…' : 'บันทึกแบบร่าง' }}</button>
                </form>
            </section>

            <section class="panel overflow-hidden p-0">
                <div class="border-b border-slate-200 px-5 py-5">
                    <h2 class="section-title">รายการใบลา</h2>
                    <p class="section-help">เฉพาะใบลา CONFIRMED จะถูกส่งไปประมวลผลที่ระบบ ฉ.</p>
                </div>
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead><tr><th>บุคลากร</th><th>ประเภท</th><th>ช่วงวันลา</th><th>หน่วยงาน</th><th>สถานะ</th><th>การทำงาน</th></tr></thead>
                        <tbody>
                            <tr v-for="leave in props.leaves" :key="leave.id">
                                <td><div class="font-medium">{{ leave.person_name || 'ไม่ระบุ' }}</div><div class="text-xs text-slate-500">rev. {{ leave.revision }}</div></td>
                                <td>{{ leaveTypes[leave.leave_type] || leave.leave_type }}</td>
                                <td>{{ leave.starts_on }} – {{ leave.ends_on }}<div class="text-xs text-slate-500">{{ leave.duration_days }} วัน</div></td>
                                <td>{{ leave.tenant_name || 'ไม่ระบุ' }}</td>
                                <td><span class="status-pill" :class="`status-${leave.status.toLowerCase()}`">{{ statusLabels[leave.status] || leave.status }}</span></td>
                                <td>
                                    <div class="flex flex-wrap gap-2">
                                        <button v-if="leave.status === 'DRAFT'" type="button" class="btn-small btn-green" @click="confirmLeave(leave.id)">ยืนยัน</button>
                                        <button v-if="leave.status === 'CONFIRMED'" type="button" class="btn-small btn-amber" @click="cancelLeave(leave.id)">ยกเลิก</button>
                                        <button v-if="['DRAFT', 'CANCELLED'].includes(leave.status)" type="button" class="btn-small btn-muted" @click="voidLeave(leave.id)">ทำให้โมฆะ</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-if="!props.leaves.length" class="empty-state">ยังไม่มีรายการใบลา</div>
            </section>
        </div>
    </AppLayout>
</template>
