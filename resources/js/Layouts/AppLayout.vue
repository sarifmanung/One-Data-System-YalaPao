<script setup lang="ts">
import { Link, useForm, usePage } from '@inertiajs/vue3';
import { computed, h, ref } from 'vue';

const props = defineProps<{ title: string }>();

const page = usePage<any>();
const logoutForm = useForm({});
const sidebarOpen = ref(true);
const mobileSidebarOpen = ref(false);
const userMenuOpen = ref(false);

const iconPaths: Record<string, string[]> = {
    grid: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
    people: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
    calendar: ['M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
    leave: ['M8 2v4', 'M16 2v4', 'M4 5h16a1 1 0 0 1 1 1v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1z', 'M8 14h.01', 'M12 14h.01', 'M16 14h.01'],
    document: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h6'],
    link: ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
    box: ['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', 'M3.27 6.96 12 12.01l8.73-5.05', 'M12 22.08V12'],
    truck: ['M3 6h11v10H3z', 'M14 9h4l3 3v4h-7z', 'M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
    chevron: ['M9 18l6-6-6-6'],
    menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
    sun: ['M12 3v2', 'M12 19v2', 'M3 12h2', 'M19 12h2', 'M5.64 5.64l1.42 1.42', 'M16.94 16.94l1.42 1.42', 'M5.64 18.36l1.42-1.42', 'M16.94 7.06l1.42-1.42', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
};

const MenuIcon = (iconProps: { name: string; size?: number }) => h(
    'svg',
    {
        xmlns: 'http://www.w3.org/2000/svg',
        width: iconProps.size ?? 18,
        height: iconProps.size ?? 18,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 1.8,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
    },
    (iconPaths[iconProps.name] ?? []).map((path) => h('path', { d: path })),
);

const workspace = computed(() => page.props.workspace ?? {});
const user = computed(() => page.props.auth?.user ?? {});

const navGroups = [
    {
        label: 'การปฏิบัติงาน',
        items: [
            { label: 'แดชบอร์ด', href: '/dashboard', icon: 'grid' },
            { label: 'พนักงาน', href: '/people', icon: 'people' },
            { label: 'ลา/ไปราชการ', href: '/leaves', icon: 'leave' },
            { label: 'เอกสาร', href: null, icon: 'document', soon: true },
        ],
    },
    {
        label: 'การเชื่อมต่อข้อมูล',
        items: [
            { label: 'ระบบ ฉ.10/11', href: '/integrations', icon: 'link', soon: false },
            { label: 'ประวัติการส่งข้อมูล', href: '/integrations', icon: 'document', soon: false },
        ],
    },
    {
        label: 'โมดูลในอนาคต',
        items: [
            { label: 'ตารางเวร', href: null, icon: 'calendar', soon: true },
            { label: 'วันหยุด', href: null, icon: 'calendar', soon: true },
            { label: 'คลังวัสดุ', href: null, icon: 'box', soon: true },
            { label: 'ยานพาหนะ', href: null, icon: 'truck', soon: true },
            { label: 'การเงิน', href: null, icon: 'document', soon: true },
        ],
    },
];

function isActive(href: string | null): boolean {
    if (!href) return false;
    if (href === '/dashboard') return page.url === '/dashboard' || page.url === '/';
    return page.url.startsWith(href);
}

function logout() {
    logoutForm.post('/logout');
}

function closeMobileSidebar() {
    mobileSidebarOpen.value = false;
}
</script>

<template>
    <div class="min-h-screen bg-[#f8fafc] text-slate-900">
        <div v-if="mobileSidebarOpen" class="fixed inset-0 z-30 bg-slate-900/30 md:hidden" @click="closeMobileSidebar" />

        <aside
            class="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-[#f1f7fb] transition-all duration-200 md:z-20"
            :class="[
                sidebarOpen ? 'w-64' : 'w-[76px]',
                mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            ]"
        >
            <div class="flex h-[68px] items-center justify-between border-b border-slate-200/80 px-5">
                <Link href="/dashboard" class="flex items-center gap-3" @click="closeMobileSidebar">
                    <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-[11px] font-black tracking-tight text-white">OD</span>
                    <span v-if="sidebarOpen" class="text-lg font-bold tracking-tight text-slate-900">One Data</span>
                </Link>
                <button
                    type="button"
                    class="hidden rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 md:inline-flex"
                    :aria-label="sidebarOpen ? 'ย่อเมนู' : 'ขยายเมนู'"
                    @click="sidebarOpen = !sidebarOpen"
                >
                    <MenuIcon name="menu" :size="18" />
                </button>
            </div>

            <div v-if="sidebarOpen" class="mx-4 mt-4 rounded-2xl border border-white/80 bg-[#e1ecfb] px-4 py-4 shadow-sm">
                <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-700 shadow-sm">OD</div>
                <div class="line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{{ workspace.tenant?.name || 'ทุกหน่วยงานในสังกัด' }}</div>
                <div class="mt-1 text-xs text-slate-500">
                    {{ workspace.tenant_count > 1 ? `${workspace.tenant_count} หน่วยงานในขอบเขต` : 'หน่วยงานของฉัน' }}
                </div>
            </div>

            <div v-else class="mx-auto mt-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e1ecfb] text-sm font-bold text-blue-700">OD</div>

            <nav class="mt-5 flex-1 overflow-y-auto px-3 pb-5">
                <template v-for="group in navGroups" :key="group.label">
                <div v-if="group.label !== 'การเชื่อมต่อข้อมูล' || ['ADMIN', 'PUBLIC_HEALTH_OFFICER'].includes(user.role)" class="mb-5">
                    <div v-if="sidebarOpen" class="mb-2 flex items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <span>{{ group.label }}</span>
                        <span v-if="group.label === 'โมดูลในอนาคต'" class="rounded-full bg-white/80 px-2 py-0.5 text-[10px] normal-case tracking-normal">เร็ว ๆ นี้</span>
                    </div>
                    <div class="space-y-1">
                        <template v-for="item in group.items" :key="`${group.label}-${item.label}`">
                            <Link
                                v-if="item.href && (!item.label.includes('ประวัติ') && !item.label.includes('ระบบ ฉ.') || ['ADMIN', 'PUBLIC_HEALTH_OFFICER'].includes(user.role))"
                                :href="item.href"
                                class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
                                :class="isActive(item.href) ? 'bg-[#dbe8fb] text-blue-800 shadow-sm' : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'"
                                :title="sidebarOpen ? undefined : item.label"
                                @click="closeMobileSidebar"
                            >
                                <MenuIcon :name="item.icon" :size="18" />
                                <span v-if="sidebarOpen" class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                            </Link>
                            <div
                                v-else-if="!item.href"
                                class="group flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400"
                                :title="sidebarOpen ? `${item.label} — อยู่ระหว่างพัฒนา` : item.label"
                            >
                                <MenuIcon :name="item.icon" :size="18" />
                                <span v-if="sidebarOpen" class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                                <span v-if="sidebarOpen" class="text-[10px] text-slate-400">เร็ว ๆ นี้</span>
                            </div>
                        </template>
                    </div>
                </div>
                </template>
            </nav>

            <div class="border-t border-slate-200/80 p-3">
                <a href="mailto:support@onedata.local" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition hover:bg-white/80 hover:text-slate-900" :title="sidebarOpen ? undefined : 'แจ้งปัญหาการใช้งาน'">
                    <span class="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px] font-bold">?</span>
                    <span v-if="sidebarOpen">แจ้งปัญหาการใช้งาน</span>
                </a>
                <div v-if="sidebarOpen" class="px-3 pb-1 pt-3 text-[10px] text-slate-400">One Data System · Development</div>
            </div>
        </aside>

        <div class="min-h-screen transition-[padding] duration-200" :class="sidebarOpen ? 'md:pl-64' : 'md:pl-[76px]'">
            <header class="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur">
                <div class="flex h-[68px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    <div class="flex min-w-0 items-center gap-3">
                        <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" aria-label="เปิดเมนู" @click="mobileSidebarOpen = true">
                            <MenuIcon name="menu" :size="20" />
                        </button>
                        <div class="truncate text-sm font-semibold text-slate-700">{{ props.title === 'แดชบอร์ด' ? 'แดชบอร์ดหน่วยงาน' : props.title }}</div>
                    </div>

                    <div class="flex items-center gap-2 sm:gap-3">
                        <div class="hidden rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 lg:block">
                            สภาพแวดล้อมทดสอบ · ข้อมูลยังไม่ใช้งานจริง
                        </div>
                        <div class="hidden max-w-[280px] items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 sm:flex">
                            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"><MenuIcon name="link" :size="13" /></span>
                            <span class="truncate">{{ workspace.tenant?.name || 'ทุกหน่วยงานในสังกัด' }}</span>
                        </div>
                        <div class="relative">
                            <button type="button" class="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 text-left transition hover:border-slate-300 hover:bg-slate-50" :aria-expanded="userMenuOpen" @click="userMenuOpen = !userMenuOpen">
                                <span class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{{ (user.name || 'U').slice(0, 1) }}</span>
                                <span class="hidden max-w-[150px] sm:block">
                                    <span class="block truncate text-xs font-semibold text-slate-800">{{ user.name || user.username }}</span>
                                    <span class="block truncate text-[10px] text-slate-500">{{ user.role || 'ผู้ใช้งาน' }}</span>
                                </span>
                                <span class="hidden text-slate-400 sm:block"><MenuIcon name="chevron" :size="14" /></span>
                            </button>
                            <div v-if="userMenuOpen" class="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                <div class="border-b border-slate-100 px-3 py-2">
                                    <div class="text-sm font-semibold text-slate-800">{{ user.name || user.username }}</div>
                                    <div class="mt-0.5 text-xs text-slate-500">{{ user.role || 'ผู้ใช้งาน' }}</div>
                                </div>
                                <button type="button" class="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50" @click="logout">ออกจากระบบ</button>
                            </div>
                        </div>
                        <button type="button" class="hidden rounded-full p-2 text-slate-500 transition hover:bg-slate-100 sm:inline-flex" title="โหมดสี" aria-label="โหมดสี">
                            <MenuIcon name="sun" :size="18" />
                        </button>
                    </div>
                </div>
            </header>

            <main class="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <div v-if="page.props.flash?.success" class="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {{ page.props.flash.success }}
                </div>
                <div v-if="page.props.flash?.error" class="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {{ page.props.flash.error }}
                </div>
                <div v-if="props.title !== 'แดชบอร์ด'" class="mb-6">
                    <div class="text-xs font-semibold text-blue-700">One Data · หน่วยงาน</div>
                    <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900">{{ props.title }}</h1>
                </div>
                <slot />
            </main>
        </div>
    </div>
</template>
