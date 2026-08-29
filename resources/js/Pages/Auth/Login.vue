<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';

defineProps<{ localLoginEnabled: boolean }>();

const form = useForm({
    username: '',
    password: '',
    remember: false,
});

function submit() {
    form.post('/login');
}
</script>

<template>
    <Head title="เข้าสู่ระบบ" />
    <main class="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div class="mb-8">
                <div class="mb-3 inline-flex rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">One Data System</div>
                <h1 class="text-2xl font-bold text-slate-900">เข้าสู่ระบบ</h1>
                <p class="mt-2 text-sm text-slate-500">ระบบศูนย์กลางข้อมูลบุคลากรและการลา</p>
            </div>

            <div v-if="!localLoginEnabled" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                ระบบเปิดให้เข้าสู่ระบบผ่าน Portal SSO เท่านั้น
            </div>

            <form v-else class="space-y-5" @submit.prevent="submit">
                <div>
                    <label for="username" class="mb-1 block text-sm font-medium text-slate-700">ชื่อผู้ใช้</label>
                    <input id="username" v-model="form.username" type="text" autocomplete="username" class="field" required />
                    <p v-if="form.errors.username" class="mt-1 text-sm text-red-600">{{ form.errors.username }}</p>
                </div>
                <div>
                    <label for="password" class="mb-1 block text-sm font-medium text-slate-700">รหัสผ่าน</label>
                    <input id="password" v-model="form.password" type="password" autocomplete="current-password" class="field" required />
                    <p v-if="form.errors.password" class="mt-1 text-sm text-red-600">{{ form.errors.password }}</p>
                </div>
                <label class="flex items-center gap-2 text-sm text-slate-600">
                    <input v-model="form.remember" type="checkbox" class="rounded border-slate-300 text-teal-700" />
                    จดจำการเข้าสู่ระบบ
                </label>
                <button type="submit" class="btn-primary w-full" :disabled="form.processing">
                    {{ form.processing ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบ' }}
                </button>
            </form>
        </section>
    </main>
</template>
