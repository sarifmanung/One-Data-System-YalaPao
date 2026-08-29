<script setup lang="ts">
import { Link, useForm, usePage } from '@inertiajs/vue3';

defineProps<{ title: string }>();

const page = usePage<any>();
const logoutForm = useForm({});

function logout() {
    logoutForm.post('/logout');
}
</script>

<template>
    <div class="min-h-screen bg-slate-50">
        <header class="border-b border-slate-200 bg-white">
            <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <div class="flex items-center gap-8">
                    <Link href="/dashboard" class="text-lg font-bold tracking-tight text-teal-800">One Data</Link>
                    <nav class="hidden gap-5 text-sm text-slate-600 md:flex">
                        <Link href="/dashboard" class="hover:text-teal-700">ภาพรวม</Link>
                        <Link href="/leaves" class="hover:text-teal-700">ระบบการลา</Link>
                        <Link href="/people" class="hover:text-teal-700">บุคลากร</Link>
                        <Link v-if="['ADMIN', 'PUBLIC_HEALTH_OFFICER'].includes(page.props.auth?.user?.role)" href="/integrations" class="hover:text-teal-700">เชื่อมต่อระบบ ฉ.</Link>
                    </nav>
                </div>
                <div class="flex items-center gap-3 text-sm">
                    <div class="hidden text-right sm:block">
                        <div class="font-medium text-slate-800">{{ page.props.auth?.user?.name }}</div>
                        <div class="text-xs text-slate-500">{{ page.props.auth?.user?.role }}</div>
                    </div>
                    <button type="button" class="rounded-lg border border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-100" @click="logout">
                        ออกจากระบบ
                    </button>
                </div>
            </div>
        </header>

        <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div v-if="page.props.flash?.success" class="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {{ page.props.flash.success }}
            </div>
            <div v-if="page.props.flash?.error" class="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {{ page.props.flash.error }}
            </div>
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-slate-900">{{ title }}</h1>
            </div>
            <slot />
        </main>
    </div>
</template>
