<script setup lang="ts">
import {ref, computed, onUnmounted} from "vue";
import {useRouter} from "vue-router";
import {checkFigmaPersist, createProject} from "../services/api.js";
import {useAlert} from "../composables/useAlert.js";

import {
    ArtifactItem,
    ExternalSystemItem,
    ProjectBase,
    ProjectCreate,
    SourceType,
    SOURCE_TYPES,
    SOURCE_LABELS,
    SOURCE_ICONS,
} from "../types/project.js";
import {getFileIcon, getFileIconColor} from "../utils/fileIcons.js";

const router = useRouter();
const {showAlert} = useAlert();

// 저장 상태 (idle, saving, done)
const saveStatus = ref<"idle" | "saving" | "done">("idle");
let saveTimer: number | undefined;
let redirectTimer: number | undefined;

// 프로젝트 기본 정보
const projectBase = ref<ProjectBase>({
    name: "",
    service_type: "",
    description: "",
});

// 카테고리 표시 순서
const ORDERED_CATEGORIES: SourceType[] = [
    SOURCE_TYPES.REQUIREMENTS,
    SOURCE_TYPES.SCREEN_DESIGN,
    SOURCE_TYPES.API_SPEC,
    SOURCE_TYPES.MANUAL,
    SOURCE_TYPES.ETC,
];

// 산출물 목록
const artifacts = ref<ArtifactItem[]>([]);

let nextArtifactId = 1;

const removeArtifactRow = (id?: number) => {
    if (id === undefined) return;
    artifacts.value = artifacts.value.filter((row) => row.id !== id);
};

// 파일 선택 처리
const fileInput = ref<HTMLInputElement | null>(null);
const targetCategory = ref<SourceType | null>(null);

const triggerFileInput = (category: SourceType) => {
    if (!fileInput.value) return;
    targetCategory.value = category;
    fileInput.value.value = ""; // 초기화
    fileInput.value.click();
};

const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0 || !targetCategory.value) {
        return;
    }

    const file = target.files[0];

    // 새 행 추가
    artifacts.value.push({
        id: nextArtifactId++,
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

// 외부 시스템 정의
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

// 외부 연동 팝업 상태
const activeExternalPopup = ref<ExternalSystemId | null>(null);

// 팝업용 활성 시스템 객체
const activeExternalSystem = computed(
    () =>
        externalSystems.value.find(
            (s) => s.system_type === activeExternalPopup.value
        ) ?? null
);

// 팝업 에러 메시지
const popupError = ref<string | null>(null);

// 외부 시스템 토글 처리
const toggleExternalSystem = (id: ExternalSystemId) => {
    const system = externalSystems.value.find((s) => s.system_type === id);
    if (!system) return;

    // Off -> On: 팝업 오픈
    if (!system.enabled) {
        system.enabled = true;
        activeExternalPopup.value = id;
    } else {
        // On -> Off: 즉시 비활성화
        system.enabled = false;
    }
};

// 팝업 취소
const cancelExternalPopup = () => {
    // 취소 시 enable을 끌지 말지 선택 가능 (여기선 끄는 쪽으로 처리)
    if (activeExternalSystem.value) {
        activeExternalSystem.value.enabled = false;
    }
    activeExternalPopup.value = null;
};

// 외부 연동 설정 저장 (연결 확인)
const saveExternalConfig = async () => {
    const system = activeExternalSystem.value;
    if (!system) return;

    popupError.value = null;

    if (system.system_type === "figma") {
        try {
            const data = await checkFigmaPersist(system.url, system.pat);
            console.log("Figma 연결 성공:", data);

            system.status = "completed";
            popupError.value = null;
            activeExternalPopup.value = null; // 팝업 닫기
        } catch (e: any) {
            popupError.value =
                e?.message ?? "Figma 연동 중 알 수 없는 오류가 발생했습니다.";
            system.status = "error";
        }
    } else {
        activeExternalPopup.value = null;
    }
};

const handleCancel = () => {
    if (saveStatus.value !== "idle") return; // 저장 중일 때 취소 방지
    projectBase.value.name = "";
    projectBase.value.service_type = "";
    projectBase.value.description = "";
    router.push("/project");
};

const handleSubmit = async () => {
    if (saveStatus.value !== "idle") return;

    // 1. 저장 중 상태 전환
    saveStatus.value = "saving";

    try {
        // UI 필드 제거 및 데이터 정제
        const payload: ProjectCreate = {
            name: projectBase.value.name,
            description: projectBase.value.description,
            service_type: projectBase.value.service_type,
            artifacts: artifacts.value.map((a) => ({
                source_type: a.source_type,
                name: a.name,
                file_name: a.file_name,
                has_file: a.has_file,
                file: a.file,
                file_size: a.file_size,
            })),
            external_systems: externalSystems.value.map((e) => ({
                system_type: e.system_type,
                url: e.url,
                pat: e.pat,
                enabled: e.enabled,
            })),
        };

        // API 호출
        await createProject(payload);

        // 2. 완료 상태 전환
        saveStatus.value = "done";

        // 1.5초 후 목록 이동
        redirectTimer = window.setTimeout(() => {
            saveStatus.value = "idle";
            router.push("/project");
        }, 1500);
    } catch (error) {
        console.error("프로젝트 생성 실패:", error);
        showAlert("프로젝트 생성에 실패했습니다. 다시 시도해주세요.", "오류");
        saveStatus.value = "idle";
    }
};

onUnmounted(() => {
    if (saveTimer !== undefined) clearTimeout(saveTimer);
    if (redirectTimer !== undefined) clearTimeout(redirectTimer);
});

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
</script>

<template>
    <main class="p-6 space-y-6">
        <!-- 헤더 영역 -->
        <header class="flex justify-between items-start">
            <div>
                <p class="mt-1 text-sm text-gray-500">
                    새로운 프로젝트 정보를 입력하여 등록하세요.
                </p>
            </div>
        </header>

        <!-- 메인 컨텐츠 -->
        <section class="rounded-lg bg-white p-6 shadow space-y-8">
            <form class="space-y-8" @submit.prevent>
                <!-- 1. 기본 정보 -->
                <div>
                    <h3 class="text-lg font-medium text-gray-900 mb-4">
                        1. 프로젝트 기본 정보
                    </h3>
                    <div
                        class="bg-gray-50 p-5 rounded-lg border border-gray-100"
                    >
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-4">
                                <div>
                                    <label
                                        class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                                    >
                                        프로젝트 명
                                        <span class="text-red-500">*</span>
                                    </label>
                                    <input
                                        v-model="projectBase.name"
                                        type="text"
                                        class="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        placeholder="프로젝트 명을 입력하세요"
                                    />
                                </div>
                                <div>
                                    <label
                                        class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                                    >
                                        서비스 유형
                                    </label>
                                    <select
                                        v-model="projectBase.service_type"
                                        class="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    >
                                        <option value="" disabled selected>
                                            선택하세요
                                        </option>
                                        <option value="PC Web">PC Web</option>
                                        <option value="Mobile Web">
                                            Mobile Web
                                        </option>
                                        <option value="Ios">Ios</option>
                                        <option value="Android">Android</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label
                                    class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                                >
                                    프로젝트 설명
                                    <span class="text-red-500">*</span>
                                </label>
                                <textarea
                                    v-model="projectBase.description"
                                    rows="5"
                                    class="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm resize-none"
                                    placeholder="설명을 입력하세요"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. 산출물 영역 -->
                <div>
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-medium text-gray-900">
                            2. 활용 자료
                        </h3>
                        <span class="text-xs text-gray-500 font-normal"
                            >각 카테고리에 맞는 파일을 등록해주세요.</span
                        >
                    </div>

                    <!-- 숨겨진 파일 입력 -->
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
                            <div
                                class="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg"
                            >
                                <div class="flex items-center gap-2">
                                    <span
                                        class="material-icons-outlined text-gray-400 text-[18px]"
                                        >{{ SOURCE_ICONS[category] }}</span
                                    >
                                    <span
                                        class="text-sm font-bold text-gray-700"
                                        >{{ SOURCE_LABELS[category] }}</span
                                    >
                                </div>
                                <button
                                    type="button"
                                    class="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                    @click="triggerFileInput(category)"
                                >
                                    <span
                                        class="material-icons-outlined text-[14px]"
                                        >add</span
                                    >
                                    파일 추가
                                </button>
                            </div>

                            <div class="p-3 space-y-2 flex-1">
                                <!-- 파일 목록이 있는 경우 -->
                                <div
                                    v-for="item in artifacts.filter(
                                        (a) => a.source_type === category
                                    )"
                                    :key="item.id"
                                    class="group flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-500 transition-all"
                                >
                                    <!-- 아이콘 -->
                                    <div
                                        class="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 border border-gray-100"
                                    >
                                        <span
                                            class="material-icons-outlined text-xl"
                                            :class="
                                                getFileIconColor(
                                                    item.file?.name
                                                )
                                            "
                                        >
                                            {{ getFileIcon(item.file?.name) }}
                                        </span>
                                    </div>

                                    <!-- 파일 정보 및 수정 -->
                                    <div class="flex-1 min-w-0 flex flex-col">
                                        <!-- 별칭 수정 -->
                                        <div class="relative">
                                            <input
                                                v-model="item.name"
                                                type="text"
                                                class="block w-full border-0 border-b border-transparent p-0 pb-0.5 text-sm font-semibold text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-0 transition-colors bg-transparent"
                                                placeholder="파일 별칭 입력"
                                            />
                                            <span
                                                class="absolute right-0 top-0 text-[10px] text-gray-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <span
                                                    class="material-icons-outlined text-[10px] align-middle mr-0.5"
                                                    >edit</span
                                                >
                                                수정 가능
                                            </span>
                                        </div>

                                        <!-- 원본 파일 정보 -->
                                        <div
                                            class="flex items-center gap-1.5 mt-1"
                                        >
                                            <span
                                                class="material-icons-outlined text-[10px] text-gray-400"
                                                >attach_file</span
                                            >
                                            <span
                                                class="text-[11px] text-gray-400 truncate"
                                            >
                                                {{ item.file?.name }}
                                            </span>
                                            <span
                                                class="text-[10px] text-gray-300"
                                            >
                                                {{
                                                    formatFileSize(
                                                        item.file?.size || 0
                                                    )
                                                }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- 삭제 버튼 -->
                                    <button
                                        class="shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50"
                                        title="삭제"
                                        type="button"
                                        @click="removeArtifactRow(item.id)"
                                    >
                                        <span
                                            class="material-icons-outlined text-xl"
                                            >close</span
                                        >
                                    </button>
                                </div>

                                <!-- 파일 목록이 없는 경우 -->
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

                <!-- 3. 외부 시스템 영역 -->
                <div>
                    <h3 class="text-lg font-medium text-gray-900 mb-4">
                        3. 활용 시스템
                    </h3>
                    <div class="grid grid-cols-1 gap-4">
                        <!-- Figma 카드 -->
                        <div
                            class="flex items-center p-4 rounded-lg border border-gray-200 hover:border-indigo-500 bg-white shadow-sm transition-all"
                        >
                            <div
                                class="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg bg-purple-50 text-purple-700"
                            >
                                Fg
                            </div>
                            <div class="ml-4 flex-1">
                                <div class="flex justify-between items-center">
                                    <h4
                                        class="text-base font-semibold text-gray-900"
                                    >
                                        Figma
                                    </h4>
                                    <!-- 토글 스위치 -->
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
                                                    (s) =>
                                                        s.system_type ===
                                                        'figma'
                                                )?.enabled
                                                    ? 'custom-toggle-circle-on'
                                                    : 'custom-toggle-circle-off'
                                            "
                                        />
                                    </div>
                                </div>
                                <p class="text-xs text-gray-500 mt-1">
                                    디자인 산출물을 기반으로 테스트케이스를
                                    생성합니다.
                                </p>

                                <!-- 연결 상태 -->
                                <div
                                    v-if="
                                        externalSystems.find(
                                            (s) => s.system_type === 'figma'
                                        )?.enabled
                                    "
                                    class="mt-2"
                                >
                                    <div
                                        v-if="
                                            externalSystems.find(
                                                (s) => s.system_type === 'figma'
                                            )?.status !== 'completed'
                                        "
                                        class="text-xs text-orange-500"
                                    >
                                        * 연동 정보 설정이 필요합니다.
                                    </div>
                                    <div
                                        v-else
                                        class="text-xs text-green-600 truncate"
                                    >
                                        연결됨:
                                        {{
                                            externalSystems.find(
                                                (s) => s.system_type === "figma"
                                            )?.url
                                        }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 하단 버튼 -->
                <div
                    class="flex justify-end gap-3 pt-6 border-t border-gray-100"
                >
                    <button
                        type="button"
                        class="btn-secondary"
                        @click="handleCancel"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        class="btn-primary"
                        @click="handleSubmit"
                    >
                        <span class="material-icons-outlined text-lg mr-1"
                            >check</span
                        >
                        등록하기
                    </button>
                </div>
            </form>
        </section>

        <!-- 외부 시스템 설정 팝업 -->
        <div
            v-if="activeExternalPopup && activeExternalSystem"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
            <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <h3 class="text-base font-bold text-gray-900">
                    {{ activeExternalSystem.label }} 연동 정보
                </h3>
                <p class="mt-1 text-xs text-gray-500">
                    접근 가능한 URL과 Personal Access Token(PAT)을 입력해주세요.
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
                            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                            placeholder="토큰 값을 입력하세요"
                            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <p class="mt-1 text-[11px] text-gray-400">
                            실제 서비스에서는 안전한 저장소에 암호화하여
                            보관해야 합니다.
                        </p>
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
                        저장
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
                            ? "데이터 저장 및 임베딩 작업을 진행하고 있습니다..."
                            : "저장이 완료되었습니다! 프로젝트 목록으로 이동합니다."
                    }}
                </p>
            </div>
        </div>
    </main>
</template>
