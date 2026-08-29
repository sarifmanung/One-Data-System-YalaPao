<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import AppLayout from '../Layouts/AppLayout.vue';

interface Stats {
    people: number;
    draftLeaves: number;
    confirmedLeaves: number;
    todayLeaves: number;
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

defineProps<{ stats: Stats; recentLeaves: RecentLeave[] }>();

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
</script>

<template>
    <Head title="ภาพรวม" />
    <AppLayout title="ภาพรวมระบบ">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="stat-card">
                <div class="stat-label">บุคลากรในขอบเขต</div>
                <div class="stat-value">{{ stats.people }}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">ใบลารอจัดการ</div>
                <div class="stat-value">{{ stats.draftLeaves }}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">ใบลาที่มีผล</div>
                <div class="stat-value">{{ stats.confirmedLeaves }}</div>
            </div>
            <div class="stat-card border-teal-200 bg-teal-50">
                <div class="stat-label text-teal-800">ลาในวันนี้</div>
                <div class="stat-value text-teal-900">{{ stats.todayLeaves }}</div>
            </div>
        </div>

        <div class="mt-8 flex flex-wrap gap-3">
            <Link href="/leaves" class="btn-primary">บันทึกใบลา</Link>
            <Link href="/people" class="btn-secondary">ดูรายชื่อบุคลากร</Link>
        </div>

        <section class="panel mt-8">
            <div class="mb-4 flex items-center justify-between gap-4">
                <div>
                    <h2 class="section-title">รายการใบลาล่าสุด</h2>
                    <p class="section-help">ข้อมูลสถานะ CONFIRMED เท่านั้นที่จะถูกนำไปจัดทำ snapshot ให้ระบบ ฉ.</p>
                </div>
                <Link href="/leaves" class="text-sm font-medium text-teal-700 hover:text-teal-900">ดูทั้งหมด →</Link>
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
    </AppLayout>
</template>
