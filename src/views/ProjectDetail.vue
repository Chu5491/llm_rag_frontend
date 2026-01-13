<script setup lang="ts">
import {ref, onMounted} from "vue";
import {useRoute, useRouter} from "vue-router";
import {getFileIcon, getFileIconColor} from "../utils/fileIcons.js";
import {formatDate, formatFileSize} from "../utils/format.js";
import {fetchProjectDetail} from "../services/projectApi.js";
import type {ProjectResponse} from "../types/project.js";
import {
    ARTIFACT_TYPES,
    ARTIFACT_LABELS,
    ARTIFACT_ICONS,
    type ArtifactType,
} from "../types/project.js";

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
    } catch (e: unknown) {
        console.error("프로젝트 상세 로드 실패:", e);
        if (e instanceof Error) {
             // API 클라이언트에서 던진 에러 메시지 사용
            error.value = e.message;
        } else {
            error.value = "프로젝트 정보를 불러오는 데 실패했습니다.";
        }
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

// 카테고리 표시 순서
const ORDERED_CATEGORIES: ArtifactType[] = [
    ARTIFACT_TYPES.REQUIREMENTS,
    ARTIFACT_TYPES.SCREEN_DESIGN,
    ARTIFACT_TYPES.API_SPEC,
    ARTIFACT_TYPES.MANUAL,
    ARTIFACT_TYPES.ETC,
];

// 뒤로 가기
const goBack = () => {
    router.go(-1);
};

// 상태별 UI (배지/아이콘) 매핑
const getStatusBadge = (status: string | undefined) => {
    switch (status) {
        case "processing":
            return {
                text: "진행중",
                classes: "bg-blue-50 text-blue-700 border border-blue-100",
                dotClass: "bg-blue-500", // for system dot
                icon: "hourglass_empty", // optional
            };
        case "completed":
            return {
                text: "분석 완료",
                classes: "bg-green-50 text-green-700 border border-green-100",
                dotClass: "bg-green-500",
                icon: "check_circle",
            };
        case "partial_success":
            return {
                text: "일부 완료",
                classes:
                    "bg-orange-50 text-orange-700 border border-orange-100",
                dotClass: "bg-orange-500",
                icon: "warning",
            };
        case "error":
            return {
                text: "실패",
                classes: "bg-red-50 text-red-700 border border-red-100",
                dotClass: "bg-red-500",
                icon: "error",
            };
        case "idle":
        default:
            return {
                text: "대기",
                classes: "bg-gray-50 text-gray-500 border border-gray-100",
                dotClass: "bg-gray-400",
                icon: "schedule",
            };
    }
};

onMounted(() => {
    loadProjectDetail();
});
</script>

<template>
    <main class="p-6 space-y-6">
        <!-- 헤더 -->
        <header class="flex justify-between items-start">
            <div>
                <p class="mt-1 text-sm text-gray-500">
                    등록된 프로젝트의 상세 정보를 확인할 수 있습니다.
                </p>
            </div>
            <button @click="goBack" class="btn-primary">뒤로 가기</button>
        </header>

        <!-- 로딩 상태 -->
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

        <!-- 에러 상태 -->
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

        <!-- 메인 컨텐츠 -->
        <section
            v-else-if="project"
            class="rounded-lg bg-white p-6 shadow space-y-8"
        >
            <!-- 1. 기본 정보 -->
            <div>
                <div
                    class="flex items-center justify-between mb-5 pb-2 border-b border-gray-100"
                >
                    <h3 class="text-lg font-bold text-gray-900">
                        1. 프로젝트 기본 정보
                    </h3>
                    <div
                        class="flex items-center gap-3 text-xs text-gray-500 font-medium"
                    >
                        <span>생성: {{ formatDate(project.created_at) }}</span>
                        <span class="w-px h-3 bg-gray-300"></span>
                        <span>수정: {{ formatDate(project.updated_at) }}</span>
                    </div>
                </div>

                <div class="space-y-4">
                    <!-- 상단 정보 카드 -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- 프로젝트명 -->
                        <div
                            class="bg-gray-50 rounded-xl p-5 border border-gray-200 flex flex-col justify-center shadow-sm"
                        >
                            <div class="flex items-center gap-2 mb-2">
                                <span
                                    class="material-icons-outlined text-indigo-500 text-lg"
                                    >inventory_2</span
                                >
                                <span
                                    class="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                                    >프로젝트 이름</span
                                >
                            </div>
                            <p class="text-lg font-bold text-gray-900 truncate">
                                {{ project.name }}
                            </p>
                        </div>

                        <!-- 서비스 유형 -->
                        <div
                            class="bg-gray-50 rounded-xl p-5 border border-gray-200 flex flex-col justify-center shadow-sm"
                        >
                            <div class="flex items-center gap-2 mb-2">
                                <span
                                    class="material-icons-outlined text-green-500 text-lg"
                                    >devices</span
                                >
                                <span
                                    class="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                                    >서비스 유형</span
                                >
                            </div>
                            <p class="text-lg font-bold text-gray-900">
                                {{ project.service_type || "-" }}
                            </p>
                        </div>
                    </div>

                    <!-- 프로젝트 설명 -->
                    <div
                        class="bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm"
                    >
                        <div class="flex items-center gap-2 mb-3">
                            <span
                                class="material-icons-outlined text-gray-400 text-lg"
                                >description</span
                            >
                            <span
                                class="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                                >프로젝트 설명</span
                            >
                        </div>
                        <p
                            class="text-sm text-gray-700 whitespace-pre-line leading-relaxed min-h-[60px]"
                        >
                            {{ project.description }}
                        </p>
                    </div>

                    <!-- 주요 기능 태그 -->
                    <div v-if="project.features && project.features.length > 0">
                        <div class="flex items-center gap-2 mb-3 mt-6">
                            <span
                                class="material-icons-outlined text-gray-400 text-lg"
                                >label</span
                            >
                            <span class="text-sm font-bold text-gray-900">
                                주요 기능 목록
                            </span>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <span
                                v-for="feature in project.features"
                                :key="feature.id"
                                class="inline-flex items-center px-4 py-2 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
                            >
                                {{ feature.name }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. 산출물 영역 -->
            <div>
                <div
                    class="flex items-center justify-between mb-5 pb-2 border-b border-gray-100"
                >
                    <h3 class="text-lg font-bold text-gray-900">
                        2. 등록된 산출물
                    </h3>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div
                        v-for="category in ORDERED_CATEGORIES"
                        :key="category"
                        class="flex flex-col rounded-lg border border-gray-200 bg-white"
                        :class="{
                            'lg:col-span-2': category === ARTIFACT_TYPES.ETC,
                        }"
                    >
                        <!-- 헤더 -->
                        <div
                            class="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg"
                        >
                            <div class="flex items-center gap-2">
                                <span
                                    class="material-icons-outlined text-gray-400 text-[18px]"
                                    >{{ ARTIFACT_ICONS[category] }}</span
                                >
                                <span class="text-sm font-bold text-gray-700">{{
                                    ARTIFACT_LABELS[category]
                                }}</span>
                            </div>
                        </div>

                        <!-- 컨텐츠 -->
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
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <span
                                                    class="text-xs text-gray-900 truncate font-medium"
                                                >
                                                    {{ artifact.name }}
                                                </span>
                                                <span
                                                    v-if="
                                                        artifact.file_size !==
                                                        undefined
                                                    "
                                                    class="text-[10px] text-gray-400 shrink-0"
                                                >
                                                    {{
                                                        formatFileSize(
                                                            artifact.file_size
                                                        )
                                                    }}
                                                </span>
                                            </div>
                                            <span
                                                v-if="artifact.file_name"
                                                class="text-[10px] text-gray-400 truncate"
                                            >
                                                {{ artifact.file_name }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- 상태 배지 -->
                                    <template v-if="artifact.has_file">
                                        <!-- 에러 툴팁 -->
                                        <div
                                            v-if="artifact.status === 'error'"
                                            class="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border relative group cursor-help"
                                            :class="
                                                getStatusBadge(artifact.status)
                                                    .classes
                                            "
                                        >
                                            {{
                                                getStatusBadge(artifact.status)
                                                    .text
                                            }}
                                            <span
                                                v-if="artifact.last_error"
                                                class="hidden group-hover:block absolute bottom-full right-0 mb-1 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 whitespace-normal wrap-break-word text-left"
                                            >
                                                {{ artifact.last_error }}
                                            </span>
                                        </div>

                                        <!-- 기타 상태 -->
                                        <span
                                            v-else
                                            class="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                                            :class="
                                                getStatusBadge(artifact.status)
                                                    .classes
                                            "
                                        >
                                            {{
                                                getStatusBadge(artifact.status)
                                                    .text
                                            }}
                                        </span>
                                    </template>
                                    <span
                                        v-else
                                        class="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-100"
                                    >
                                        미등록
                                    </span>
                                </div>
                            </div>

                            <!-- 데이터 없음 -->
                            <div v-else class="text-center py-4">
                                <span class="text-xs text-gray-400 italic"
                                    >등록된 파일이 없습니다.</span
                                >
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. 외부 시스템 영역 -->
            <div v-if="project.external_systems.length > 0">
                <div
                    class="flex items-center justify-between mb-5 pb-2 border-b border-gray-100"
                >
                    <h3 class="text-lg font-bold text-gray-900">
                        3. 외부 시스템 데이터 분석
                    </h3>
                </div>
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
                            <div class="flex flex-col mt-1">
                                <div class="flex items-center">
                                    <span
                                        class="h-2 w-2 rounded-full mr-2"
                                        :class="
                                            system.enabled
                                                ? getStatusBadge(system.status)
                                                      .dotClass
                                                : 'bg-gray-300'
                                        "
                                    ></span>
                                    <p class="text-xs text-gray-500">
                                        <span v-if="!system.enabled"
                                            >사용 안함</span
                                        >
                                        <span v-else>
                                            {{
                                                getStatusBadge(system.status)
                                                    .text
                                            }}
                                        </span>
                                    </p>
                                </div>
                                <!-- 에러 메시지 -->
                                <p
                                    v-if="
                                        system.status === 'error' &&
                                        system.last_error
                                    "
                                    class="text-[10px] text-red-500 mt-1 break-all"
                                >
                                    {{ system.last_error }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
</template>
