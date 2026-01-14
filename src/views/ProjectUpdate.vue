<script setup lang="ts">
import {ref, onMounted, computed, onUnmounted} from "vue";
import {useRoute, useRouter} from "vue-router";
import {fetchProjectDetail, updateProject} from "../services/projectApi.js";
import {checkFigmaPersist} from "../services/api.js";
import {useAlert} from "../composables/useAlert.js";

import {
    ArtifactItem,
    ExternalSystemItem,
    ProjectBase,
    SourceType,
    SOURCE_TYPES,
    SOURCE_LABELS,
    SOURCE_ICONS,
} from "../types/project.js";
import {getFileIcon, getFileIconColor} from "../utils/fileIcons.js";

const route = useRoute();
const router = useRouter();
const {showAlert} = useAlert();

const projectId = Number(route.params.id);

// 저장 상태
const saveStatus = ref<"idle" | "saving" | "done">("idle");
let redirectTimer: number | undefined;

// 프로젝트 기본 정보
const projectBase = ref<ProjectBase>({
    name: "",
    service_type: "",
    description: "",
});

// 기능 목록 (Features)
const features = ref<{id?: number; name: string}[]>([]);
const newFeatureInput = ref("");

// 산출물 목록 (기존 + 신규)
const artifacts = ref<ArtifactItem[]>([]);

// 외부 시스템 목록 (Figma)
type ExternalSystemId = "figma";
const externalSystems = ref<ExternalSystemItem[]>([
    {
        system_type: "figma",
        label: "Figma",
        description: "디자인 산출물을 기반으로 테스트케이스를 생성합니다.",
        enabled: false,
        pat: "",
        url: "",
        status: "idle",
    },
]);

// 로딩 상태
const isLoading = ref(false);
const error = ref<string | null>(null);

// 카테고리 순서
const ORDERED_CATEGORIES: SourceType[] = [
    SOURCE_TYPES.REQUIREMENTS,
    SOURCE_TYPES.SCREEN_DESIGN,
    SOURCE_TYPES.API_SPEC,
    SOURCE_TYPES.MANUAL,
    SOURCE_TYPES.ETC,
];

// 초기 데이터 로드
const loadProject = async () => {
    isLoading.value = true;
    try {
        const data = await fetchProjectDetail(projectId);
        projectBase.value = {
            name: data.name,
            service_type: data.service_type,
            description: data.description || "",
        };

        // 기능 매핑
        if (data.features) {
            features.value = data.features.map((f) => ({
                id: f.id,
                name: f.name,
            }));
        }

        // 산출물 매핑
        if (data.artifacts) {
            artifacts.value = data.artifacts.map((a) => ({
                id: a.id,
                source_type: a.source_type as SourceType,
                name: a.name,
                file_name: a.file_name,
                has_file: a.has_file,
                file_size: a.file_size,
                selected: true,
                file: undefined,
            }));
        }

        // 외부 시스템 매핑 (Figma)
        if (data.external_systems && data.external_systems.length > 0) {
            const figmaData = data.external_systems.find(
                (s) => s.system_type === "figma"
            );
            if (figmaData) {
                const target = externalSystems.value.find(
                    (s) => s.system_type === "figma"
                );
                if (target) {
                    target.enabled = figmaData.enabled;
                    target.url = figmaData.url || "";

                    target.status = (figmaData.status as any) || "idle";

                    target.pat = "";
                }
            }
        }
    } catch (e: any) {
        error.value = "프로젝트 정보를 불러오는 데 실패했습니다.";
        console.error(e);
    } finally {
        isLoading.value = false;
    }
};

// 기능 추가
const addFeature = () => {
    const name = newFeatureInput.value.trim();
    if (name && !features.value.some((f) => f.name === name)) {
        features.value.push({name});
    }
    newFeatureInput.value = "";
};

// 기능 삭제
const removeFeature = (index: number) => {
    features.value.splice(index, 1);
};

// 파일 추가 관련
const fileInput = ref<HTMLInputElement | null>(null);
const targetCategory = ref<SourceType | null>(null);
let nextArtifactTempId = 10000;

const triggerFileInput = (category: SourceType) => {
    if (!fileInput.value) return;
    targetCategory.value = category;
    fileInput.value.value = "";
    fileInput.value.click();
};

const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0 || !targetCategory.value) {
        return;
    }

    const file = target.files[0];
    artifacts.value.push({
        id: nextArtifactTempId++,
        source_type: targetCategory.value,
        name: file.name,
        file_name: file.name,
        has_file: true,
        file: file,
        file_size: file.size,
        selected: true,
    });
    targetCategory.value = null;
};

// 산출물 삭제
const removeArtifactRow = (index: number) => {
    artifacts.value.splice(index, 1);
};

// --- 외부 시스템 (Figma) 로직 ---
const activeExternalPopup = ref<ExternalSystemId | null>(null);
const popupError = ref<string | null>(null);

const activeExternalSystem = computed(
    () =>
        externalSystems.value.find(
            (s) => s.system_type === activeExternalPopup.value
        ) ?? null
);

// Figma 정보가 변경되었는지 추적 (재분석 경고용)
const figmaUpdated = ref(false);

// 재분석 예상 여부 (신규 파일 추가 OR Figma 정보 변경)
const isReanalysisExpected = computed(() => {
    const hasNewFiles = artifacts.value.some((a) => a.file !== undefined);
    return hasNewFiles || figmaUpdated.value;
});

const toggleExternalSystem = (id: ExternalSystemId) => {
    const system = externalSystems.value.find((s) => s.system_type === id);
    if (!system) return;

    if (!system.enabled) {
        // Off -> On
        system.enabled = true;

        // 이미 연동된 상태(status === 'completed')라면 팝업 없이 기존 정보 사용
        // 연동되지 않은 상태(idle, error 등)라면 팝업을 띄워 설정 유도
        if (system.status !== "completed") {
            system.pat = "";
            activeExternalPopup.value = id;
        }
    } else {
        // On -> Off: 비활성화 (상태 유지)
        system.enabled = false;
    }
};

// 재설정 버튼 클릭 시
const openReauthPopup = (id: ExternalSystemId) => {
    const system = externalSystems.value.find((s) => s.system_type === id);
    if (!system) return;

    // 재설정 모드 진입: 팝업 열고 PAT 초기화 (재입력 강제)
    system.pat = "";
    activeExternalPopup.value = id;
};

const cancelExternalPopup = () => {
    const system = activeExternalSystem.value;
    if (system) {
        // 연동이 완료되지 않은 상태에서 취소하면 토글 비활성화 (Create 페이지와 동일 동작)
        // 재설정 모드(이미 completed)였다면 토글 유지
        if (system.status !== "completed") {
            system.enabled = false;
        }
    }
    activeExternalPopup.value = null;
};

const saveExternalConfig = async () => {
    const system = activeExternalSystem.value;
    if (!system) return;
    popupError.value = null;

    if (system.system_type === "figma") {
        try {
            // "Create처럼 다시 등록": URL과 PAT 필수 검증
            if (!system.url) throw new Error("URL을 입력해주세요.");
            if (!system.pat) throw new Error("PAT를 입력해주세요.");

            // 검증 API 호출
            const data = await checkFigmaPersist(system.url, system.pat);
            console.log("Figma 연결 확인:", data);

            system.status = "completed";
            activeExternalPopup.value = null;

            // 변경 플래그 설정 (재분석 경고 표시)
            figmaUpdated.value = true;
        } catch (e: any) {
            popupError.value = e?.message ?? "Figma 연동 확인 실패";
            system.status = "error";
        }
    }
};

const goBack = () => {
    router.go(-1);
};

// 최종 저장
const handleSubmit = async () => {
    if (saveStatus.value !== "idle") return;

    if (!projectBase.value.name.trim()) {
        showAlert("프로젝트 명은 필수입니다.", "경고");
        return;
    }

    saveStatus.value = "saving";

    try {
        const payload = {
            ...projectBase.value,
            features: features.value,
            artifacts: artifacts.value.map((a) => ({
                id: a.id && a.id < 10000 ? a.id : undefined,
                source_type: a.source_type,
                name: a.name,
                has_file: a.has_file,
                file: a.file,
                file_size: a.file_size,
            })),
            external_systems: externalSystems.value,
        };

        await updateProject(projectId, payload);

        saveStatus.value = "done";
        redirectTimer = window.setTimeout(() => {
            saveStatus.value = "idle";
            router.push(`/project/detail/${projectId}`);
        }, 1500);
    } catch (e) {
        console.error("수정 실패:", e);
        showAlert("프로젝트 수정에 실패했습니다.", "오류");
        saveStatus.value = "idle";
    }
};

const formatFileSize = (bytes: number | undefined) => {
    if (bytes === undefined || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

onMounted(() => {
    loadProject();
});

onUnmounted(() => {
    if (redirectTimer) clearTimeout(redirectTimer);
});
</script>

<template>
    <main class="p-6 space-y-6">
        <!-- 헤더 -->
        <header class="flex justify-between items-start">
            <div>
                <p class="mt-1 text-sm text-gray-500">
                    프로젝트 정보를 수정합니다.
                </p>
            </div>
            <div class="flex gap-2">
                <!-- Buttons are moved to bottom -->
            </div>
        </header>

        <!-- 로딩/에러 -->
        <div v-if="isLoading" class="flex justify-center py-20">
            <div
                class="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
            ></div>
        </div>

        <div
            v-else-if="error"
            class="flex flex-col items-center py-10 text-red-500"
        >
            <span class="material-icons-outlined text-4xl">error_outline</span>
            <p class="mt-2">{{ error }}</p>
        </div>

        <!-- 메인 컨텐츠 (ProjectDetail 과 동일한 구조 사용) -->
        <section v-else class="rounded-lg bg-white p-6 shadow space-y-8">
            <!-- 1. 기본 정보 -->
            <div>
                <div
                    class="flex items-center justify-between mb-5 pb-2 border-b border-gray-100"
                >
                    <h3 class="text-lg font-bold text-gray-900">
                        1. 프로젝트 기본 정보
                    </h3>
                </div>

                <div class="space-y-4">
                    <!-- 상단 정보 카드 (Name, Service Type) -->
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
                                    >프로젝트 이름
                                    <span class="text-red-500">*</span></span
                                >
                            </div>
                            <input
                                v-model="projectBase.name"
                                type="text"
                                class="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-lg font-bold text-gray-900 placeholder-gray-400"
                                placeholder="프로젝트 명 입력"
                            />
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
                            <select
                                v-model="projectBase.service_type"
                                class="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-base font-semibold text-gray-900"
                            >
                                <option value="" disabled>선택하세요</option>
                                <option value="PC Web">PC Web</option>
                                <option value="Mobile Web">Mobile Web</option>
                                <option value="Ios">Ios</option>
                                <option value="Android">Android</option>
                            </select>
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
                                >프로젝트 설명
                                <span class="text-red-500">*</span></span
                            >
                        </div>
                        <textarea
                            v-model="projectBase.description"
                            rows="4"
                            class="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm text-gray-700 resize-none"
                            placeholder="설명 입력"
                        />
                    </div>

                    <!-- 주요 기능 (Features) -->
                    <div>
                        <div class="flex items-center gap-2 mb-3 mt-6">
                            <span
                                class="material-icons-outlined text-purple-500 text-lg"
                                >extension</span
                            >
                            <span
                                class="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                                >주요 기능</span
                            >
                        </div>

                        <!-- 재분석 경고 (새 파일 또는 Figma 변경 시) -->
                        <div
                            v-if="isReanalysisExpected"
                            class="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-100 flex items-start gap-2"
                        >
                            <span
                                class="material-icons-outlined text-orange-500 text-sm mt-0.5"
                                >warning_amber</span
                            >
                            <div class="text-xs text-orange-700">
                                <p class="font-bold mb-0.5">
                                    분석 데이터 갱신 알림
                                </p>
                                새로운 산출물 파일이 추가되거나 Figma 연동
                                정보가 변경되면 프로젝트가 재분석됩니다.<br />
                                이 경우,
                                <span class="underline"
                                    >현재 수정한 기능 목록이 초기화되거나
                                    재생성될 수 있습니다.</span
                                >
                            </div>
                        </div>

                        <!-- 추가 입력창 -->
                        <div class="flex items-center gap-2 mb-3">
                            <input
                                v-model="newFeatureInput"
                                @keydown.enter.prevent="addFeature"
                                type="text"
                                class="w-full md:w-1/2 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                placeholder="기능 입력 후 Enter 또는 추가 버튼 클릭"
                            />
                            <button
                                type="button"
                                @click="addFeature"
                                class="btn-secondary px-3 py-2 whitespace-nowrap text-xs"
                            >
                                추가
                            </button>
                        </div>

                        <div class="flex flex-wrap gap-2">
                            <span
                                v-for="(feat, idx) in features"
                                :key="idx"
                                class="inline-flex items-center px-4 py-2 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
                            >
                                {{ feat.name }}
                                <button
                                    type="button"
                                    @click="removeFeature(idx)"
                                    class="ml-2 text-gray-400 hover:text-red-500 focus:outline-none flex items-center"
                                >
                                    <span
                                        class="material-icons-outlined text-[14px]"
                                        >close</span
                                    >
                                </button>
                            </span>
                            <span
                                v-if="features.length === 0"
                                class="text-gray-400 text-xs self-center"
                                >등록된 기능이 없습니다.</span
                            >
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
                        2. 활용 자료 (Files)
                    </h3>
                </div>

                <input
                    ref="fileInput"
                    type="file"
                    class="hidden"
                    @change="handleFileChange"
                />

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div
                        v-for="category in ORDERED_CATEGORIES"
                        :key="category"
                        class="flex flex-col rounded-lg border border-gray-200 bg-white"
                        :class="{
                            'lg:col-span-2': category === SOURCE_TYPES.ETC,
                        }"
                    >
                        <!-- 헤더 (Detail UI + Add Button) -->
                        <div
                            class="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg"
                        >
                            <div class="flex items-center gap-2">
                                <span
                                    class="material-icons-outlined text-gray-400 text-[18px]"
                                    >{{ SOURCE_ICONS[category] }}</span
                                >
                                <span class="text-sm font-bold text-gray-700">{{
                                    SOURCE_LABELS[category]
                                }}</span>
                            </div>
                            <button
                                type="button"
                                @click="triggerFileInput(category)"
                                class="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                            >
                                <span
                                    class="material-icons-outlined text-[14px]"
                                    >add</span
                                >
                                파일 추가
                            </button>
                        </div>

                        <!-- 컨텐츠 -->
                        <div class="p-3 space-y-2 flex-1">
                            <div
                                v-for="(item, index) in artifacts.filter(
                                    (a) => a.source_type === category
                                )"
                                :key="item.id"
                                class="group flex items-center gap-4 bg-white p-2 rounded border border-gray-200 shadow-sm hover:border-indigo-500 transition-all"
                            >
                                <div
                                    class="shrink-0 flex items-center justify-center w-8 h-8 rounded bg-gray-50 border border-gray-100"
                                >
                                    <span
                                        class="material-icons-outlined text-base"
                                        :class="getFileIconColor(item.name)"
                                    >
                                        {{ getFileIcon(item.name) }}
                                    </span>
                                </div>

                                <div class="flex-1 min-w-0 flex flex-col">
                                    <!-- 별칭 수정 -->
                                    <div class="relative group/edit">
                                        <input
                                            v-model="item.name"
                                            type="text"
                                            class="block w-full border-0 border-b border-transparent p-0 pb-0.5 text-sm font-semibold text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-0 transition-colors bg-transparent"
                                            placeholder="파일 별칭 입력"
                                        />
                                        <span
                                            class="absolute right-0 top-0 text-[10px] text-gray-300 pointer-events-none opacity-0 group-hover/edit:opacity-100 transition-opacity"
                                        >
                                            <span
                                                class="material-icons-outlined text-[10px] align-middle mr-0.5"
                                                >edit</span
                                            >
                                            수정 가능
                                        </span>
                                    </div>

                                    <!-- 파일 정보 (원본명 + 용량 + New배지) -->
                                    <div class="flex items-center gap-1.5 mt-1">
                                        <span
                                            class="material-icons-outlined text-[10px] text-gray-400"
                                            >attach_file</span
                                        >
                                        <span
                                            class="text-[11px] text-gray-400 truncate max-w-[200px]"
                                        >
                                            {{
                                                item.file
                                                    ? item.file.name
                                                    : item.file_name || "-"
                                            }}
                                        </span>
                                        <span
                                            v-if="item.file"
                                            class="text-[10px] text-green-600 font-bold ml-1"
                                            >New</span
                                        >
                                        <span
                                            class="text-[10px] text-gray-300"
                                            >{{
                                                formatFileSize(item.file_size)
                                            }}</span
                                        >
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    @click="
                                        removeArtifactRow(
                                            artifacts.indexOf(item)
                                        )
                                    "
                                    class="shrink-0 text-gray-300 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50"
                                    title="삭제"
                                >
                                    <span
                                        class="material-icons-outlined text-lg"
                                        >close</span
                                    >
                                </button>
                            </div>
                            <div
                                v-if="
                                    artifacts.filter(
                                        (a) => a.source_type === category
                                    ).length === 0
                                "
                                class="text-center py-4"
                            >
                                <span class="text-xs text-gray-400 italic"
                                    >등록된 파일이 없습니다.</span
                                >
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. 외부 시스템 (Figma) -->
            <div>
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
                        class="flex items-center p-4 rounded-lg border border-gray-200 bg-white shadow-sm transition-all"
                        :class="
                            externalSystems.find(
                                (s) => s.system_type === 'figma'
                            )?.enabled
                                ? 'border-indigo-200 ring-1 ring-indigo-100'
                                : 'border-gray-200'
                        "
                    >
                        <div
                            class="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg bg-purple-50 text-purple-700"
                        >
                            F
                        </div>
                        <div class="ml-4 flex-1">
                            <div class="flex justify-between items-center">
                                <h4
                                    class="text-base font-semibold text-gray-900"
                                >
                                    FIGMA
                                </h4>
                                <!-- 토글 -->
                                <div
                                    class="custom-toggle"
                                    :class="
                                        externalSystems.find(
                                            (s) => s.system_type === 'figma'
                                        )?.enabled
                                            ? 'custom-toggle-active'
                                            : 'custom-toggle-inactive'
                                    "
                                    @click="toggleExternalSystem('figma')"
                                >
                                    <span
                                        class="custom-toggle-circle"
                                        :class="
                                            externalSystems.find(
                                                (s) => s.system_type === 'figma'
                                            )?.enabled
                                                ? 'custom-toggle-circle-on'
                                                : 'custom-toggle-circle-off'
                                        "
                                    />
                                </div>
                            </div>
                            <div class="flex flex-col mt-2">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center">
                                        <span
                                            class="h-2 w-2 rounded-full mr-2"
                                            :class="
                                                externalSystems.find(
                                                    (s) =>
                                                        s.system_type ===
                                                        'figma'
                                                )?.enabled
                                                    ? 'bg-green-500'
                                                    : 'bg-gray-300'
                                            "
                                        ></span>
                                        <p class="text-xs text-gray-500">
                                            <span
                                                v-if="
                                                    !externalSystems.find(
                                                        (s) =>
                                                            s.system_type ===
                                                            'figma'
                                                    )?.enabled
                                                "
                                                >사용 안함</span
                                            >
                                            <span v-else>
                                                {{
                                                    externalSystems.find(
                                                        (s) =>
                                                            s.system_type ===
                                                            "figma"
                                                    )?.status === "completed"
                                                        ? "연동됨"
                                                        : "설정 필요"
                                                }}
                                            </span>
                                        </p>
                                    </div>
                                    <!-- 재설정 버튼 -->
                                    <button
                                        v-if="
                                            externalSystems.find(
                                                (s) => s.system_type === 'figma'
                                            )?.enabled
                                        "
                                        type="button"
                                        @click="openReauthPopup('figma')"
                                        class="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium underline"
                                    >
                                        연동 갱신
                                    </button>
                                </div>
                                <p
                                    v-if="
                                        externalSystems.find(
                                            (s) => s.system_type === 'figma'
                                        )?.enabled &&
                                        externalSystems.find(
                                            (s) => s.system_type === 'figma'
                                        )?.status !== 'completed'
                                    "
                                    class="text-[10px] text-orange-500 mt-1"
                                >
                                    * 연동 정보 설정이 필요합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- 하단 버튼 (이동됨) -->
            <div
                class="mt-8 flex items-center justify-end gap-3 border-t border-gray-100 pt-6"
            >
                <button @click="goBack" class="btn-secondary">취소</button>
                <button
                    type="button"
                    @click="handleSubmit"
                    class="btn-primary flex items-center gap-1"
                >
                    <span class="material-icons-outlined text-sm">save</span>
                    수정 완료
                </button>
            </div>
        </section>

        <!-- Figma 설정 팝업 -->
        <div
            v-if="activeExternalPopup && activeExternalSystem"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
            <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h3 class="text-base font-bold text-gray-900">
                    {{ activeExternalSystem.label }} 연동 설정
                </h3>
                <p class="mt-1 text-xs text-gray-500">
                    접근 가능한 URL과 PAT를 입력하여 연동을 확인해주세요.
                </p>

                <div class="mt-5 space-y-4">
                    <div>
                        <label
                            class="block text-xs font-semibold text-gray-700 mb-1"
                            >URL</label
                        >
                        <input
                            v-model="activeExternalSystem.url"
                            type="text"
                            placeholder="https://www.figma.com/file/..."
                            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label
                            class="block text-xs font-semibold text-gray-700 mb-1"
                            >Personal Access Token (PAT)</label
                        >
                        <input
                            v-model="activeExternalSystem.pat"
                            type="password"
                            placeholder="PAT 입력 (필수)"
                            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div class="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        class="btn-secondary text-xs!"
                        @click="cancelExternalPopup"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        class="btn-primary text-xs!"
                        @click="saveExternalConfig"
                    >
                        연동 확인 및 저장
                    </button>
                </div>
                <div
                    v-if="popupError"
                    class="mt-2 rounded-md bg-red-50 px-3 py-2"
                >
                    <p class="text-xs text-red-600">{{ popupError }}</p>
                </div>
            </div>
        </div>

        <!-- 저장 상태 오버레이 -->
        <div
            v-if="saveStatus !== 'idle'"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
            <div
                class="flex min-w-[260px] flex-col items-center gap-3 rounded-lg bg-white px-6 py-5 text-center shadow-lg"
            >
                <div
                    v-if="saveStatus === 'saving'"
                    class="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
                />
                <div
                    v-else
                    class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100"
                >
                    <span
                        class="material-icons-outlined text-green-600 text-2xl"
                        >check</span
                    >
                </div>
                <p class="mt-1 text-sm text-gray-800">
                    {{
                        saveStatus === "saving"
                            ? "변경사항을 저장하고 있습니다..."
                            : "저장이 완료되었습니다!"
                    }}
                </p>
            </div>
        </div>
    </main>
</template>
