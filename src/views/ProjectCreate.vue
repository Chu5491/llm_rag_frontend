<script setup lang="ts">
import {ref, computed, onUnmounted} from "vue";
import {useRouter} from "vue-router";
import {checkFigmaPersist, createProject} from "../services/api.js";

import type {
    ArtifactItem,
    ExternalSystemItem,
    ProjectBase,
    ProjectCreate,
    ArtifactCreate,
    ExternalSystemCreate,
} from "../types/project.js";
import {getFileIcon, getFileIconColor} from "../utils/fileIcons.js";

const router = useRouter();

// === 저장 상태 ===
// idle  : 평상시
// saving: 5초 동안 임베딩/저장 중
// done  : 1~1.5초 정도 완료 화면
const saveStatus = ref<"idle" | "saving" | "done">("idle");
let saveTimer: number | undefined;
let redirectTimer: number | undefined;

// 1. 프로젝트 기본 정보
// 1. 프로젝트 기본 정보
const projectBase = ref<ProjectBase>({
    name: "",
    service_type: "",
    description: "",
});

// 추가 필드 (UI 전용, 백엔드 미지원 시 임시 상태)

// 5가지 고정 카테고리
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

// 산출물 목록 (ArtifactItem 확장)
const artifacts = ref<ArtifactItem[]>([]);

let nextArtifactId = 1;

const removeArtifactRow = (id?: number) => {
    if (id === undefined) return;
    artifacts.value = artifacts.value.filter((row) => row.id !== id);
};

// 파일 선택 처리
const fileInput = ref<HTMLInputElement | null>(null);
const targetCategory = ref<string | null>(null);

const triggerFileInput = (category: string) => {
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
        artifact_type: targetCategory.value,
        name: file.name,
        has_file: true,
        file: file,
        selected: true,
    });

    targetCategory.value = null;
};

const removeFile = (artifactId?: number) => {
    if (artifactId === undefined) return;
    const artifact = artifacts.value.find((a) => a.id === artifactId);
    if (artifact) {
        artifact.file = undefined;
        artifact.has_file = false;
    }
};

/* 외부 시스템 타입 정의 - ExternalSystemItem 사용 */
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

/* 현재 팝업에 열려 있는 시스템 id */
const activeExternalPopup = ref<ExternalSystemId | null>(null);

/* 팝업에서 사용하는 시스템 객체 */
const activeExternalSystem = computed(
    () =>
        externalSystems.value.find(
            (s) => s.system_type === activeExternalPopup.value
        ) ?? null
);

/* 팝업 내 에러 메시지 */
const popupError = ref<string | null>(null);

/* 카드 오른쪽 토글 클릭 시 */
const toggleExternalSystem = (id: ExternalSystemId) => {
    const system = externalSystems.value.find((s) => s.system_type === id);
    if (!system) return;

    // off → on 되는 순간에만 팝업 띄우기
    if (!system.enabled) {
        system.enabled = true;
        activeExternalPopup.value = id;
    } else {
        // 다시 끌 때는 단순 off
        system.enabled = false;
    }
};

/* 팝업에서 취소 */
const cancelExternalPopup = () => {
    // 취소 시 enable을 끌지 말지 선택 가능 (여기선 끄는 쪽으로 처리)
    if (activeExternalSystem.value) {
        activeExternalSystem.value.enabled = false;
    }
    activeExternalPopup.value = null;
};

/* 팝업에서 저장 */
const saveExternalConfig = async () => {
    const system = activeExternalSystem.value;
    if (!system) return;

    popupError.value = null;

    if (system.system_type === "figma") {
        try {
            const data = await checkFigmaPersist(system.url, system.pat);
            console.log("Figma 연결 성공:", data);

            system.status = "connected";
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
    if (saveStatus.value !== "idle") return; // 저장 중/완료 표시 중에는 취소 막기
    projectBase.value.name = "";
    projectBase.value.service_type = "";
    projectBase.value.description = "";
    router.push("/project");
};

const handleSubmit = async () => {
    if (saveStatus.value !== "idle") return;

    // 1단계: 저장 중 상태로
    saveStatus.value = "saving";

    try {
        // UI용 필드 제거 및 데이터 정제
        const payload: ProjectCreate = {
            name: projectBase.value.name,
            description: projectBase.value.description,
            service_type: projectBase.value.service_type,
            artifacts: artifacts.value.map((a) => ({
                artifact_type: a.artifact_type,
                name: a.name,
                has_file: a.has_file,
                file: a.file,
            })),
            external_systems: externalSystems.value.map((e) => ({
                system_type: e.system_type,
                url: e.url,
                enabled: e.enabled,
            })),
        };

        // API 호출
        await createProject(payload);

        // 2단계: 완료 상태로 전환
        saveStatus.value = "done";

        // 1.5초 정도 완료 표시해준 뒤 목록으로 이동
        redirectTimer = window.setTimeout(() => {
            saveStatus.value = "idle";
            router.push("/project");
        }, 1500);
    } catch (error) {
        console.error("프로젝트 생성 실패:", error);
        alert("프로젝트 생성에 실패했습니다. 다시 시도해주세요.");
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
        <!-- Header Section -->
        <header class="flex justify-between items-start">
            <div>
                <p class="mt-1 text-sm text-gray-500">
                    새로운 프로젝트 정보를 입력하여 등록하세요.
                </p>
            </div>
        </header>

        <!-- Main Content -->
        <section class="rounded-lg bg-white p-6 shadow space-y-8">
            <form class="space-y-8" @submit.prevent>
                <!-- 1. Basic Info Section -->
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

                <!-- 2. Arifacts Section -->
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
                            v-for="category in ARTIFACT_CATEGORIES"
                            :key="category"
                            class="flex flex-col rounded-lg border border-gray-200 bg-white"
                            :class="{'lg:col-span-2': category === '기타 자료'}"
                        >
                            <div
                                class="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg"
                            >
                                <div class="flex items-center gap-2">
                                    <span
                                        class="material-icons-outlined text-gray-400 text-[18px]"
                                        >{{ categoryIcons[category] }}</span
                                    >
                                    <span
                                        class="text-sm font-bold text-gray-700"
                                        >{{ category }}</span
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
                                        (a) => a.artifact_type === category
                                    )"
                                    :key="item.id"
                                    class="group flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2 rounded border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors"
                                >
                                    <div
                                        class="flex-1 min-w-0 flex items-center gap-2"
                                    >
                                        <span
                                            class="material-icons-outlined text-sm"
                                            :class="
                                                getFileIconColor(
                                                    item.file?.name
                                                )
                                            "
                                            >{{
                                                getFileIcon(item.file?.name)
                                            }}</span
                                        >
                                        <div class="flex flex-col min-w-0">
                                            <span
                                                class="text-xs text-gray-600 truncate"
                                                >{{
                                                    item.file?.name ||
                                                    "파일 없음"
                                                }}</span
                                            >
                                            <span
                                                v-if="item.file"
                                                class="text-[10px] text-gray-400"
                                            >
                                                {{
                                                    formatFileSize(
                                                        item.file.size
                                                    )
                                                }}
                                            </span>
                                        </div>
                                    </div>

                                    <input
                                        v-model="item.name"
                                        type="text"
                                        class="w-full sm:w-1/3 text-xs px-2 py-1.5 rounded border border-gray-300 text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                                        placeholder="파일 별칭"
                                    />

                                    <div class="flex justify-end sm:block">
                                        <button
                                            class="text-gray-400 hover:text-red-500 transition-colors p-1"
                                            title="삭제"
                                            type="button"
                                            @click="removeArtifactRow(item.id)"
                                        >
                                            <span
                                                class="material-icons-outlined text-[18px]"
                                                >close</span
                                            >
                                        </button>
                                    </div>
                                </div>

                                <!-- 파일 목록이 없는 경우 -->
                                <div
                                    v-if="
                                        artifacts.filter(
                                            (a) => a.artifact_type === category
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

                <!-- 3. External Systems Section -->
                <div>
                    <h3 class="text-lg font-medium text-gray-900 mb-4">
                        3. 활용 시스템
                    </h3>
                    <div class="grid grid-cols-1 gap-4">
                        <!-- Figma (Using ProjectDetail style) -->
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
                                    <!-- Toggle -->
                                    <label
                                        class="relative inline-flex items-center cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            class="sr-only peer"
                                            :checked="
                                                externalSystems.find(
                                                    (s) =>
                                                        s.system_type ===
                                                        'figma'
                                                )?.enabled
                                            "
                                            @change="
                                                toggleExternalSystem('figma')
                                            "
                                        />
                                        <div
                                            class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"
                                        ></div>
                                    </label>
                                </div>
                                <p class="text-xs text-gray-500 mt-1">
                                    디자인 산출물을 기반으로 테스트케이스를
                                    생성합니다.
                                </p>

                                <!-- Figma Status -->
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
                                            )?.status !== 'connected'
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

                <!-- Bottom Buttons -->
                <div
                    class="flex justify-end gap-3 pt-6 border-t border-gray-100"
                >
                    <button
                        type="button"
                        class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        @click="handleCancel"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                        class="rounded-md border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        @click="cancelExternalPopup"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        class="rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
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
