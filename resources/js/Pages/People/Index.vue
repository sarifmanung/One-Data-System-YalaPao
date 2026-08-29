<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import AppLayout from '../../Layouts/AppLayout.vue';

interface Membership {
    tenant_id: string;
    tenant_name: string | null;
    starts_on: string;
    ends_on: string | null;
    is_primary: boolean;
}

interface Person {
    id: string;
    name: string;
    position_name: string | null;
    position_group: string | null;
    status: string;
    source_id: string | null;
    memberships: Membership[];
}

interface Paginator {
    data: Person[];
    current_page: number;
    last_page: number;
    total: number;
}

defineProps<{ people: Paginator; canSync: boolean }>();
</script>

<template>
    <Head title="บุคลากร" />
    <AppLayout title="บุคลากร">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-slate-600">ข้อมูลหลักนำเข้าจากระบบ ฉ. และใช้เป็นฐานร่วมของทุกโมดูล</p>
            <Link v-if="canSync" href="/integrations" class="btn-secondary">ไปหน้า sync master data</Link>
        </div>
        <section class="panel overflow-hidden p-0">
            <div class="overflow-x-auto">
                <table class="data-table">
                    <thead><tr><th>ชื่อ–นามสกุล</th><th>ตำแหน่ง</th><th>หน่วยงาน</th><th>เริ่มสังกัด</th><th>สถานะ</th><th>Source ID</th></tr></thead>
                    <tbody>
                        <tr v-for="person in people.data" :key="person.id">
                            <td class="font-medium">{{ person.name }}</td>
                            <td>{{ person.position_name || person.position_group || '—' }}</td>
                            <td><div v-for="membership in person.memberships" :key="`${person.id}-${membership.tenant_id}`">{{ membership.tenant_name }}</div></td>
                            <td><div v-for="membership in person.memberships" :key="`${person.id}-${membership.tenant_id}-date`">{{ membership.starts_on }}</div></td>
                            <td><span class="status-pill" :class="person.status === 'ACTIVE' ? 'status-confirmed' : 'status-void'">{{ person.status === 'ACTIVE' ? 'ใช้งาน' : 'ไม่ใช้งาน' }}</span></td>
                            <td class="font-mono text-xs text-slate-500">{{ person.source_id || '—' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div v-if="!people.data.length" class="empty-state">ยังไม่มีข้อมูลบุคลากร กรุณา sync จากระบบ ฉ.</div>
            <div class="border-t border-slate-200 px-5 py-3 text-sm text-slate-500">ทั้งหมด {{ people.total }} คน · หน้า {{ people.current_page }} / {{ people.last_page }}</div>
        </section>
    </AppLayout>
</template>
