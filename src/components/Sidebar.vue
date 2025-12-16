<script setup lang="ts">
import {ref, onMounted, onUnmounted} from "vue";
import {useRoute, RouterLink} from "vue-router";
import {checkApiStatus as apiCheck} from "../services/api.js";

const route = useRoute();

// 아이콘 매핑을 위해 수정 (실제 아이콘 컴포넌트 사용 권장하지만, 여기서는 문자열 대신 컴포넌트나 SVG 사용 예시로 대체하지 않고 일단 텍스트 유지하거나 Heroicons 설치 가정. 설치가 안되어있다면 텍스트/이모지로 대체해야 함.)
// User 환경에 Heroicons가 없을 수 있으므로 안전하게 텍스트/유니코드로 하거나 SVG 직접 삽입.
// 여기서는 안전하게 SVG 문자열을 직접 넣거나 간단한 아이콘을 사용.
// 일단 네비게이션 아이템 정의.

const navItems = [
    {path: "/", name: "Dashboard", icon: "Home"},
    {path: "/project", name: "프로젝트 관리", icon: "Folder"},
    {path: "/generate", name: "TC 자동생성", icon: "Zap"},
    {path: "/testcase", name: "TC 관리", icon: "List"},
    {path: "/test", name: "생성 테스트", icon: "Test"},
];

const isActive = (path: string) => {
    if (path === "/") {
        return route.path === "/";
    }
    return route.path === path || route.path.startsWith(`${path}/`);
};

// API 상태 로직 유지
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

// 아이콘 렌더링 헬퍼 (Heroicons가 없다는 가정하에 SVG 직접 사용)
// 간단한 SVG 아이콘들
const icons: Record<string, string> = {
    Home: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />',
    Folder: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />',
    Zap: '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />',
    List: '<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />',
    Test: '<path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />',
};
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
            <RouterLink
                v-for="item in navItems"
                :key="item.path"
                :to="item.path"
                class="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
                :class="[
                    isActive(item.path)
                        ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                ]"
            >
                <!-- Icon SVG -->
                <svg
                    class="mr-3 h-5 w-5 shrink-0 transition-colors"
                    :class="
                        isActive(item.path)
                            ? 'text-indigo-600'
                            : 'text-gray-400 group-hover:text-gray-500'
                    "
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    v-html="icons[item.icon as string] || ''"
                ></svg>
                {{ item.name }}
            </RouterLink>
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
