<script setup lang="ts">
import {ref, onMounted} from "vue";
import {useRoute, useRouter} from "vue-router";
import {getFileIcon, getFileIconColor} from "../utils/fileIcons.js";
import {fetchProjectDetail} from "../services/projectApi.js";
import type {ProjectResponse} from "../types/project.js";

const route = useRoute();
const router = useRouter();

const project = ref<ProjectResponse | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

// 프로젝트 상세 로드
const loadProjectDetail = async () => {
    const projectId = Number(route.params.id);
    if (!projectId) {
        error.value = "유효하지 않은 프로젝트 ID입니다.";
        return;
    }

    isLoading.value = true;
    error.value = null;

    try {
        project.value = await fetchProjectDetail(projectId);
    } catch (e: any) {
        console.error("프로젝트 상세 로드 실패:", e);
        error.value = "프로젝트 정보를 불러오는 데 실패했습니다.";
    } finally {
        isLoading.value = false;
    }
};

// 외부 시스템 아이콘 매핑
const getSystemIcon = (systemType: string) => {
    const icons: Record<string, string> = {
        jira: "J",
        figma: "F",
        github: "G",
        slack: "S",
    };
    return icons[systemType] || "•";
};

// 날짜 포맷팅
const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    };
    return new Date(dateString).toLocaleDateString("ko-KR", options);
};

// 5가지 고정 카테고리 (HTML 템플릿 기준)
const ARTIFACT_CATEGORIES = [
    "요구사항명세서",
    "화면설계서",
    "API 명세서",
    "메뉴얼",
    "기타 자료",
] as const;

const categoryIcons: Record<string, string> = {
    요구사항명세서: "assignment",
    화면설계서: "web_asset",
    "API 명세서": "api",
    메뉴얼: "menu_book",
    "기타 자료": "folder_open",
};

// ... existing code ...

// 뒤로 가기
const goBack = () => {
    router.go(-1);
};

onMounted(() => {
    loadProjectDetail();
});
</script>

<template>
    <main class="p-6 space-y-6">
        <!-- Header Section -->
        <header class="flex justify-between items-start">
            <div>
                <p class="mt-1 text-sm text-gray-500">
                    등록된 프로젝트의 상세 정보를 확인할 수 있습니다.
                </p>
            </div>
            <button
                @click="goBack"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
                뒤로 가기
            </button>
        </header>

        <!-- Loading State -->
        <div
            v-if="isLoading"
            class="flex flex-col items-center justify-center py-20 bg-white rounded-lg shadow"
        >
            <div
                class="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
            ></div>
            <p class="mt-4 text-sm text-gray-500">
                프로젝트 정보를 불러오는 중입니다...
            </p>
        </div>

        <!-- Error State -->
        <div
            v-else-if="error"
            class="flex flex-col items-center justify-center py-20 bg-white rounded-lg shadow"
        >
            <span class="material-icons-outlined text-4xl text-red-400"
                >error_outline</span
            >
            <p class="mt-2 text-sm text-gray-500">{{ error }}</p>
            <button
                @click="loadProjectDetail"
                class="mt-4 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
                다시 시도
            </button>
        </div>

        <!-- Main Content -->
        <section
            v-else-if="project"
            class="rounded-lg bg-white p-6 shadow space-y-8"
        >
            <!-- 1. Basic Info Section -->
            <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">
                    1. 프로젝트 기본 정보
                </h3>
                <div class="bg-gray-50 p-5 rounded-lg border border-gray-100">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-4">
                            <div>
                                <p
                                    class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                                >
                                    프로젝트 이름
                                </p>
                                <p class="text-base font-medium text-gray-900">
                                    {{ project.name }}
                                </p>
                            </div>
                            <div>
                                <p
                                    class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                                >
                                    서비스 유형
                                </p>
                                <p class="text-base text-gray-900">
                                    {{ project.service_type || "-" }}
                                </p>
                            </div>
                            <div>
                                <p
                                    class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                                >
                                    생성 일자
                                </p>
                                <p class="text-base text-gray-900">
                                    {{ formatDate(project.created_at) }}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p
                                class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                            >
                                프로젝트 설명
                            </p>
                            <p
                                class="text-base text-gray-700 whitespace-pre-line leading-relaxed"
                            >
                                {{ project.description }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. Artifacts Section -->
            <div>
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-medium text-gray-900">
                        2. 등록된 산출물
                    </h3>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div
                        v-for="category in ARTIFACT_CATEGORIES"
                        :key="category"
                        class="flex flex-col rounded-lg border border-gray-200 bg-white"
                        :class="{'lg:col-span-2': category === '기타 자료'}"
                    >
                        <!-- Header -->
                        <div
                            class="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg"
                        >
                            <div class="flex items-center gap-2">
                                <span
                                    class="material-icons-outlined text-gray-400 text-[18px]"
                                    >{{ categoryIcons[category] }}</span
                                >
                                <span class="text-sm font-bold text-gray-700">{{
                                    category
                                }}</span>
                            </div>
                        </div>

                        <!-- Content -->
                        <div class="p-3 space-y-2 flex-1">
                            <div
                                v-if="
                                    project.artifacts.filter(
                                        (a) => a.artifact_type === category
                                    ).length > 0
                                "
                                class="space-y-2"
                            >
                                <div
                                    v-for="artifact in project.artifacts.filter(
                                        (a) => a.artifact_type === category
                                    )"
                                    :key="artifact.id"
                                    class="flex items-center gap-2 bg-white p-2 rounded border border-gray-200 shadow-sm"
                                >
                                    <div
                                        class="flex-1 min-w-0 flex items-center gap-2"
                                    >
                                        <span
                                            class="material-icons-outlined text-sm"
                                            :class="
                                                getFileIconColor(artifact.name)
                                            "
                                        >
                                            {{ getFileIcon(artifact.name) }}
                                        </span>
                                        <div class="flex flex-col min-w-0">
                                            <span
                                                class="text-xs text-gray-900 truncate font-medium"
                                            >
                                                {{ artifact.name }}
                                            </span>
                                            <span
                                                v-if="artifact.file_name"
                                                class="text-[10px] text-gray-400 truncate"
                                            >
                                                {{ artifact.file_name }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Status Badge -->
                                    <span
                                        v-if="artifact.has_file"
                                        class="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-100"
                                    >
                                        등록됨
                                    </span>
                                    <span
                                        v-else
                                        class="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-100"
                                    >
                                        미등록
                                    </span>
                                </div>
                            </div>

                            <!-- Empty State -->
                            <div v-else class="text-center py-4">
                                <span class="text-xs text-gray-400 italic"
                                    >등록된 파일이 없습니다.</span
                                >
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. External Systems Section -->
            <div v-if="project.external_systems.length > 0">
                <h3 class="text-lg font-medium text-gray-900 mb-4">
                    3. 외부 시스템 데이터 분석
                </h3>
                <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    <div
                        v-for="system in project.external_systems"
                        :key="system.id"
                        class="flex items-center p-4 rounded-lg border border-gray-200 bg-white shadow-sm transition-all cursor-default"
                        :class="
                            system.enabled
                                ? 'border-indigo-200 ring-1 ring-indigo-100'
                                : 'border-gray-200 opacity-70'
                        "
                    >
                        <div
                            :class="{
                                'bg-blue-50 text-blue-700':
                                    system.system_type === 'jira',
                                'bg-purple-50 text-purple-700':
                                    system.system_type === 'figma',
                            }"
                            class="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg"
                        >
                            {{ getSystemIcon(system.system_type) }}
                        </div>
                        <div class="ml-4">
                            <p class="text-base font-semibold text-gray-900">
                                {{ system.system_type.toUpperCase() }}
                            </p>
                            <div class="flex items-center mt-1">
                                <span
                                    class="h-2 w-2 rounded-full mr-2"
                                    :class="
                                        system.enabled
                                            ? 'bg-green-500'
                                            : 'bg-gray-400'
                                    "
                                ></span>
                                <p class="text-xs text-gray-500">
                                    {{
                                        system.enabled
                                            ? "분석 완료"
                                            : "사용 안함"
                                    }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
</template>
