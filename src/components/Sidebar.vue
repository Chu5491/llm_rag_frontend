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
    {path: "/", name: "Dashboard", icon: "dashboard"},
    {path: "/project", name: "프로젝트 관리", icon: "folder"},
    {path: "/generate", name: "TC 자동생성", icon: "auto_awesome"},
    {path: "/testcase", name: "TC 관리", icon: "list_alt"},
    {path: "/test", name: "생성 테스트", icon: "science"},
    {path: "/setting", name: "환경설정", icon: "settings"},
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

// Material Icons 사용
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
                <!-- Material Icon -->
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
