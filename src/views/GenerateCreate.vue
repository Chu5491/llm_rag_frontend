<script setup lang="ts">
import {ref, onMounted} from "vue";
import {getOllamaModels} from "../services/api.js";

// 폼 상태 (지금은 목업용 기본값)
const selectedProject = ref("SKT Agent Bench");
const selectedArtifact = ref("화면설계서");
const selectedFeature = ref("로그인");

// Ollama LLM 모델 목록 (임베딩 제외)
type OllamaModel = {
    name: string;
    digest: string;
    size: number;
};

const llmModels = ref<string[]>([]);
const selectedModel = ref<string>("");
const modelsLoading = ref(false);
const modelsError = ref<string | null>(null);

const selectedLanguage = ref("한글");

const tcPrefix = ref("SAB");
const tcCount = ref<number | null>(25);

// Ollama 모델 목록 가져오기
onMounted(async () => {
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
    // 일단은 리셋 정도만
    selectedProject.value = "SKT Agent Bench";
    selectedArtifact.value = "화면설계서";
    selectedFeature.value = "로그인";

    if (llmModels.value.length > 0) {
        selectedModel.value = llmModels.value[0];
    } else {
        selectedModel.value = "";
    }

    selectedLanguage.value = "한글";
    tcPrefix.value = "SAB";
    tcCount.value = 25;
};

const handleSubmit = () => {
    // TODO: 실제 자동생성 실행 API 연동
    console.log("자동생성 실행", {
        project: selectedProject.value,
        artifact: selectedArtifact.value,
        feature: selectedFeature.value,
        model: selectedModel.value,
        language: selectedLanguage.value,
        tcPrefix: tcPrefix.value,
        tcCount: tcCount.value,
    });
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
                        class="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        <!-- 프로젝트 -->
                        <div class="space-y-1.5">
                            <label
                                class="block text-xs font-semibold text-slate-700"
                                for="project"
                            >
                                프로젝트 명
                            </label>
                            <select
                                id="project"
                                v-model="selectedProject"
                                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option>SKT Agent Bench</option>
                                <option>T-Gen</option>
                                <option>Samsung VOC</option>
                            </select>
                        </div>

                        <!-- 산출물 -->
                        <div class="space-y-1.5">
                            <label
                                class="block text-xs font-semibold text-slate-700"
                                for="artifact"
                            >
                                참고할 산출물
                            </label>
                            <select
                                id="artifact"
                                v-model="selectedArtifact"
                                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option>화면설계서</option>
                                <option>API 명세서</option>
                                <option>요구사항 정의서</option>
                            </select>
                        </div>

                        <!-- 기능 분류 -->
                        <div class="space-y-1.5">
                            <label
                                class="block text-xs font-semibold text-slate-700"
                                for="feature"
                            >
                                기능 분류
                            </label>
                            <select
                                id="feature"
                                v-model="selectedFeature"
                                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option>로그인</option>
                                <option>회원가입</option>
                                <option>결제</option>
                                <option>검색</option>
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
                            Note
                        </p>
                        프로젝트와 산출물을 선택하면<br />
                        해당 문서를 기준으로 테스트케이스를 생성합니다.
                    </aside>
                </div>

                <div class="mt-2">
                    <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
                    >
                        <span class="material-icons-outlined text-sm">
                            auto_awesome
                        </span>
                        AI 기능 자동분류
                    </button>
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
                                <option>Japanese</option>
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
                    class="flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-md"
                    @click.prevent="handleSubmit"
                >
                    지금 실행
                    <span class="material-icons-outlined text-base">
                        play_arrow
                    </span>
                </button>
            </div>
        </section>
    </main>
</template>
