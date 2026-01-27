<script setup lang="ts">
import {ref, onMounted} from "vue";
import {getOllamaModels, startGeneration} from "../services/api.js";
import {fetchProjects, fetchProjectDetail} from "../services/projectApi.js";
import type {OllamaModel} from "../types/ollama.js";
import {
    type ProjectResponse,
    type ProjectArtifact,
    SOURCE_LABELS,
    SOURCE_TYPES,
} from "../types/project.js";
import router from "../router/index.js";
import BaseModal from "../components/BaseModal.vue";
import {useAlert} from "../composables/useAlert.js";
import {useAuthStore} from "../stores/auth.js"; // Added
// 날짜 포맷 헬퍼
const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return dateStr.split("T")[0];
};

// TC 생성 수행명 상태
const title = ref("");

// 프로젝트 상세 및 선택 상태
const selectedProjectDetail = ref<ProjectResponse | null>(null);
const detailLoading = ref(false);
const showRefModal = ref(false);

const selectedArtifactIds = ref<number[]>([]);
const selectedFeatureIds = ref<number[]>([]);
const selectedExternalSystemIds = ref<number[]>([]);

const llmModels = ref<string[]>([]);
const selectedModel = ref<string>("");
const modelsLoading = ref(false);
const modelsError = ref<string | null>(null);

const selectedLanguage = ref("한글");
const tcPrefix = ref("PRJ");

// 프로젝트 목록 상태
const projects = ref<ProjectResponse[]>([]);
const projectsLoading = ref(false);
const selectedProjectId = ref<number | null>(null);

import {watch, computed} from "vue";

// 프로젝트 변경 감지
watch(selectedProjectId, async (newId) => {
    if (!newId) {
        selectedProjectDetail.value = null;
        selectedArtifactIds.value = [];
        selectedFeatureIds.value = [];
        selectedExternalSystemIds.value = [];
        tcPrefix.value = "PRJ";
        return;
    }

    // 프로젝트 ID 기반 Prefix 설정
    tcPrefix.value = `PRJ${newId}`;

    detailLoading.value = true;
    try {
        const detail = await fetchProjectDetail(newId);
        console.log("API Response Detail:", detail);
        console.log("First Artifact:", detail.artifacts?.[0]);
        selectedProjectDetail.value = detail;

        // 기본값: 모든 산출물/기능/외부시스템 선택
        selectedArtifactIds.value = detail.artifacts.map((a) => a.id);
        selectedFeatureIds.value = detail.features.map((f) => f.id);
        selectedExternalSystemIds.value = detail.external_systems
            .filter((sys) => sys.enabled)
            .map((sys) => sys.id);
    } catch (e) {
        console.error("Project Detail Load Failed", e);
    } finally {
        detailLoading.value = false;
    }
});

// 모달용 산출물 그룹핑 계산
const groupedArtifacts = computed(() => {
    if (!selectedProjectDetail.value) return {};

    // 타입별 그룹 초기화
    const groups: Record<string, ProjectArtifact[]> = {};

    Object.values(SOURCE_TYPES).forEach((type) => {
        groups[type] = [];
    });

    selectedProjectDetail.value.artifacts.forEach((artifact) => {
        const type = artifact.source_type || SOURCE_TYPES.ETC;
        if (!groups[type]) groups[type] = [];
        groups[type].push(artifact);
    });

    // 빈 그룹 제거
    return Object.fromEntries(
        Object.entries(groups).filter(([_, items]) => items.length > 0)
    );
});

// 선택 헬퍼 함수들
const toggleArtifact = (id: number) => {
    const s = new Set(selectedArtifactIds.value);
    if (s.has(id)) {
        s.delete(id);
    } else {
        s.add(id);
    }
    selectedArtifactIds.value = Array.from(s);
};

const toggleFeature = (id: number | undefined) => {
    if (id === undefined || id === null) return;
    const targetId = Number(id);
    if (isNaN(targetId)) return;

    const s = new Set(selectedFeatureIds.value);

    if (s.has(targetId)) {
        s.delete(targetId);
    } else {
        s.add(targetId);
    }
    selectedFeatureIds.value = Array.from(s);
};

const toggleExternalSystem = (id: number | undefined) => {
    if (id === undefined || id === null) return;
    const targetId = Number(id);
    if (isNaN(targetId)) return;

    const s = new Set(selectedExternalSystemIds.value);
    if (s.has(targetId)) {
        s.delete(targetId);
    } else {
        s.add(targetId);
    }
    selectedExternalSystemIds.value = Array.from(s);
};

const isCategorySelected = (type: string) => {
    const items = groupedArtifacts.value[type] || [];
    if (items.length === 0) return false;
    return items.every((item) => selectedArtifactIds.value.includes(item.id));
};

const toggleCategory = (type: string) => {
    const items = groupedArtifacts.value[type] || [];
    if (items.length === 0) return;

    const idsInGroup = items.map((i) => i.id);
    const s = new Set(selectedArtifactIds.value);

    // 그룹 내 모든 아이템이 선택되어 있는지 확인
    const allSelected = idsInGroup.every((id) => s.has(id));

    if (allSelected) {
        // 전체 해제
        idsInGroup.forEach((id) => s.delete(id));
    } else {
        // 전체 선택
        idsInGroup.forEach((id) => s.add(id));
    }
    selectedArtifactIds.value = Array.from(s);
};

const getArtifactCount = (type: string) => {
    const items = groupedArtifacts.value[type] || [];
    const selected = items.filter((i) =>
        selectedArtifactIds.value.includes(i.id)
    ).length;
    return `${selected}/${items.length}`;
};

// --- Setup ---
const {showAlert} = useAlert();
const authStore = useAuthStore(); // Added
// 초기 데이터 로드 (Projects + Ollama Models)
onMounted(async () => {
    // 1. 프로젝트 목록 로드
    projectsLoading.value = true;
    try {
        const projectData = await fetchProjects();
        projects.value = projectData;
    } catch (e) {
        console.error("Failed to fetch projects", e);
    } finally {
        projectsLoading.value = false;
    }

    // 2. Ollama 모델 목록 로드
    modelsLoading.value = true;
    modelsError.value = null;

    try {
        const data = await getOllamaModels();
        const models: OllamaModel[] = data.models ?? [];

        llmModels.value = models
            .filter((m) => !m.name.includes("bge"))
            .map((m) => m.name);

        if (selectedModel.value === "") {
            selectedModel.value = llmModels.value[0];
        }
    } catch (e: any) {
        modelsError.value =
            e?.message ?? "Ollama 모델 목록을 불러오는 중 오류가 발생했습니다.";
    } finally {
        modelsLoading.value = false;
    }
});

const handleCancel = () => {
    router.back();
};

const isGenerating = ref(false);
const generationStatus = ref<"idle" | "generating" | "done">("idle");
const handleGenerate = async () => {
    // 0. 인증 체크
    if (!authStore.isAuthenticated) {
        showAlert("로그인 세션이 만료되었습니다. 다시 로그인해주세요.", "오류");
        return;
    }

    if (isGenerating.value) return;
    if (!selectedProjectId.value) {
        showAlert("프로젝트를 선택해주세요.", "알림");
        return;
    }

    isGenerating.value = true;
    generationStatus.value = "generating";

    try {
        const payload = {
            title: title.value,
            project_id: selectedProjectId.value,
            model: selectedModel.value,
            language: selectedLanguage.value,
            tcPrefix: tcPrefix.value,
            artifact_ids: selectedArtifactIds.value,
            feature_ids: selectedFeatureIds.value,
            external_system_ids: selectedExternalSystemIds.value,
            user_id: authStore.user?.id, // Added
        };

        const response = await startGeneration(payload);

        generationStatus.value = "done";

        // 잠시 완료 상태 보여준 후 이동
        setTimeout(() => {
            router.push("/generate");
        }, 1000);
    } catch (error: any) {
        console.error("Generate failed:", error);
        showAlert(error.message || "생성 시작에 실패했습니다.", "오류");
        isGenerating.value = false;
        generationStatus.value = "idle";
    }
};
</script>

<template>
    <!-- 기존 페이지들과 동일한 메인 래퍼 -->
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 (카드 밖) -->
        <header>
            <p class="mt-1 text-sm text-gray-500">
                자동 생성에 사용할 프로젝트 / 산출물 / 모델 설정을 구성합니다.
            </p>
        </header>

        <!-- 메인 카드 -->
        <section class="rounded-lg bg-white p-6 shadow space-y-8">
            <!-- 1. 기본 정보 섹션 -->
            <section class="space-y-4">
                <div
                    class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"
                >
                    <div>
                        <h2 class="text-base font-semibold text-slate-900">
                            기본 정보
                        </h2>
                        <p class="mt-1 text-xs text-slate-500">
                            어떤 프로젝트의 어떤 산출물 기준으로 생성할지
                            선택합니다.
                        </p>
                    </div>
                </div>
                <div
                    class="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6"
                >
                    <!-- 왼쪽: 폼 -->
                    <div
                        class="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                    >
                        <!-- 프로젝트 -->
                        <div class="space-y-1.5">
                            <label
                                class="block text-xs font-semibold text-slate-700"
                                for="title"
                            >
                                TC 생성 수행명
                            </label>
                            <input
                                id="title"
                                v-model="title"
                                type="text"
                                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="TC 생성 수행명을 입력해주세요."
                            />
                        </div>
                    </div>
                </div>
                <hr class="border-slate-100" />
                <div
                    class="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6"
                >
                    <!-- 왼쪽: 폼 -->
                    <div class="flex-1 flex flex-col gap-6">
                        <!-- 1. Row: 프로젝트 선택 + 정보 -->
                        <div class="space-y-4">
                            <!-- 프로젝트 선택 -->
                            <div class="space-y-1.5">
                                <label
                                    class="block text-xs font-semibold text-slate-700"
                                    for="project"
                                >
                                    프로젝트 명
                                </label>
                                <select
                                    id="project"
                                    v-model="selectedProjectId"
                                    class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    :class="
                                        selectedProjectId === null
                                            ? 'text-slate-400'
                                            : 'text-slate-700'
                                    "
                                >
                                    <option
                                        v-if="projectsLoading"
                                        :value="null"
                                        disabled
                                    >
                                        로딩 중...
                                    </option>
                                    <option
                                        v-else-if="projects.length === 0"
                                        :value="null"
                                        disabled
                                    >
                                        프로젝트 없음
                                    </option>
                                    <option
                                        v-else
                                        :value="null"
                                        disabled
                                        hidden
                                    >
                                        수행할 프로젝트를 선택하세요
                                    </option>
                                    <option
                                        v-for="proj in projects"
                                        :key="proj.id"
                                        :value="proj.id"
                                        class="text-slate-700"
                                    >
                                        {{ proj.name }}
                                    </option>
                                </select>
                            </div>

                            <!-- 프로젝트 정보 표시 -->
                            <div
                                v-if="selectedProjectDetail"
                                class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3"
                            >
                                <!-- Header: Name & Type -->
                                <div class="flex items-start justify-between">
                                    <div class="flex-1 pr-2">
                                        <h3
                                            class="text-sm font-bold text-slate-900"
                                        >
                                            {{ selectedProjectDetail.name }}
                                        </h3>
                                        <p
                                            class="text-xs text-slate-500 mt-1 mb-1 line-clamp-2"
                                        >
                                            {{
                                                selectedProjectDetail.description ||
                                                "설명이 없습니다."
                                            }}
                                        </p>
                                        <p class="text-[11px] text-slate-400">
                                            마지막 수정:
                                            {{
                                                formatDate(
                                                    selectedProjectDetail.updated_at
                                                )
                                            }}
                                        </p>
                                    </div>
                                    <span
                                        class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 shrink-0"
                                    >
                                        {{ selectedProjectDetail.service_type }}
                                    </span>
                                </div>

                                <!-- Stats Grid -->
                                <div
                                    class="grid grid-cols-3 gap-2 border-t border-b border-slate-100 py-2.5 bg-slate-50/50 rounded-md"
                                >
                                    <div class="text-center">
                                        <span
                                            class="block text-[10px] text-slate-400 mb-0.5"
                                            >산출물</span
                                        >
                                        <span
                                            class="text-sm font-bold text-slate-700"
                                            >{{
                                                selectedProjectDetail.artifacts
                                                    .length
                                            }}</span
                                        >
                                    </div>
                                    <div
                                        class="text-center border-l border-slate-200"
                                    >
                                        <span
                                            class="block text-[10px] text-slate-400 mb-0.5"
                                            >기능</span
                                        >
                                        <span
                                            class="text-sm font-bold text-slate-700"
                                            >{{
                                                selectedProjectDetail.features
                                                    .length
                                            }}</span
                                        >
                                    </div>
                                    <div
                                        class="text-center border-l border-slate-200"
                                    >
                                        <span
                                            class="block text-[10px] text-slate-400 mb-0.5"
                                            >TC</span
                                        >
                                        <span
                                            class="text-sm font-bold text-slate-700"
                                            >{{
                                                selectedProjectDetail.tc_count
                                            }}</span
                                        >
                                    </div>
                                </div>
                            </div>
                            <div
                                v-else
                                class="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-400"
                            >
                                프로젝트를 선택하면 요약 정보가 표시됩니다.
                            </div>
                        </div>

                        <!-- 2. Row: 산출물 (New Trigger) - Full Width -->
                        <div class="space-y-1.5">
                            <label
                                class="block text-xs font-semibold text-slate-700"
                            >
                                참고할 산출물
                            </label>

                            <div v-if="selectedProjectDetail" class="space-y-3">
                                <!-- Reference Management Panel -->
                                <div
                                    class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-300"
                                >
                                    <div
                                        class="flex items-start justify-between mb-3"
                                    >
                                        <div class="flex items-center gap-2">
                                            <div
                                                class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"
                                            >
                                                <span
                                                    class="material-icons-outlined text-lg"
                                                    >library_books</span
                                                >
                                            </div>
                                            <div>
                                                <p
                                                    class="text-sm font-semibold text-slate-800"
                                                >
                                                    참고 자료 구성
                                                </p>
                                                <p
                                                    class="text-[11px] text-slate-400"
                                                >
                                                    테스트케이스 생성 기반 문서
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            @click="showRefModal = true"
                                            class="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                                        >
                                            <span
                                                v-if="
                                                    selectedArtifactIds.length >
                                                        0 ||
                                                    selectedFeatureIds.length >
                                                        0 ||
                                                    selectedExternalSystemIds.length >
                                                        0
                                                "
                                            >
                                                변경하기
                                            </span>
                                            <span v-else> 자료 선택 </span>
                                        </button>
                                    </div>

                                    <!-- Selection Summary -->
                                    <div
                                        v-if="
                                            selectedArtifactIds.length > 0 ||
                                            selectedFeatureIds.length > 0 ||
                                            selectedExternalSystemIds.length > 0
                                        "
                                        class="flex flex-wrap gap-2"
                                    >
                                        <div
                                            v-if="
                                                selectedArtifactIds.length > 0
                                            "
                                            class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                                        >
                                            <span
                                                class="material-icons-outlined text-[14px]"
                                                >description</span
                                            >
                                            산출물
                                            {{ selectedArtifactIds.length }}개
                                        </div>
                                        <div
                                            v-if="selectedFeatureIds.length > 0"
                                            class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                                        >
                                            <span
                                                class="material-icons-outlined text-[14px]"
                                                >dns</span
                                            >
                                            기능
                                            {{ selectedFeatureIds.length }}개
                                        </div>
                                        <div
                                            v-if="
                                                selectedExternalSystemIds.length >
                                                0
                                            "
                                            class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                                        >
                                            <span
                                                class="material-icons-outlined text-[14px]"
                                                >link</span
                                            >
                                            외부연동
                                            {{
                                                selectedExternalSystemIds.length
                                            }}개
                                        </div>
                                    </div>
                                    <div
                                        v-else
                                        class="rounded-md border border-dashed border-slate-200 bg-slate-50 py-3 text-center"
                                    >
                                        <span class="text-xs text-slate-400">
                                            선택된 참고 자료가 없습니다.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Empty State -->
                            <div
                                v-else-if="detailLoading"
                                class="h-10 flex items-center px-3 text-xs text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200"
                            >
                                불러오는 중...
                            </div>
                            <div
                                v-else
                                class="h-10 flex items-center px-3 text-xs text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200"
                            >
                                프로젝트를 선택해주세요.
                            </div>
                        </div>
                    </div>

                    <!-- 오른쪽: 간단 안내 -->
                    <aside
                        class="w-full rounded-md border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-relaxed text-amber-900 shadow-sm lg:w-64"
                    >
                        <p
                            class="mb-1 border-b border-amber-200 pb-1 text-[11px] font-bold"
                        >
                            Note
                        </p>
                        프로젝트와 산출물을 선택하면<br />
                        해당 문서를 기준으로 테스트케이스를 생성합니다.
                    </aside>
                </div>
            </section>

            <hr class="border-slate-100" />

            <!-- 2. 모델 & 언어 섹션 -->
            <section class="space-y-4">
                <div
                    class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"
                >
                    <div>
                        <h2 class="text-base font-semibold text-slate-900">
                            모델 & 언어
                        </h2>
                        <p class="mt-1 text-xs text-slate-500">
                            Ollama에 등록된 LLM 중, 임베딩 모델을 제외한 모델을
                            선택합니다.
                        </p>
                    </div>
                </div>

                <div
                    class="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6"
                >
                    <!-- 왼쪽: 폼 -->
                    <div class="grid flex-1 gap-4 md:grid-cols-2">
                        <div class="space-y-1.5">
                            <label
                                class="block text-xs font-semibold text-slate-700"
                                for="model"
                            >
                                사용할 LLM 모델
                            </label>
                            <select
                                id="model"
                                v-model="selectedModel"
                                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option v-if="modelsLoading" disabled>
                                    모델 목록 불러오는 중...
                                </option>
                                <option
                                    v-else-if="
                                        !modelsLoading && llmModels.length === 0
                                    "
                                    disabled
                                >
                                    사용 가능한 모델이 없습니다
                                </option>
                                <option
                                    v-for="name in llmModels"
                                    v-else
                                    :key="name"
                                    :value="name"
                                >
                                    {{ name }}
                                </option>
                            </select>
                            <p
                                v-if="modelsError"
                                class="mt-1 text-[11px] text-red-500"
                            >
                                {{ modelsError }}
                            </p>
                        </div>

                        <div class="space-y-1.5">
                            <label
                                class="block text-xs font-semibold text-slate-700"
                                for="language"
                            >
                                테스트 케이스 생성 언어
                            </label>
                            <select
                                id="language"
                                v-model="selectedLanguage"
                                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option>한글</option>
                                <option>English</option>
                            </select>
                        </div>
                    </div>

                    <!-- 오른쪽: 간단 안내 -->
                    <aside
                        class="w-full rounded-md border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-relaxed text-amber-900 shadow-sm lg:w-64"
                    >
                        <p
                            class="mb-1 border-b border-amber-200 pb-1 text-[11px] font-bold"
                        >
                            Tip
                        </p>
                        Ollama에 등록된 모델 목록에서<br />
                        첫 번째 임베딩 모델을 제외한 나머지만<br />
                        선택할 수 있도록 구성되어 있습니다.
                    </aside>
                </div>
            </section>

            <hr class="border-slate-100" />

            <!-- 3. 생성 옵션 섹션 -->
            <section class="space-y-4">
                <div
                    class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"
                >
                    <div>
                        <h2 class="text-base font-semibold text-slate-900">
                            생성 옵션
                        </h2>
                        <p class="mt-1 text-xs text-slate-500">
                            테스트케이스 ID 규칙과 생성 개수를 정의합니다.
                        </p>
                    </div>
                </div>

                <div
                    class="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6"
                >
                    <!-- 왼쪽: 폼 -->
                    <div class="flex-1">
                        <div class="grid gap-4 md:grid-cols-3">
                            <div class="space-y-1.5">
                                <label
                                    class="block text-xs font-semibold text-slate-700"
                                    for="tcPrefix"
                                >
                                    테스트 케이스 ID 프리픽스
                                </label>
                                <input
                                    id="tcPrefix"
                                    v-model="tcPrefix"
                                    type="text"
                                    class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    placeholder="예: SAB"
                                />
                                <p class="mt-1 text-[11px] text-slate-400">
                                    예) SAB_001, SAB_002 형태로 생성됩니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 하단 버튼 -->
            <div
                class="mt-4 flex items-center justify-end gap-4 border-t border-slate-100 pt-6"
            >
                <button
                    type="button"
                    class="px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
                    @click="handleCancel"
                >
                    취소
                </button>
                <button
                    type="submit"
                    :disabled="isGenerating"
                    class="flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    @click.prevent="handleGenerate"
                >
                    <span v-if="isGenerating">처리 중...</span>
                    <span v-else>자동 생성 시작</span>
                    <span class="material-icons-outlined text-base">
                        play_arrow
                    </span>
                </button>
            </div>
        </section>
    </main>
    <div
        v-if="generationStatus !== 'idle'"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
        <div
            class="flex min-w-[260px] flex-col items-center gap-3 rounded-lg bg-white px-6 py-5 text-center shadow-lg"
        >
            <!-- 로딩 스피너 -->
            <div
                v-if="generationStatus === 'generating'"
                class="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
            />
            <!-- 완료 체크 -->
            <div
                v-else
                class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100"
            >
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    class="h-6 w-6 text-emerald-600"
                >
                    <path
                        d="M20.285 6.707a1 1 0 0 0-1.414-1.414L9 15.164l-3.871-3.87a1 1 0 1 0-1.414 1.414l4.578 4.577a1 1 0 0 0 1.414 0l10.578-10.578Z"
                        fill="currentColor"
                    />
                </svg>
            </div>
            <p class="mt-1 text-sm text-gray-800">
                {{
                    generationStatus === "generating"
                        ? "테스트 케이스 생성을 준비합니다..."
                        : "자동 생성을 시작합니다! 생성 내역 페이지로 이동합니다."
                }}
            </p>
        </div>
    </div>
    <BaseModal
        :isOpen="showRefModal"
        title="산출물 및 기능 상세 선택"
        subTitle="생성에 활용할 참고 자료를 선택하세요."
        @close="showRefModal = false"
    >
        <div class="space-y-8">
            <!-- 1. Artifacts Grouped -->
            <section class="space-y-4">
                <div class="flex items-center justify-between">
                    <h4
                        class="text-sm font-bold text-gray-900 flex items-center gap-2"
                    >
                        <span
                            class="material-icons-outlined text-indigo-500 text-base"
                            >folder_open</span
                        >
                        산출물 파일
                    </h4>
                    <span class="text-xs text-gray-400"
                        >{{ selectedArtifactIds.length }}개 선택됨</span
                    >
                </div>

                <div class="grid grid-cols-1 gap-4">
                    <div
                        v-for="(files, type) in groupedArtifacts"
                        :key="type"
                        class="rounded-lg border border-gray-200 overflow-hidden"
                    >
                        <!-- Group Header -->
                        <div
                            class="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100"
                        >
                            <div class="flex items-center gap-2">
                                <span
                                    class="text-sm font-semibold text-gray-700"
                                >
                                    {{
                                        SOURCE_LABELS[
                                            String(
                                                type
                                            ) as keyof typeof SOURCE_LABELS
                                        ] || type
                                    }}
                                </span>
                                <span
                                    class="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[10px] text-gray-500 font-medium"
                                >
                                    {{ getArtifactCount(String(type)) }}
                                </span>
                            </div>
                            <div
                                class="flex items-center gap-2 cursor-pointer"
                                @click="toggleCategory(String(type))"
                            >
                                <span class="text-xs text-gray-500">{{
                                    isCategorySelected(String(type))
                                        ? "전체 해제"
                                        : "전체 선택"
                                }}</span>
                                <div
                                    class="custom-toggle"
                                    :class="
                                        isCategorySelected(String(type))
                                            ? 'custom-toggle-active'
                                            : 'custom-toggle-inactive'
                                    "
                                >
                                    <span
                                        class="custom-toggle-circle"
                                        :class="
                                            isCategorySelected(String(type))
                                                ? 'custom-toggle-circle-on'
                                                : 'custom-toggle-circle-off'
                                        "
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Files List -->
                        <div class="p-2 bg-white">
                            <div
                                v-for="file in files"
                                :key="file.id"
                                class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                                @click="toggleArtifact(file.id)"
                            >
                                <div
                                    class="custom-checkbox"
                                    :class="
                                        selectedArtifactIds.includes(file.id)
                                            ? 'custom-checkbox-indigo'
                                            : 'custom-checkbox-unchecked'
                                    "
                                >
                                    <span
                                        v-if="
                                            selectedArtifactIds.includes(
                                                file.id
                                            )
                                        "
                                        class="material-icons text-white text-sm"
                                        >check</span
                                    >
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p
                                        class="text-sm text-gray-700 truncate font-medium"
                                    >
                                        {{ file.name }}
                                    </p>
                                    <p class="text-xs text-gray-400 truncate">
                                        {{ file.file_name }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <hr class="border-gray-100" />

            <!-- 2. External Systems Group -->
            <section class="space-y-4">
                <div class="flex items-center justify-between">
                    <h4
                        class="text-sm font-bold text-gray-900 flex items-center gap-2"
                    >
                        <span
                            class="material-icons-outlined text-indigo-500 text-base"
                            >link</span
                        >
                        외부 시스템 (Figma 등)
                    </h4>
                    <span class="text-xs text-gray-400"
                        >{{ selectedExternalSystemIds.length }}개 선택됨</span
                    >
                </div>

                <div class="bg-white rounded-lg border border-gray-200 p-2">
                    <div
                        v-if="
                            selectedProjectDetail &&
                            selectedProjectDetail.external_systems &&
                            selectedProjectDetail.external_systems.length > 0
                        "
                        class="space-y-1"
                    >
                        <div
                            v-for="(
                                sys, idx
                            ) in selectedProjectDetail.external_systems"
                            :key="sys.id || idx"
                            class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                            @click="sys.enabled && toggleExternalSystem(sys.id)"
                            :class="{
                                'opacity-50 cursor-not-allowed': !sys.enabled,
                            }"
                        >
                            <div
                                class="custom-checkbox"
                                :class="
                                    selectedExternalSystemIds.includes(sys.id)
                                        ? 'custom-checkbox-indigo'
                                        : 'custom-checkbox-unchecked'
                                "
                            >
                                <span
                                    v-if="
                                        selectedExternalSystemIds.includes(
                                            sys.id
                                        )
                                    "
                                    class="material-icons text-white text-sm"
                                    >check</span
                                >
                            </div>
                            <div class="flex-1">
                                <div class="text-sm text-gray-700 font-medium">
                                    {{ sys.system_type }}
                                    <span
                                        v-if="!sys.enabled"
                                        class="text-xs text-red-400 ml-1"
                                        >(비활성)</span
                                    >
                                </div>
                                <div
                                    class="text-xs text-gray-400 truncate max-w-[200px]"
                                >
                                    {{ sys.url }}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center py-4 text-xs text-gray-400">
                        등록된 외부 시스템이 없습니다.
                    </div>
                </div>
            </section>

            <hr class="border-gray-100" />

            <!-- 3. Features List -->
            <section class="space-y-4">
                <div class="flex items-center justify-between">
                    <h4
                        class="text-sm font-bold text-gray-900 flex items-center gap-2"
                    >
                        <span
                            class="material-icons-outlined text-green-500 text-base"
                            >list_alt</span
                        >
                        기능 분류 목록
                    </h4>
                    <span class="text-xs text-gray-400"
                        >{{ selectedFeatureIds.length }}개 선택됨</span
                    >
                </div>

                <div class="bg-white rounded-lg border border-gray-200 p-2">
                    <div
                        v-if="
                            selectedProjectDetail &&
                            selectedProjectDetail.features &&
                            selectedProjectDetail.features.length > 0
                        "
                        class="grid grid-cols-1 sm:grid-cols-2 gap-2"
                    >
                        <div
                            v-for="(
                                feature, idx
                            ) in selectedProjectDetail.features"
                            :key="feature.id || idx"
                            class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                            @click="toggleFeature(feature.id)"
                        >
                            <div
                                class="custom-checkbox"
                                :class="
                                    selectedFeatureIds.includes(feature.id)
                                        ? 'custom-checkbox-green'
                                        : 'custom-checkbox-unchecked'
                                "
                            >
                                <span
                                    v-if="
                                        selectedFeatureIds.includes(feature.id)
                                    "
                                    class="material-icons text-white text-sm"
                                    >check</span
                                >
                            </div>
                            <span class="text-sm text-gray-700">{{
                                feature.name
                            }}</span>
                        </div>
                    </div>
                    <div v-else class="text-center py-4 text-xs text-gray-400">
                        등록된 기능이 없습니다.
                    </div>
                </div>
            </section>
        </div>

        <!-- Footer -->
        <div
            class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3"
        >
            <button
                @click="showRefModal = false"
                class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
            >
                선택 완료
            </button>
        </div>
    </BaseModal>
</template>
```
