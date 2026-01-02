<script setup lang="ts">
import {ref, computed, onUnmounted} from "vue";
import {useRouter} from "vue-router";
import {checkFigmaPersist, createProject} from "../services/api.js";

import type {
    ArtifactItem,
    ExternalSystemItem,
    ProjectCreate,
} from "../types/project.js";

const router = useRouter();

// === 저장 상태 ===
// idle  : 평상시
// saving: 5초 동안 임베딩/저장 중
// done  : 1~1.5초 정도 완료 화면
const saveStatus = ref<"idle" | "saving" | "done">("idle");
let saveTimer: number | undefined;
let redirectTimer: number | undefined;

// 1. 프로젝트 기본 정보
const projectBase = ref({
    name: "",
    description: "",
});

// 산출물 타입 선택
const artifactType = ref("화면설계서");

// 산출물 목록 (ArtifactItem 확장)
const artifacts = ref<ArtifactItem[]>([
    {
        id: 1,
        artifact_type: "요구사항정의서",
        name: "",
        has_file: false,
        selected: true,
    },
    {
        id: 2,
        artifact_type: "화면설계서",
        name: "",
        has_file: false,
        selected: true,
    },
    {
        id: 3,
        artifact_type: "이외",
        name: "",
        has_file: false,
        selected: true,
    },
]);

let nextArtifactId = 4;

const addArtifactRow = () => {
    artifacts.value.push({
        id: nextArtifactId++,
        artifact_type: artifactType.value,
        name: "",
        has_file: false,
        selected: true,
    });
};

const removeArtifactRow = (id?: number) => {
    if (id === undefined) return;
    artifacts.value = artifacts.value.filter((row) => row.id !== id);
};

// 파일 선택 처리
const fileInput = ref<HTMLInputElement | null>(null);
const currentArtifactId = ref<number | null>(null);

const triggerFileInput = (artifactId?: number) => {
    if (artifactId === undefined || !fileInput.value) return;
    currentArtifactId.value = artifactId;
    fileInput.value.value = ""; // 초기화하여 같은 파일 다시 선택 가능하게 함
    fileInput.value.click();
};

const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (
        !target.files ||
        target.files.length === 0 ||
        currentArtifactId.value === null
    ) {
        return;
    }

    const file = target.files[0];
    const artifactIndex = artifacts.value.findIndex(
        (a) => a.id === currentArtifactId.value
    );

    if (artifactIndex !== -1) {
        artifacts.value[artifactIndex].file = file;
        artifacts.value[artifactIndex].has_file = true;
        // 파일명이 너무 길면 잘라서 표시할 수도 있음, 여기선 전체 저장
        // artifacts.value[artifactIndex].name = file.name; // 필요 시 이름도 자동 채움
    }

    currentArtifactId.value = null;
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
type ExternalSystemId = "jira" | "figma";

const externalSystems = ref<ExternalSystemItem[]>([
    {
        system_type: "jira",
        label: "Jira",
        description: "이슈/티켓 관리용 Jira 프로젝트를 연동합니다.",
        enabled: false,
        pat: "",
        url: "",
        status: "idle",
    },
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
            const data = await checkFigmaPersist();
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
            artifacts: artifacts.value.map((a) => ({
                artifact_type: a.artifact_type,
                name: a.name,
                has_file: a.has_file,
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
</script>

<template>
    <!-- 목록 뷰랑 맞춘 공통 레이아웃 -->
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 -->
        <header class="flex items-center justify-between">
            <div>
                <p class="mt-1 text-sm text-gray-500">
                    새로운 프로젝트를 등록하고 테스트케이스 생성에 사용할 정보를
                    입력합니다.
                </p>
            </div>
        </header>

        <section class="rounded-lg bg-white p-6 shadow space-y-6">
            <form class="space-y-12" @submit.prevent="handleSubmit">
                <section class="space-y-4">
                    <label class="block text-lg font-medium text-slate-800">
                        1. 프로젝트 이름이 무엇인가요?
                    </label>
                    <input
                        v-model="projectBase.name"
                        type="text"
                        placeholder="프로젝트 명"
                        class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </section>

                <section class="space-y-4">
                    <label class="block text-lg font-medium text-slate-800">
                        2. 프로젝트를 간단하게 설명해주세요
                    </label>
                    <textarea
                        v-model="projectBase.description"
                        rows="5"
                        placeholder="프로젝트 설명"
                        class="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </section>

                <section class="space-y-4">
                    <label class="block text-lg font-medium text-slate-800">
                        3. 프로젝트에 참고할 수 있는 산출물을 첨부해주세요
                    </label>

                    <!-- 산출물 타입 선택 + 추가 버튼 -->
                    <div class="mb-4 flex items-start gap-4">
                        <div class="relative w-48">
                            <select
                                v-model="artifactType"
                                class="w-full rounded-md border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="화면설계서">화면설계서</option>
                                <option value="요구사항정의서">
                                    요구사항정의서
                                </option>
                                <option value="이외">이외</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white transition-opacity hover:opacity-90"
                            @click="addArtifactRow"
                        >
                            <span class="material-icons-outlined text-xl"
                                >+</span
                            >
                        </button>
                    </div>

                    <!-- 숨겨진 파일 입력 -->
                    <input
                        ref="fileInput"
                        type="file"
                        class="hidden"
                        @change="handleFileChange"
                    />

                    <!-- 산출물 테이블 -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm">
                            <thead
                                class="border-b border-slate-200 text-xs font-medium uppercase text-slate-500"
                            >
                                <tr>
                                    <th
                                        scope="col"
                                        class="px-4 py-3 font-medium"
                                    >
                                        산출물 구분
                                    </th>
                                    <th
                                        scope="col"
                                        class="px-4 py-3 font-medium"
                                    >
                                        산출물 명
                                    </th>
                                    <th
                                        scope="col"
                                        class="w-24 px-4 py-3 font-medium"
                                    >
                                        파일 첨부
                                    </th>
                                    <th
                                        scope="col"
                                        class="w-12 px-4 py-3 font-medium"
                                    />
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-200">
                                <tr
                                    v-for="row in artifacts"
                                    :key="row.id"
                                    class="transition-colors hover:bg-slate-50"
                                >
                                    <td
                                        class="px-4 py-4 font-medium text-slate-700"
                                    >
                                        {{ row.artifact_type }}
                                    </td>
                                    <td class="px-4 py-4 text-slate-600">
                                        <input
                                            v-model="row.name"
                                            type="text"
                                            class="w-full rounded-md border border-transparent bg-transparent px-0 py-1 text-sm text-slate-700 focus:border-blue-400 focus:bg-white focus:px-2 focus:outline-none"
                                            placeholder="산출물 이름을 입력하세요"
                                        />
                                    </td>
                                    <td class="px-4 py-4">
                                        <div class="flex items-center gap-2">
                                            <button
                                                v-if="!row.has_file"
                                                type="button"
                                                class="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600"
                                                @click="
                                                    triggerFileInput(row.id)
                                                "
                                            >
                                                <span>파일 선택</span>
                                            </button>
                                            <div
                                                v-else
                                                class="flex items-center gap-1"
                                            >
                                                <span
                                                    class="max-w-[150px] truncate text-[15px] text-slate-700 underline decoration-slate-400 underline-offset-2"
                                                >
                                                    {{
                                                        row.file?.name ||
                                                        "첨부된 파일"
                                                    }}
                                                </span>
                                                <button
                                                    type="button"
                                                    class="text-slate-400 hover:text-red-500"
                                                    @click="removeFile(row.id)"
                                                >
                                                    <span
                                                        class="material-icons-outlined"
                                                        >close</span
                                                    >
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-4 py-4 text-right">
                                        <button
                                            type="button"
                                            class="text-xl font-bold leading-none text-slate-400 hover:text-red-500"
                                            @click="removeArtifactRow(row.id)"
                                        >
                                            −
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- 4. 외부 시스템 -->
                <section class="space-y-4">
                    <label class="block text-lg font-medium text-slate-800">
                        4. 프로젝트에 대해 참고할 수 있는 접근 가능한 외부
                        시스템이 있나요?
                    </label>

                    <!-- 카드 2개: Jira / Figma -->
                    <div class="grid gap-4 md:grid-cols-2">
                        <article
                            v-for="ext in externalSystems"
                            :key="ext.system_type"
                            class="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                        >
                            <div class="flex items-start gap-3">
                                <!-- 아이콘 -->
                                <div
                                    class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                                    :class="
                                        ext.system_type === 'jira'
                                            ? 'bg-blue-600'
                                            : 'bg-violet-500'
                                    "
                                >
                                    <span v-if="ext.system_type === 'jira'"
                                        >Jr</span
                                    >
                                    <span v-else>Fg</span>
                                </div>

                                <!-- 타이틀 + 설명 -->
                                <div class="flex-1">
                                    <h3
                                        class="text-sm font-semibold text-slate-900"
                                    >
                                        {{ ext.label }}
                                    </h3>
                                    <p class="mt-1 text-xs text-slate-500">
                                        {{ ext.description }}
                                    </p>
                                </div>

                                <!-- 토글 스위치 -->
                                <button
                                    type="button"
                                    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                    :class="
                                        ext.enabled
                                            ? 'bg-emerald-500'
                                            : 'bg-slate-300'
                                    "
                                    @click="
                                        toggleExternalSystem(ext.system_type)
                                    "
                                >
                                    <span
                                        class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200"
                                        :class="
                                            ext.enabled
                                                ? 'translate-x-5'
                                                : 'translate-x-0'
                                        "
                                    />
                                </button>
                            </div>

                            <!-- 하단 상태 텍스트 -->
                            <p class="mt-3 text-xs text-slate-500">
                                <span v-if="ext.enabled && ext.url">
                                    연결됨:
                                    <span class="font-medium text-slate-700">{{
                                        ext.url
                                    }}</span>
                                </span>
                                <span v-else-if="ext.enabled">
                                    연결 정보가 아직 설정되지 않았습니다.
                                </span>
                                <span v-else>
                                    토글을 켜서 {{ ext.label }} 연동 정보를
                                    설정하세요.
                                </span>
                            </p>
                        </article>
                    </div>

                    <!-- 외부 시스템 설정 팝업 -->
                    <div
                        v-if="activeExternalPopup && activeExternalSystem"
                        class="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
                    >
                        <div
                            class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
                        >
                            <h3 class="text-base font-semibold text-slate-900">
                                {{ activeExternalSystem.label }} 연동 정보
                            </h3>
                            <p class="mt-1 text-xs text-slate-500">
                                접근 가능한 URL과 Personal Access Token(PAT)을
                                입력해주세요.
                            </p>

                            <div class="mt-4 space-y-4">
                                <div>
                                    <label
                                        class="block text-xs font-medium text-slate-700"
                                    >
                                        URL
                                    </label>
                                    <input
                                        v-model="activeExternalSystem.url"
                                        type="text"
                                        placeholder="https://your-domain.atlassian.net / https://www.figma.com/file/..."
                                        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label
                                        class="block text-xs font-medium text-slate-700"
                                    >
                                        Personal Access Token (PAT)
                                    </label>
                                    <input
                                        v-model="activeExternalSystem.pat"
                                        type="password"
                                        placeholder="토큰 값을 입력하세요"
                                        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <p class="mt-1 text-[11px] text-slate-400">
                                        실제 서비스에서는 안전한 저장소에
                                        암호화하여 보관해야 합니다.
                                    </p>
                                </div>
                            </div>

                            <div class="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    class="rounded-md border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    @click="cancelExternalPopup"
                                >
                                    취소
                                </button>
                                <button
                                    type="button"
                                    class="rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                                    @click="saveExternalConfig"
                                >
                                    저장
                                </button>
                            </div>
                            <div
                                v-if="popupError"
                                class="mt-2 rounded-md bg-red-50 px-3 py-2"
                            >
                                <p class="text-xs text-red-600">
                                    {{ popupError }}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 버튼 영역 -->
                <section
                    class="mt-12 flex justify-end gap-3 border-t border-slate-200 pt-8"
                >
                    <button
                        type="button"
                        class="rounded-md bg-slate-600 px-8 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
                        @click="handleCancel"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        class="rounded-md bg-emerald-500 px-8 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600"
                    >
                        등록
                    </button>
                </section>
            </form>
        </section>
    </main>

    <!-- === 저장/완료 오버레이 === -->
    <div
        v-if="saveStatus !== 'idle'"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
        <div
            class="flex min-w-[260px] flex-col items-center gap-3 rounded-lg bg-white px-6 py-5 text-center shadow-lg"
        >
            <!-- 로딩 스피너 -->
            <div
                v-if="saveStatus === 'saving'"
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
                    saveStatus === "saving"
                        ? "데이터 저장 및 임베딩 작업을 진행하고 있습니다..."
                        : "저장이 완료되었습니다! 프로젝트 목록으로 이동합니다."
                }}
            </p>
        </div>
    </div>
</template>
