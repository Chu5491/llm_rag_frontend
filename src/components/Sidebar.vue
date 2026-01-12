<script setup lang="ts">
import {ref, onMounted, onUnmounted, watch} from "vue";
import {useRoute, RouterLink} from "vue-router";
import {checkApiStatus as apiCheck} from "../services/api.js";

const route = useRoute();

// 네비게이션 아이템 정의
const navItems = [
    {path: "/", name: "Dashboard", icon: "dashboard"},
    {
        name: "테스트케이스 관리",
        icon: "auto_awesome",
        children: [
            {path: "/generate/new", name: "TC 자동 생성"},
            {path: "/generate", name: "TC 생성 이력"},
            {path: "/testcase", name: "TC 목록"},
            {path: "/testcase/duplicate", name: "중복 TC 확인 (TBD)"},
        ],
    },
    {
        name: "프로젝트 관리",
        icon: "folder",
        children: [{path: "/project", name: "프로젝트 목록"}],
    },
    {
        name: "시스템 관리",
        icon: "settings",
        children: [{path: "/setting", name: "환경설정"}],
    },
];

const expandedMenus = ref<string[]>(["테스트케이스 관리"]); // Default expand

const toggleMenu = (name: string) => {
    if (expandedMenus.value.includes(name)) {
        expandedMenus.value = expandedMenus.value.filter((n) => n !== name);
    } else {
        expandedMenus.value.push(name);
    }
};

const isActive = (path?: string) => {
    if (!path) return false;
    // 1. Exact match (가장 우선)
    if (route.path === path) return true;

    // 2. Dashboard 예외 처리
    if (path === "/") return false;

    // 3. Prefix match (하위/상세 페이지)
    if (route.path.startsWith(`${path}/`)) {
        if (path === "/generate" && route.path.startsWith("/generate/new")) {
            return false;
        }
        if (path === "/project" && route.path.startsWith("/project/new")) {
            return false;
        }

        return true;
    }
    return false;
};

// 현재 라우트에 맞춰 메뉴 자동 펼치기
const autoExpandMenu = () => {
    for (const item of navItems) {
        if (item.children) {
            const hasActiveChild = item.children.some((child) =>
                isActive(child.path)
            );
            if (hasActiveChild && !expandedMenus.value.includes(item.name)) {
                expandedMenus.value.push(item.name);
            }
        }
    }
};

watch(
    () => route.path,
    () => {
        autoExpandMenu();
    },
    {immediate: true}
);

// ... API Status logic unchanged ...
const apiStatus = ref<"online" | "offline" | "checking">("checking");
let statusInterval: number | undefined;

const checkApiStatus = async () => {
    apiStatus.value = "checking";
    const ok = await apiCheck();
    apiStatus.value = ok ? "online" : "offline";
};

onMounted(() => {
    checkApiStatus();
});

onUnmounted(() => {
    if (statusInterval !== undefined) {
        clearInterval(statusInterval);
    }
});
</script>

<template>
    <aside
        class="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30 flex flex-col transition-transform duration-300"
    >
        <!-- Logo Area -->
        <div class="h-16 flex items-center px-6 border-b border-gray-100">
            <RouterLink to="/" class="flex items-center gap-2">
                <div
                    class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm"
                >
                    T
                </div>
                <span class="text-xl font-bold text-gray-900 tracking-tight"
                    >T-Gen</span
                >
            </RouterLink>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto py-6 px-3 space-y-1">
            <template v-for="item in navItems" :key="item.name">
                <!-- 1. Single Item -->
                <RouterLink
                    v-if="!item.children"
                    :to="item.path!"
                    class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
                    :class="[
                        isActive(item.path)
                            ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-200'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    ]"
                >
                    <span
                        class="material-symbols-outlined mr-3 text-xl transition-colors"
                        :class="
                            isActive(item.path)
                                ? 'text-indigo-600'
                                : 'text-gray-400 group-hover:text-gray-500'
                        "
                        >{{ item.icon }}</span
                    >
                    {{ item.name }}
                </RouterLink>

                <!-- 2. Parent Item with Children -->
                <div v-else class="space-y-1">
                    <button
                        @click="toggleMenu(item.name)"
                        class="w-full group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
                    >
                        <div class="flex items-center">
                            <span
                                class="material-symbols-outlined mr-3 text-xl text-gray-400 group-hover:text-gray-500"
                                >{{ item.icon }}</span
                            >
                            {{ item.name }}
                        </div>
                        <span
                            class="material-symbols-outlined text-gray-400 text-lg transition-transform duration-200"
                            :class="{
                                'rotate-180': expandedMenus.includes(item.name),
                            }"
                            >expand_more</span
                        >
                    </button>

                    <!-- Children List -->
                    <div
                        v-show="expandedMenus.includes(item.name)"
                        class="pl-11 space-y-1"
                    >
                        <RouterLink
                            v-for="child in item.children"
                            :key="child.path"
                            :to="child.path"
                            class="block px-3 py-2 text-sm font-medium rounded-md transition-colors"
                            :class="[
                                isActive(child.path)
                                    ? 'text-indigo-600 bg-indigo-50'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
                            ]"
                        >
                            {{ child.name }}
                        </RouterLink>
                    </div>
                </div>
            </template>
        </nav>

        <!-- Sidebar Footer (API Status) -->
        <div class="p-4 border-t border-gray-200 bg-gray-50/50">
            <button
                type="button"
                class="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-white hover:shadow-sm transition-all duration-200 border border-transparent hover:border-gray-200 group"
                @click="checkApiStatus"
            >
                <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-gray-700"
                        >API Status</span
                    >
                </div>

                <div class="flex items-center gap-2">
                    <span
                        v-if="apiStatus === 'checking'"
                        class="h-2.5 w-2.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
                    />
                    <span
                        v-else
                        class="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm"
                        :class="[
                            apiStatus === 'online'
                                ? 'bg-green-500'
                                : 'bg-red-500',
                        ]"
                    />
                    <span
                        class="text-[10px] items-center text-gray-400 font-medium uppercase tracking-wider"
                    >
                        {{
                            apiStatus === "online"
                                ? "ON"
                                : apiStatus === "offline"
                                ? "OFF"
                                : ""
                        }}
                    </span>
                </div>
            </button>
        </div>
    </aside>
</template>
