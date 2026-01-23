<script setup lang="ts">
import {computed} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useAuthStore} from "../stores/auth.js";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// 로그아웃 핸들러
const handleLogout = () => {
    authStore.logout();
    router.push("/login");
};

// 현재 라우트 기반 타이틀 반환
const pageTitle = computed(() => {
    const name = route.name as string;
    if (!name) return "Dashboard";
    // 라우트 이름 -> 한글 타이틀 매핑
    const titleMap: Record<string, string> = {
        Dashboard: "대시보드",
        Project: "프로젝트 관리",
        ProjectDetail: "프로젝트 상세 정보",
        ProjectCreate: "프로젝트 등록",
        TestCase: "테스트케이스 관리",
        TestCaseDetail: "테스트케이스 상세 정보",
        GenerateCreate: "테스트케이스 자동생성 실행",
        GenerateHistory: "자동생성 히스토리",
        test: "TC 생성 테스트",
        ClusteringView: "중복 TC 확인",
    };
    return titleMap[name] || name;
});

// Heroicons 아이콘 사용
</script>
<template>
    <header
        class="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 h-16 flex items-center justify-between"
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
                <span class="material-symbols-outlined text-xl"
                    >notifications_none</span
                >
                <span
                    class="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
                ></span>
            </button>

            <!-- Profile Dropdown -->
            <div
                v-if="authStore.isAuthenticated && authStore.user"
                class="flex items-center gap-3 pl-4 border-l border-gray-200"
            >
                <div class="text-right hidden sm:block">
                    <p class="text-sm font-medium text-gray-700">
                        {{ authStore.user.name || "사용자" }}
                    </p>
                    <p class="text-xs text-gray-500">
                        {{ authStore.user.role }}
                    </p>
                </div>
                <button
                    class="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 hover:ring-2 hover:ring-indigo-500 transition-all"
                >
                    {{ (authStore.user.name || "U").charAt(0) }}
                </button>
                <button
                    @click="handleLogout"
                    class="ml-2 text-xs text-gray-500 hover:text-red-500"
                >
                    로그아웃
                </button>
            </div>
            <div v-else class="pl-4 border-l border-gray-200">
                <button
                    @click="router.push('/login')"
                    class="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                    로그인
                </button>
            </div>
        </div>
    </header>
</template>
