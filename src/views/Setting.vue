<script setup lang="ts">
import {ref, onMounted} from "vue";
import {
    getAppConfig,
    updateAppConfig,
    getOllamaModels,
} from "../services/api.js";
import type {AppConfigResponse} from "../types/config.js";
import type {OllamaModel} from "../types/ollama.js";

const isExternalSystem = ref(false);
const isEnglish = ref(true);
const isFigma = ref(false);

const ragBatchSize = ref(3);
const maxTcCount = ref(20);
const tcPrefix = ref("REQ_TC");

const llmModels = ref<string[]>([]);
const selectedModel = ref<string>("");
const embeddingModels = ref<string[]>([]);
const selectedEmbeddingModel = ref<string>("");

const modelsLoading = ref(false);
const configLoading = ref(false);
const errorMessage = ref<string | null>(null);
const isSaved = ref(false);

const decreaseBatchSize = () => {
    if (ragBatchSize.value > 1) {
        ragBatchSize.value--;
    }
};

const increaseBatchSize = () => {
    if (ragBatchSize.value < 10) {
        ragBatchSize.value++;
    }
};

const decreaseMaxTcCount = () => {
    if (maxTcCount.value > 1) {
        maxTcCount.value--;
    }
};

const increaseMaxTcCount = () => {
    maxTcCount.value++;
};

const fetchInitialData = async () => {
    configLoading.value = true;
    modelsLoading.value = true;
    errorMessage.value = null;

    try {
        // 앱 설정 로드
        const config = await getAppConfig();
        ragBatchSize.value = config.rag_batch_size ?? 3;
        maxTcCount.value = config.rag_tc_count ?? 20;
        tcPrefix.value = config.rag_tc_id_prefix ?? "REQ_TC";
        isFigma.value = config.figma_enabled ?? false;
        selectedModel.value = config.llm_model ?? "";
        selectedEmbeddingModel.value = config.embedding_model ?? "";

        // Ollama 모델 로드
        const modelData = await getOllamaModels();
        const models: OllamaModel[] = modelData.models ?? [];

        // LLM 모델 필터링 (bge 제외)
        llmModels.value = models
            .filter((m) => !m.name.includes("bge"))
            .map((m) => m.name);

        // 임베딩 모델 필터링 (bge 포함)
        embeddingModels.value = models
            .filter((m) => m.name.includes("bge"))
            .map((m) => m.name);

        // 선택된 LLM 모델 동기화
        if (
            selectedModel.value === "" ||
            !llmModels.value.includes(selectedModel.value)
        ) {
            if (llmModels.value.length > 0) {
                selectedModel.value = llmModels.value[0];
            }
        }

        // 선택된 임베딩 모델 동기화
        if (
            selectedEmbeddingModel.value === "" ||
            !embeddingModels.value.includes(selectedEmbeddingModel.value)
        ) {
            if (embeddingModels.value.length > 0) {
                selectedEmbeddingModel.value = embeddingModels.value[0];
            }
        }
    } catch (e: any) {
        errorMessage.value =
            e.message || "데이터를 불러오는 중 오류가 발생했습니다.";
    } finally {
        configLoading.value = false;
        modelsLoading.value = false;
    }
};

const handleSave = async () => {
    try {
        isSaved.value = false;
        const config: Partial<AppConfigResponse> = {
            llm_model: selectedModel.value,
            embedding_model: selectedEmbeddingModel.value,
            rag_tc_count: maxTcCount.value,
            rag_batch_size: ragBatchSize.value,
            rag_tc_id_prefix: tcPrefix.value,
            figma_enabled: isFigma.value,
        };
        await updateAppConfig(config);
        isSaved.value = true;
        setTimeout(() => {
            isSaved.value = false;
        }, 3000);
    } catch (e: any) {
        errorMessage.value = e.message || "저장 중 오류가 발생했습니다.";
    }
};

const handleReset = () => {
    fetchInitialData();
};

onMounted(() => {
    fetchInitialData();
});
</script>

<template>
    <main class="space-y-6 p-6">
        <!-- Header -->
        <header
            class="flex flex-col justify-between gap-4 md:flex-row md:items-start"
        >
            <div>
                <h2 class="text-2xl font-bold text-gray-900">환경설정</h2>
                <p class="mt-1 text-sm text-gray-500">
                    프로젝트 및 환경별 생성 옵션과 외부 연동을 관리합니다.
                </p>
            </div>
            <div class="flex items-center gap-3 self-start md:self-center">
                <span
                    v-if="isSaved"
                    class="mr-2 flex items-center text-sm text-green-600"
                >
                    <span class="material-icons-outlined mr-1 text-base">
                        check
                    </span>
                    저장됨
                </span>
                <button @click="handleSave" class="btn-primary">저장</button>
                <button @click="handleReset" class="btn-secondary">
                    초기화
                </button>
            </div>
        </header>

        <!-- Content -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <!-- Left Column -->
            <div class="space-y-6">
                <!-- Creation Environment -->
                <section
                    class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                >
                    <h3 class="mb-6 text-lg font-semibold text-gray-900">
                        생성 환경
                    </h3>
                    <div class="mb-6">
                        <label
                            class="mb-2 block text-sm font-medium text-gray-700"
                        >
                            자동생성 환경
                        </label>
                        <select
                            class="block w-full rounded-md border-gray-300 py-2 pl-3 shadow-sm pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        >
                            <option>Local</option>
                            <option>Tbell</option>
                        </select>
                    </div>
                </section>

                <!-- RAG/TC Config -->
                <section
                    class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                >
                    <h3 class="mb-6 text-lg font-semibold text-gray-900">
                        RAG/테스트케이스 생성
                    </h3>
                    <div class="mb-6">
                        <label
                            class="mb-2 block text-sm font-medium text-gray-700"
                        >
                            기본 TC Prefix
                        </label>
                        <input
                            v-model="tcPrefix"
                            type="text"
                            class="block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <p class="mt-1 text-xs text-gray-500">
                            생성될 TC 앞에 붙는 접두어
                        </p>
                    </div>
                    <div
                        class="mb-6 flex items-center justify-between border-t border-gray-100 pt-6"
                    >
                        <div>
                            <label
                                class="block text-sm font-medium text-gray-700"
                            >
                                RAG 배치 크기
                            </label>
                            <p class="mt-1 text-xs text-gray-500">
                                한 번에 처리할 문서 묶음 크기 (권장: 1-10)
                            </p>
                        </div>
                        <div
                            class="flex items-center rounded-md border border-gray-300"
                        >
                            <button
                                @click="decreaseBatchSize"
                                class="border-r border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-100"
                            >
                                -
                            </button>
                            <input
                                v-model="ragBatchSize"
                                type="number"
                                class="m-0 w-12 appearance-none border-none bg-transparent p-1 text-center text-sm focus:ring-0"
                            />
                            <button
                                @click="increaseBatchSize"
                                class="border-l border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-100"
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <div
                        class="flex items-center justify-between border-t border-gray-100 pt-6"
                    >
                        <div>
                            <label
                                class="block text-sm font-medium text-gray-700"
                            >
                                배치당 최대 TC 생성 갯수
                            </label>
                            <p class="mt-1 text-xs text-gray-500">
                                한 번의 배치로 생성할 최대 테스트 케이스 수
                            </p>
                        </div>
                        <div
                            class="flex items-center rounded-md border border-gray-300"
                        >
                            <button
                                @click="decreaseMaxTcCount"
                                class="border-r border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-100"
                            >
                                -
                            </button>
                            <input
                                v-model="maxTcCount"
                                type="number"
                                class="m-0 w-12 appearance-none border-none bg-transparent p-1 text-center text-sm focus:ring-0"
                            />
                            <button
                                @click="increaseMaxTcCount"
                                class="border-l border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-100"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </section>
            </div>

            <!-- Right Column -->
            <div class="space-y-6">
                <!-- Models -->
                <section
                    class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                >
                    <h3 class="mb-6 text-lg font-semibold text-gray-900">
                        모델
                    </h3>
                    <div class="mb-6">
                        <label
                            class="mb-2 block text-sm font-medium text-gray-700"
                        >
                            기본 LLM 모델
                        </label>
                        <select
                            v-model="selectedModel"
                            class="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        >
                            <option v-if="modelsLoading" disabled>
                                목록 불러오는 중...
                            </option>
                            <option v-else-if="llmModels.length === 0" disabled>
                                사용가능한 모델 없음
                            </option>
                            <option
                                v-for="model in llmModels"
                                :key="model"
                                :value="model"
                            >
                                {{ model }}
                            </option>
                        </select>
                    </div>
                    <div class="mb-6">
                        <label
                            class="mb-2 block text-sm font-medium text-gray-700"
                        >
                            인베딩 모델
                        </label>
                        <select
                            v-model="selectedEmbeddingModel"
                            class="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        >
                            <option v-if="modelsLoading" disabled>
                                목록 불러오는 중...
                            </option>
                            <option
                                v-else-if="embeddingModels.length === 0"
                                disabled
                            >
                                사용가능한 모델 없음
                            </option>
                            <option
                                v-for="model in embeddingModels"
                                :key="model"
                                :value="model"
                            >
                                {{ model }}
                            </option>
                        </select>
                    </div>
                    <div
                        class="mb-4 flex items-center justify-between border-t border-gray-100 pt-6"
                    >
                        <label class="block text-sm font-medium text-gray-700">
                            기본 생성 언어
                        </label>
                    </div>
                    <div class="mb-6">
                        <select
                            class="block w-3/4 rounded-md border-gray-300 py-2 pl-3 pr-10 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        >
                            <option>한국어(KOR)</option>
                            <option>English (US)</option>
                        </select>
                    </div>
                </section>

                <!-- External Integration (Figma) -->
                <section
                    class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                >
                    <h3 class="mb-6 text-lg font-semibold text-gray-900">
                        외부 연동(Figma)
                    </h3>
                    <div class="mb-4 flex items-center justify-between">
                        <span class="block text-sm font-medium text-gray-700">
                            Figma 사용
                        </span>

                        <!-- Toggle -->
                        <div
                            class="custom-toggle"
                            :class="
                                isFigma
                                    ? 'custom-toggle-active'
                                    : 'custom-toggle-inactive'
                            "
                            @click="isFigma = !isFigma"
                        >
                            <span
                                class="custom-toggle-circle"
                                :class="
                                    isFigma
                                        ? 'custom-toggle-circle-on'
                                        : 'custom-toggle-circle-off'
                                "
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </main>
</template>
