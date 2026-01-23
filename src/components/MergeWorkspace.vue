<script setup lang="ts">
import type {ClusterItem} from "../types/clustering.js";
import {ref, watch, computed} from "vue";
import {useAlert} from "../composables/useAlert.js";
import {
    deleteTestCase,
    createTestCase,
    mergeTestCases,
} from "../services/testcaseApi.js";
import LoadingSpinner from "./LoadingSpinner.vue";

// --- Props & Emits ---
const props = defineProps<{
    cluster: ClusterItem;
    projectId: number;
    historyId: number;
}>();

const emit = defineEmits<{
    (e: "close"): void;
    (e: "refresh"): void;
}>();

const {showAlert, showConfirm} = useAlert();

// --- 상태 ---
const selectedTcIds = ref<Set<number>>(new Set());

// 병합 프로세스 상태
// idle: 초기 상태 (소스 선택)
// ready: [병합 시작] 클릭 후, 하단 폼 오픈 (빈 상태)
// generating: AI 생성 중
// review: AI 결과 확인 및 수정
type MergeStep = "idle" | "ready" | "generating" | "review";
const mergeStep = ref<MergeStep>("idle");
const isProcessing = ref(false); // 최종 처리 로딩 상태

// 병합 결과 데이터
const mergedResult = ref({
    title: "",
    preconditions: "",
    expected_result: "",
    steps: [] as {action: string; expected: string}[],
    priority: "",
});

// 프리필(내용 가져오기) 목록 UI 상태
const isPrefillExpanded = ref(false);

const prefillSources = computed(() => {
    // 원본 순서 유지하며 선택된 항목만 필터링
    if (!props.cluster || !props.cluster.testcases) return [];
    return props.cluster.testcases.filter((tc) =>
        selectedTcIds.value.has(tc.id)
    );
});

const visiblePrefillSources = computed(() => {
    const list = prefillSources.value;
    // 펼쳐진 상태면 전체, 아니면 최대 4개만 노출
    if (isPrefillExpanded.value) return list;
    return list.slice(0, 4);
});

// Props 변경 감지
watch(
    () => props.cluster,
    (newVal) => {
        if (newVal && newVal.testcases) {
            const ids = newVal.testcases.map((tc) => tc.id);
            selectedTcIds.value = new Set(ids);
            mergeStep.value = "idle";

            // 초기값
            mergedResult.value = {
                title: newVal.title || "",
                preconditions: "",
                expected_result: "",
                steps: [],
                priority: "",
            };
        }
    },
    {immediate: true}
);

// --- Actions ---

const toggleSelection = (id: number) => {
    if (selectedTcIds.value.has(id)) {
        selectedTcIds.value.delete(id);
    } else {
        selectedTcIds.value.add(id);
    }
    // 선택 변경 시 프로세스 초기화 (안전을 위해)
    if (mergeStep.value !== "idle") {
        mergeStep.value = "idle";
    }
};

const handleDelete = async (id: number) => {
    const confirmed = await showConfirm(
        "정말로 이 테스트케이스를 삭제하시겠습니까?",
        "삭제 확인"
    );
    if (!confirmed) return;

    try {
        await deleteTestCase(id);
        const idx = props.cluster.testcases.findIndex((tc) => tc.id === id);
        if (idx !== -1) {
            props.cluster.testcases.splice(idx, 1);
            props.cluster.count--;
            selectedTcIds.value.delete(id);
        }
        await showAlert("삭제되었습니다.", "성공");
    } catch (error) {
        console.error(error);
        await showAlert("삭제 실패", "오류");
    }
};

// Step 1. 병합 프로세스 시작 (UI 오픈)
const handleStartMerge = () => {
    if (selectedTcIds.value.size < 2) return;
    mergeStep.value = "ready";
    // 스크롤 이동
    setTimeout(() => {
        document
            .getElementById("merged-result-area")
            ?.scrollIntoView({behavior: "smooth"});
    }, 100);
};

// Step 2. AI 자동 병합 실행
const handleAiMerge = async () => {
    mergeStep.value = "generating";

    try {
        const response = await mergeTestCases(Array.from(selectedTcIds.value));

        mergedResult.value = {
            title: response.title || "",
            preconditions: response.preconditions || "",
            expected_result: response.expected_result || "",
            steps: response.steps || [],
            priority: response.priority || "",
        };

        mergeStep.value = "review";
        await showAlert("AI 병합 제안이 생성되었습니다.", "완료");
    } catch (e) {
        console.error("AI Merge Error", e);
        await showAlert("AI 병합 중 오류가 발생했습니다.", "오류");
        mergeStep.value = "ready";
    }
};

// Source Pre-fill Logic
const handlePrefill = async (tc: any) => {
    const confirmed = await showConfirm(
        `[${
            tc.testcase_id_tag || tc.id
        }] 내용을 불러오시겠습니까?\n현재 작성 중인 내용은 덮어씌워집니다.`,
        "내용 가져오기"
    );
    if (!confirmed) return;

    mergedResult.value = {
        title: tc.title || "",
        preconditions: tc.preconditions || "",
        expected_result: tc.expected_result || "",
        steps:
            tc.steps?.map((s: any) => ({
                action: s.action,
                expected: s.expected || "",
            })) || [],
        priority: tc.priority || "",
    };

    await showAlert("내용이 반영되었습니다.", "완료");
};

// Step 3. 최종 저장
const handleConfirmMerge = async () => {
    const confirmed = await showConfirm(
        `선택된 ${selectedTcIds.value.size}개의 테스트케이스를 삭제하고,\n현재 내용으로 병합하시겠습니까?`,
        "병합 확정"
    );
    if (!confirmed) return;

    try {
        isProcessing.value = true;
        const firstOrigin = props.cluster.testcases.find((t) =>
            selectedTcIds.value.has(t.id)
        );
        if (!firstOrigin) throw new Error("원본 데이터 없음");

        // Payload 준비
        const payload = {
            project_id: props.projectId,
            history_id: props.historyId,
            testcase_id_tag: firstOrigin.testcase_id_tag || null,
            module: firstOrigin.module,
            title: mergedResult.value.title,
            preconditions: mergedResult.value.preconditions || null,
            // Steps 타입 안전 처리 (Array 보장 및 매핑)
            steps: Array.isArray(mergedResult.value.steps)
                ? mergedResult.value.steps.map((s) => ({
                      action: s.action,
                      expected: s.expected,
                  }))
                : [],
            expected_result: mergedResult.value.expected_result,
            priority: mergedResult.value.priority || null,
            status: "generated",
            embedding: null,
        };

        console.log("Merge Payload:", payload); // 디버깅용 로그

        await createTestCase(payload);

        const deletePromises = Array.from(selectedTcIds.value).map((id) =>
            deleteTestCase(id)
        );
        await Promise.all(deletePromises);

        // 임베딩 생성 시간을 위해 3초 대기
        await new Promise((resolve) => setTimeout(resolve, 3000));

        await showAlert("성공적으로 병합되었습니다.", "성공");
        emit("refresh");
        emit("close");
    } catch (e: any) {
        console.error("Merge Failed:", e);

        let errorMsg = e.message;
        const detail = e.data?.detail || e.data?.message;

        if (detail) {
            errorMsg =
                typeof detail === "object"
                    ? JSON.stringify(detail, null, 2)
                    : detail;
        }

        await showAlert(`저장 실패:\n${errorMsg}`, "오류 (상세)");
    } finally {
        isProcessing.value = false;
    }
};
</script>

<template>
    <div class="absolute inset-0 z-30 bg-gray-50 flex flex-col overflow-hidden">
        <!-- Processing Overlay -->
        <div
            v-if="isProcessing"
            class="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in"
        >
            <LoadingSpinner message="병합 및 임베딩 생성 중입니다..." />
            <p class="text-sm text-gray-500 mt-2">잠시만 기다려주세요....</p>
        </div>

        <!-- Header -->
        <header
            class="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between shrink-0 shadow-sm"
        >
            <div class="flex items-center gap-4">
                <button
                    @click="emit('close')"
                    class="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                >
                    <span class="material-icons-outlined">arrow_back</span>
                </button>
                <div>
                    <h1
                        class="text-lg font-bold text-gray-900 flex items-center gap-2"
                    >
                        <span class="material-icons-outlined text-indigo-600"
                            >merge_type</span
                        >
                        TC 병합 워크스페이스
                    </h1>
                </div>
            </div>
            <!-- Empty right side removed -->
            <div class="flex gap-2">
                <button
                    @click="handleStartMerge"
                    :disabled="selectedTcIds.size < 2"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all"
                    :class="
                        selectedTcIds.size >= 2
                            ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    "
                >
                    <span>병합 하러가기</span>
                    <span class="material-icons-outlined text-[18px]"
                        >arrow_downward</span
                    >
                </button>
            </div>
        </header>

        <!-- Main Content (Scrollable) -->
        <main class="flex-1 overflow-y-auto p-8">
            <div class="max-w-[1500px] mx-auto space-y-10 pb-24">
                <!-- 1. Source Test Cases -->
                <section>
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <h2
                                class="text-sm font-bold text-gray-600 uppercase flex items-center gap-2"
                            >
                                <span
                                    class="material-icons-outlined text-[18px]"
                                    >inventory_2</span
                                >
                                병합 대상 ({{ selectedTcIds.size }} /
                                {{ cluster.count }})
                            </h2>
                            <span
                                v-if="selectedTcIds.size < 2"
                                class="text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded"
                            >
                                * 병합하려면 최소 2개 이상 선택해야 합니다.
                            </span>
                        </div>
                    </div>

                    <!-- Horizontal Scroll Cards -->
                    <div class="flex gap-5 overflow-x-auto pb-6 px-1 snap-x">
                        <div
                            v-for="tc in cluster.testcases"
                            :key="tc.id"
                            class="w-[380px] shrink-0 bg-white rounded-xl border-2 transition-all shadow-sm snap-center flex flex-col relative group overflow-hidden"
                            :class="
                                selectedTcIds.has(tc.id)
                                    ? 'border-indigo-500 ring-4 ring-indigo-50/50'
                                    : 'border-dashed border-gray-300 opacity-60 bg-gray-50'
                            "
                            @click="toggleSelection(tc.id)"
                        >
                            <!-- Card Header -->
                            <div
                                class="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start"
                            >
                                <div class="flex gap-2 w-full pr-8">
                                    <span
                                        class="text-[10px] font-mono font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 mb-1 inline-block shrink-0 h-fit"
                                    >
                                        {{
                                            tc.testcase_id_tag || `TC-${tc.id}`
                                        }}
                                    </span>
                                    <h3
                                        class="font-bold text-gray-800 text-sm leading-tight line-clamp-2"
                                    >
                                        {{ tc.title }}
                                    </h3>
                                </div>
                                <!-- Checkbox Indicator -->
                                <div class="absolute top-4 right-4 z-10">
                                    <span
                                        class="material-icons-outlined text-[24px] transition-colors"
                                        :class="
                                            selectedTcIds.has(tc.id)
                                                ? 'text-indigo-600'
                                                : 'text-gray-300'
                                        "
                                    >
                                        {{
                                            selectedTcIds.has(tc.id)
                                                ? "check_circle"
                                                : "radio_button_unchecked"
                                        }}
                                    </span>
                                </div>
                            </div>

                            <!-- Card Body (Scrollable & Compact) -->
                            <div
                                class="p-3 space-y-3 flex-1 overflow-y-auto max-h-[350px]"
                            >
                                <!-- Preconditions -->
                                <div>
                                    <label
                                        class="text-[10px] font-bold text-gray-500 mb-1 block"
                                        >전제 조건</label
                                    >
                                    <p
                                        class="text-xs text-gray-800 bg-gray-50 px-2 py-1.5 rounded border border-gray-200 leading-snug"
                                    >
                                        {{ tc.preconditions || "-" }}
                                    </p>
                                </div>

                                <!-- Steps (Grid Style) -->
                                <div>
                                    <label
                                        class="text-[10px] font-bold text-gray-500 mb-1 block"
                                        >수행 절차</label
                                    >
                                    <div
                                        class="border border-gray-200 rounded overflow-hidden"
                                    >
                                        <!-- Header -->
                                        <div
                                            class="grid grid-cols-[20px_1fr_1fr] gap-2 px-2 py-1 bg-gray-50 border-b border-gray-200 text-[9px] font-bold text-gray-500"
                                        >
                                            <div class="text-center">#</div>
                                            <div>Action</div>
                                            <div>Expected</div>
                                        </div>
                                        <!-- List -->
                                        <ul
                                            class="divide-y divide-gray-100 bg-white"
                                        >
                                            <li
                                                v-for="(
                                                    step, idx
                                                ) in tc.steps || []"
                                                :key="idx"
                                                class="grid grid-cols-[20px_1fr_1fr] gap-2 px-2 py-1.5 text-xs"
                                            >
                                                <span
                                                    class="font-mono text-gray-400 text-[10px] text-center pt-0.5"
                                                    >{{ idx + 1 }}</span
                                                >
                                                <div
                                                    class="text-gray-900 leading-snug"
                                                >
                                                    {{ step.action }}
                                                </div>
                                                <div
                                                    class="text-gray-700 leading-snug border-l border-gray-100 pl-2"
                                                >
                                                    {{ step.expected || "-" }}
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <!-- Expected Result (Final) -->
                                <div>
                                    <label
                                        class="text-[10px] font-bold text-gray-500 mb-1 block"
                                        >최종 결과</label
                                    >
                                    <p
                                        class="text-xs text-gray-800 bg-teal-50 px-2 py-1.5 rounded border border-teal-100 leading-snug"
                                    >
                                        {{ tc.expected_result || "-" }}
                                    </p>
                                </div>
                            </div>

                            <!-- Card Footer -->
                            <div
                                class="p-3 border-t border-gray-100 bg-gray-50 flex justify-end"
                            >
                                <button
                                    @click.stop="handleDelete(tc.id)"
                                    class="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                >
                                    <span
                                        class="material-icons-outlined text-[16px]"
                                        >delete</span
                                    >
                                    삭제
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Action Bar (Start Merge) Removed -->
                </section>

                <!-- 2. Merged Result Area -->
                <section
                    id="merged-result-area"
                    class="border-t-2 border-dashed border-gray-200 pt-10 transition-all duration-300"
                    :class="{
                        'opacity-50 blur-[2px] pointer-events-none select-none grayscale':
                            selectedTcIds.size < 2,
                    }"
                >
                    <!-- Header Actions -->
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h2
                                class="text-lg font-bold text-gray-800 flex items-center gap-2"
                            >
                                <span
                                    class="material-icons-outlined text-gray-400"
                                    >auto_fix_high</span
                                >
                                병합 결과 작성
                            </h2>
                            <p class="text-sm text-gray-500 mt-1">
                                AI 자동 생성을 이용하거나 직접 작성할 수
                                있습니다.
                            </p>
                        </div>

                        <div class="flex gap-3">
                            <button
                                @click="handleAiMerge"
                                :disabled="mergeStep === 'generating'"
                                class="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-violet-500 to-indigo-600 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-70"
                            >
                                <span
                                    class="material-icons-outlined"
                                    :class="{
                                        'animate-spin':
                                            mergeStep === 'generating',
                                    }"
                                    style="animation-direction: reverse"
                                >
                                    {{
                                        mergeStep === "generating"
                                            ? "sync"
                                            : "auto_awesome"
                                    }}
                                </span>
                                {{
                                    mergeStep === "review"
                                        ? "AI 다시 생성"
                                        : "AI 자동 병합 실행"
                                }}
                            </button>
                        </div>
                    </div>

                    <!-- Editor Form -->
                    <div class="grid grid-cols-12 gap-8 relative">
                        <!-- Source Pre-fill Section -->
                        <div
                            class="col-span-12 mb-2"
                            v-if="selectedTcIds.size > 0"
                        >
                            <label
                                class="text-xs font-bold text-gray-400 uppercase mb-2 block"
                            >
                                참조 및 내용 가져오기 (클릭 시 반영)
                            </label>
                            <div class="space-y-2">
                                <div
                                    class="flex flex-wrap gap-2 transition-all duration-300 ease-in-out"
                                >
                                    <button
                                        v-for="tc in visiblePrefillSources"
                                        :key="tc.id"
                                        @click="handlePrefill(tc)"
                                        class="shrink-0 flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 ring-2 ring-transparent focus:ring-indigo-200 transition-all text-left max-w-60 group animate-fade-in-up"
                                        title="클릭하여 내용 가져오기"
                                    >
                                        <span
                                            class="text-[10px] font-mono font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-100 shrink-0"
                                        >
                                            {{
                                                tc.testcase_id_tag ||
                                                `TC-${tc.id}`
                                            }}
                                        </span>
                                        <span
                                            class="text-xs text-gray-700 truncate font-medium group-hover:text-indigo-800"
                                        >
                                            {{ tc.title }}
                                        </span>
                                        <span
                                            class="material-icons-outlined text-[14px] text-indigo-400 group-hover:text-indigo-600 ml-auto shrink-0"
                                        >
                                            content_copy
                                        </span>
                                    </button>

                                    <!-- 더보기 / 접기 버튼 -->
                                    <button
                                        v-if="
                                            prefillSources.length > 4 ||
                                            isPrefillExpanded
                                        "
                                        @click="
                                            isPrefillExpanded =
                                                !isPrefillExpanded
                                        "
                                        class="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors text-xs font-bold"
                                    >
                                        <span
                                            class="material-icons-outlined text-[16px]"
                                        >
                                            {{
                                                isPrefillExpanded
                                                    ? "expand_less"
                                                    : "more_horiz"
                                            }}
                                        </span>
                                        <span v-if="!isPrefillExpanded">
                                            +{{ prefillSources.length - 4 }}
                                            더보기
                                        </span>
                                        <span v-else>접기</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Loading Overlay -->
                        <div
                            v-if="mergeStep === 'generating'"
                            class="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl border border-gray-100"
                        >
                            <LoadingSpinner
                                message="AI가 시나리오를 통합하고 있습니다..."
                                :reverse="true"
                            />
                        </div>

                        <!-- Left: Meta Info -->
                        <div class="col-span-4 space-y-5">
                            <div class="space-y-1">
                                <label
                                    class="text-xs font-bold text-gray-500 uppercase ml-1"
                                    >제목</label
                                >
                                <input
                                    v-model="mergedResult.title"
                                    type="text"
                                    class="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="통합된 TC 제목"
                                />
                            </div>
                            <div class="space-y-1">
                                <label
                                    class="text-xs font-bold text-gray-500 uppercase ml-1"
                                    >전제 조건</label
                                >
                                <textarea
                                    v-model="mergedResult.preconditions"
                                    class="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-32 resize-none leading-relaxed"
                                    placeholder="통합 전제 조건"
                                ></textarea>
                            </div>
                            <div class="space-y-1">
                                <label
                                    class="text-xs font-bold text-gray-500 uppercase ml-1"
                                    >예상 결과</label
                                >
                                <textarea
                                    v-model="mergedResult.expected_result"
                                    class="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-32 resize-none leading-relaxed"
                                    placeholder="최종 예상 결과"
                                ></textarea>
                            </div>
                        </div>

                        <!-- Right: Steps -->
                        <div class="col-span-8 space-y-2">
                            <label
                                class="text-xs font-bold text-gray-500 uppercase ml-1"
                                >수행 절차</label
                            >

                            <div
                                class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                            >
                                <div
                                    class="grid grid-cols-[40px_1fr_1fr_40px] bg-gray-50 border-b border-gray-100 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase"
                                >
                                    <div class="text-center">#</div>
                                    <div>Action</div>
                                    <div>Expected</div>
                                    <div></div>
                                </div>
                                <div class="divide-y divide-gray-50">
                                    <div
                                        v-for="(
                                            step, idx
                                        ) in mergedResult.steps"
                                        :key="idx"
                                        class="grid grid-cols-[40px_1fr_1fr_40px] items-start p-2 hover:bg-gray-50 group"
                                    >
                                        <div
                                            class="text-center py-2 text-xs font-mono text-gray-400"
                                        >
                                            {{ idx + 1 }}
                                        </div>
                                        <div class="p-1">
                                            <textarea
                                                v-model="step.action"
                                                class="w-full text-sm bg-transparent border-none focus:ring-0 resize-none p-1 leading-relaxed text-gray-800"
                                                rows="2"
                                                placeholder="Action..."
                                            ></textarea>
                                        </div>
                                        <div
                                            class="p-1 border-l border-dashed border-gray-100"
                                        >
                                            <textarea
                                                v-model="step.expected"
                                                class="w-full text-sm bg-transparent border-none focus:ring-0 resize-none p-1 leading-relaxed text-gray-600"
                                                rows="2"
                                                placeholder="Expected..."
                                            ></textarea>
                                        </div>
                                        <div
                                            class="flex items-center justify-center py-2"
                                        >
                                            <button
                                                @click="
                                                    mergedResult.steps.splice(
                                                        idx,
                                                        1
                                                    )
                                                "
                                                class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <span
                                                    class="material-icons-outlined text-[16px]"
                                                    >close</span
                                                >
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        v-if="mergedResult.steps.length === 0"
                                        class="py-12 text-center text-gray-400"
                                    >
                                        <p class="text-sm">
                                            생성된 절차가 없습니다.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    @click="
                                        mergedResult.steps.push({
                                            action: '',
                                            expected: '',
                                        })
                                    "
                                    class="w-full py-2 bg-gray-50 hover:bg-indigo-50 text-indigo-600 text-xs font-bold border-t border-gray-100 transition-colors"
                                >
                                    + 단계 추가
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Footer: Save Button -->
                    <div
                        class="flex justify-end pt-8 border-t border-gray-100 mt-8"
                    >
                        <button
                            @click="handleConfirmMerge"
                            :disabled="mergedResult.title === ''"
                            class="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold text-sm shadow-xl hover:bg-black hover:scale-105 transition-all flex items-center gap-2 disabled:bg-gray-300 disabled:scale-100 disabled:cursor-not-allowed"
                        >
                            <span class="material-icons-outlined">save</span>
                            병합 결과 저장 및 완료
                        </button>
                    </div>
                </section>
            </div>
        </main>
    </div>
</template>

<style scoped>
@keyframes fade-in-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
.animate-fade-in-up {
    animation: fade-in-up 0.5s ease-out forwards;
}

/* Hide Scrollbar for Horizontal Card List */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
