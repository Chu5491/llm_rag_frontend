<script setup lang="ts">
import {ref, onMounted, onUnmounted} from "vue";
import {useRoute, RouterLink} from "vue-router";
import {checkApiStatus as apiCheck} from "../services/api.js";

const route = useRoute();

type NavItem = {path: string; name: string; icon?: string};

const navItems: NavItem[] = [
    {path: "/", name: "Dashboard", icon: ""},
    {path: "/testcase", name: "TC 자동생성", icon: ""},
    {path: "/project", name: "프로젝트 관리", icon: ""},
];

const isActive = (path: string) => {
    if (path === "/") {
        return route.path === "/";
    }

    return route.path === path || route.path.startsWith(`${path}/`);
};

// API 상태
const apiStatus = ref<"online" | "offline" | "checking">("checking");
let statusInterval: number | undefined;

const checkApiStatus = async () => {
    apiStatus.value = "checking";
    const ok = await apiCheck();
    apiStatus.value = ok ? "online" : "offline";
};

onMounted(() => {
    checkApiStatus();
    // TODO: 30초마다 상태 체크
    statusInterval = window.setInterval(checkApiStatus, 30_000);
});

onUnmounted(() => {
    if (statusInterval !== undefined) {
        clearInterval(statusInterval);
    }
});
</script>

<template>
    <aside class="sidebar-custom">
        <!-- 상단 로고 / 타이틀 -->
        <header class="sidebar-header">
            <div>
                <RouterLink
                    to="/"
                    class="flex items-center gap-3 font-semibold"
                >
                    <span class="mr-1"></span>
                    <span>T-Gen</span>
                </RouterLink>
            </div>
        </header>

        <!-- 네비게이션 -->
        <nav class="sidebar-nav">
            <RouterLink
                v-for="item in navItems"
                :key="item.path"
                :to="item.path"
                :class="['nav-link', isActive(item.path) && 'nav-link-active']"
            >
                <span class="nav-link-icon">{{ item.icon }}</span>
                <span class="nav-link-label">{{ item.name }}</span>
            </RouterLink>
        </nav>

        <!-- 하단 API 상태 -->
        <footer class="sidebar-footer">
            <button
                type="button"
                class="status-indicator"
                @click="checkApiStatus"
            >
                <span
                    v-if="apiStatus === 'checking'"
                    class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent"
                />
                <span
                    v-else
                    :class="[
                        'inline-block h-3 w-3 rounded-full',
                        apiStatus === 'online' ? 'bg-green-400' : 'bg-red-400',
                    ]"
                />
                <span class="ml-2 text-xs text-gray-500">
                    {{
                        apiStatus === "online"
                            ? "API Connected"
                            : apiStatus === "offline"
                            ? "API Disconnected"
                            : "Checking..."
                    }}
                </span>
            </button>
        </footer>
    </aside>
</template>
