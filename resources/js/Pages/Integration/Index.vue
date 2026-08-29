<script setup lang="ts">
import { Head, router, useForm } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';

interface Batch {
    id: string;
    period: string;
    snapshot_version: number;
    status: string;
    item_count: number;
    source_hash: string | null;
    created_at: string | null;
    error_message: string | null;
}

const props = defineProps<{ dryRun: boolean; batches: Batch[] }>();
const now = new Date();
const snapshotForm = useForm({ year: now.getFullYear(), month: now.getMonth() + 1 });

function createSnapshot() {
    snapshotForm.post('/integrations/special/leave-snapshots', { preserveScroll: true });
}

function syncMasterData() {
    router.post('/integrations/special/master-data/sync', {}, { preserveScroll: true });
}

function resend(id: string) {
    router.post(`/integrations/special/leave-snapshots/${id}/send`, {}, { preserveScroll: true });
}
</script>

<template>
    <Head title="เชื่อมต่อระบบ ฉ." />
    <AppLayout title="เชื่อมต่อระบบ ฉ.10/11">
        <div class="grid gap-6 lg:grid-cols-2">
            <section class="panel">
                <h2 class="section-title">1. Sync master data</h2>
                <p class="section-help">ดึงหน่วยงาน บุคลากร และข้อมูลบัญชีจาก Special-Allowances มาเป็นข้อมูลอ้างอิงของ One Data</p>
                <button type="button" class="btn-primary mt-5" @click="syncMasterData">เริ่ม sync master data</button>
            </section>
            <section class="panel">
                <h2 class="section-title">2. ส่งข้อมูลการลารายเดือน</h2>
                <p class="section-help">ส่ง snapshot แบบเต็มของใบลา CONFIRMED ในเดือนที่เลือก ระบบปลายทางเป็นเจ้าของการคำนวณ</p>
                <div v-if="props.dryRun" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">ขณะนี้อยู่โหมด DRY RUN ยังไม่ยิงไป Special จริง</div>
                <form class="mt-5 flex flex-wrap items-end gap-3" @submit.prevent="createSnapshot">
                    <div><label class="label" for="year">ปี ค.ศ.</label><input id="year" v-model.number="snapshotForm.year" type="number" class="field w-28" min="2000" max="2200" /></div>
                    <div><label class="label" for="month">เดือน</label><input id="month" v-model.number="snapshotForm.month" type="number" class="field w-24" min="1" max="12" /></div>
                    <button type="submit" class="btn-primary" :disabled="snapshotForm.processing">สร้างและส่ง snapshot</button>
                </form>
            </section>
        </div>

        <section class="panel mt-8 overflow-hidden p-0">
            <div class="border-b border-slate-200 px-5 py-5"><h2 class="section-title">ประวัติ snapshot</h2><p class="section-help">เก็บ version, hash, idempotency และผลการส่งไว้ตรวจสอบย้อนหลัง</p></div>
            <div class="overflow-x-auto">
                <table class="data-table">
                    <thead><tr><th>งวด</th><th>เวอร์ชัน</th><th>รายการ</th><th>สถานะ</th><th>สร้างเมื่อ</th><th>การทำงาน</th></tr></thead>
                    <tbody>
                        <tr v-for="batch in props.batches" :key="batch.id">
                            <td class="font-medium">{{ batch.period }}</td><td>{{ batch.snapshot_version }}</td><td>{{ batch.item_count }}</td>
                            <td><span class="status-pill" :class="`status-${batch.status.toLowerCase()}`">{{ batch.status }}</span><div v-if="batch.error_message" class="mt-1 text-xs text-red-600">{{ batch.error_message }}</div></td>
                            <td>{{ batch.created_at ? new Date(batch.created_at).toLocaleString('th-TH') : '—' }}</td>
                            <td><button v-if="batch.status === 'FAILED'" type="button" class="btn-small btn-muted" @click="resend(batch.id)">ส่งซ้ำ</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-if="!props.batches.length" class="empty-state">ยังไม่มี snapshot</div>
        </section>
    </AppLayout>
</template>
