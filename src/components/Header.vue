<script setup lang="ts">
import {computed} from "vue";
import {useRoute} from "vue-router";

const route = useRoute();

// 현재 라우트 이름을 기반으로 타이틀 표시
const pageTitle = computed(() => {
    const name = route.name as string;
    if (!name) return "Dashboard";
    // "project-detail" -> "Project Detail" 변환 같은 로직이 필요할 수 있음
    // 여기서는 단순히 name을 반환하거나 한글 매핑을 추가
    const titleMap: Record<string, string> = {
        Dashboard: "대시보드",
        Project: "프로젝트 관리",
        ProjectDetail: "프로젝트 상세",
        // 필요한 대로 추가
    };
    return titleMap[name] || name;
});

// Mock Icons
const NotificationIcon =
    '<path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />';
</script>

<template>
    <header
        class="sticky top-0 z-20 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 h-16 flex items-center justify-between"
    >
        <!-- Left: Page Title / Breadcrumbs -->
        <div class="flex items-center">
            <h2 class="text-xl font-semibold text-gray-800 tracking-tight">
                {{ pageTitle }}
            </h2>
        </div>

        <!-- Right: Actions -->
        <div class="flex items-center gap-4">
            <!-- Notification Button -->
            <button
                class="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors relative"
            >
                <span class="sr-only">View notifications</span>
                <svg
                    class="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    v-html="NotificationIcon"
                ></svg>
                <span
                    class="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
                ></span>
            </button>

            <!-- Profile Dropdown (Mock) -->
            <div class="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div class="text-right hidden sm:block">
                    <p class="text-sm font-medium text-gray-700">홍길동</p>
                    <p class="text-xs text-gray-500">Administrator</p>
                </div>
                <button
                    class="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 hover:ring-2 hover:ring-indigo-500 transition-all"
                >
                    홍
                </button>
            </div>
        </div>
    </header>
</template>
