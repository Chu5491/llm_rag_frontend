<script setup lang="ts">
import type {ClusterItem} from "../types/clustering.js";
import type {TestcaseResponse} from "../types/testcase.js";

import {ref, watch, computed} from "vue";
import {useAlert} from "../composables/useAlert.js";
import {
    deleteTestCase,
    createTestCase,
    mergeTestCases,
} from "../services/testcaseApi.js";

// --- Props & Emits ---
const props = defineProps<{
    cluster: ClusterItem;
}>();

const emit = defineEmits<{
    (e: "close"): void;
    (e: "refresh"): void; // 병합 완료 후 상위 목록 갱신 요청
}>();

const {showAlert, showConfirm} = useAlert();

// --- 상태 ---
const expandedItems = ref<Set<string>>(new Set());
const selectedTcIds = ref<Set<number>>(new Set());

// 병합 프로세스 상태
// idle: 기본 상태 (목록 확인)
// ready: 병합 시작 (하단 폼 오픈)
// generating: AI 생성 중
// review: AI 결과 검토 및 수정
type MergeStep = "idle" | "ready" | "generating" | "review";
const mergeStep = ref<MergeStep>("idle");

// 병합 결과 데이터 (폼 바인딩)
const mergedResult = ref({
    title: "",
    preconditions: "",
    expected_result: "", // 분리된 예상 결과
    steps: [] as {action: string; expected: string}[],
});

// Props 변경 감지 (초기화)
watch(
    () => props.cluster,
    (newVal) => {
        if (newVal && newVal.testcases) {
            const ids = newVal.testcases.map((tc) => tc.id);
            selectedTcIds.value = new Set(ids);
            mergeStep.value = "idle";
            expandedItems.value.clear();

            // 초기값 설정
            mergedResult.value = {
                title: newVal.title || "",
                preconditions: newVal.testcases[0]?.preconditions || "",
                expected_result: newVal.testcases[0]?.expected_result || "",
                steps: [],
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
};

const toggleExpand = (id: string) => {
    if (expandedItems.value.has(id)) {
        expandedItems.value.delete(id);
    } else {
        expandedItems.value.add(id);
    }
};

// 개별 삭제
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

// 1. AI 병합 실행
const handleAiMerge = async () => {
    if (selectedTcIds.value.size < 2) {
        await showAlert("최소 2개 이상의 테스트케이스를 선택해주세요.", "알림");
        return;
    }

    mergeStep.value = "generating";

    try {
        // 백엔드 병합 API 호출
        const response = await mergeTestCases(Array.from(selectedTcIds.value));

        // 결과 적용
        mergedResult.value = {
            title: response.title || "",
            preconditions: response.preconditions || "",
            expected_result: response.expected_result || "",
            steps: response.steps || [],
        };

        mergeStep.value = "review";
        await showAlert(
            "AI가 병합 제안을 생성했습니다. 내용을 검토해주세요.",
            "완료"
        );
    } catch (e) {
        console.error("AI Merge Error", e);
        await showAlert("AI 병합 중 오류가 발생했습니다.", "오류");
        mergeStep.value = "ready"; // 실패 시 다시 Ready로
    }
};

// 2. 병합 확정 (교체)
const handleConfirmMerge = async () => {
    const confirmed = await showConfirm(
        `선택된 ${selectedTcIds.value.size}개의 테스트케이스를 삭제하고,\n현재 작성된 내용으로 새로운 테스트케이스를 생성하시겠습니까?`,
        "병합 확정"
    );
    if (!confirmed) return;

    try {
        // 1. 신규 생성
        const firstOrigin = props.cluster.testcases.find((t) =>
            selectedTcIds.value.has(t.id)
        );
        if (!firstOrigin) throw new Error("원본 데이터 없음");

        const projectId = firstOrigin.project_id;

        await createTestCase({
            project_id: projectId,
            module: firstOrigin.module,
            title: mergedResult.value.title,
            preconditions: mergedResult.value.preconditions,
            steps: mergedResult.value.steps,
            expected_result: mergedResult.value.expected_result,
            priority: firstOrigin.priority,
            status: "active",
        });

        // 2. 기존 삭제 (병렬 처리)
        const deletePromises = Array.from(selectedTcIds.value).map((id) =>
            deleteTestCase(id)
        );
        await Promise.all(deletePromises);

        await showAlert("성공적으로 병합 및 교체되었습니다.", "성공");
        emit("refresh"); // 상위 뷰 새로고침
        emit("close"); // 패널 닫기
    } catch (e) {
        console.error(e);
        await showAlert("병합 저장 중 오류가 발생했습니다.", "오류");
    }
};
</script>

<template>
    <div
        class="flex-1 flex flex-col bg-gray-50 border-l border-gray-200 shadow-xl z-50 overflow-hidden fixed top-16 right-0 bottom-0 w-[1000px] transition-all duration-300"
    >
        <!-- 헤더 섹션 -->
        <div
            class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white z-10 shrink-0"
        >
            <div>
                <h3
                    class="font-bold text-gray-900 text-lg flex items-center gap-3"
                >
                    <span class="material-icons-outlined text-indigo-600"
                        >merge</span
                    >
                    TC 병합 워크스페이스
                </h3>
            </div>
            <div class="flex gap-2">
                <!-- Close Button only -->
                <button
                    class="ml-2 text-gray-400 hover:text-gray-600"
                    @click="emit('close')"
                >
                    <span class="material-icons-outlined">close</span>
                </button>
            </div>
        </div>

        <!-- 메인 콘텐츠 영역 (스크롤) -->
        <!-- 높이 계산: 헤더(60) + 하단 액션바(var) -->
        <div class="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30 pb-32">
            <section>
                <div class="flex items-center justify-between mb-4">
                    <h4
                        class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"
                    >
                        <span class="material-icons-outlined text-[18px]"
                            >inventory_2</span
                        >
                        병합 대상 TC 목록
                    </h4>
                    <p class="text-[14px] text-gray-400">
                        총 {{ cluster.count }}개 중
                        <span class="text-indigo-600 font-bold">
                            {{ selectedTcIds.size }}개 선택됨
                        </span>
                    </p>
                </div>

                <div class="space-y-3">
                    <div
                        v-for="tc in cluster.testcases"
                        :key="tc.id"
                        class="border-2 border-transparent hover:border-indigo-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all"
                        :class="{
                            'border-indigo-200! ring-2 ring-indigo-50':
                                expandedItems.has(String(tc.id)),
                            'opacity-50 grayscale bg-gray-50':
                                !selectedTcIds.has(tc.id),
                        }"
                    >
                        <!-- Card Header -->
                        <div
                            class="px-4 py-3 flex justify-between items-center cursor-pointer transition-colors"
                            :class="
                                expandedItems.has(String(tc.id))
                                    ? 'bg-indigo-50'
                                    : 'hover:bg-gray-50'
                            "
                            @click="toggleExpand(String(tc.id))"
                        >
                            <div
                                class="flex items-center gap-3 overflow-hidden"
                            >
                                <span
                                    class="material-icons-outlined text-gray-400 text-[20px] transition-transform duration-200"
                                    :class="{
                                        'rotate-180': expandedItems.has(
                                            String(tc.id)
                                        ),
                                    }"
                                    >expand_more</span
                                >
                                <!-- Checkbox -->
                                <div
                                    @click.stop
                                    class="flex items-center justify-center -ml-1 mr-1"
                                >
                                    <input
                                        type="checkbox"
                                        :checked="selectedTcIds.has(tc.id)"
                                        @change="toggleSelection(tc.id)"
                                        class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                    />
                                </div>
                                <span
                                    class="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-mono font-bold rounded border border-gray-200 shrink-0"
                                    >{{
                                        tc.testcase_id_tag || `TC-${tc.id}`
                                    }}</span
                                >
                                <span
                                    class="text-sm font-bold text-gray-700 truncate block"
                                    :class="{
                                        'line-through text-gray-400':
                                            !selectedTcIds.has(tc.id),
                                    }"
                                    >{{ tc.title }}</span
                                >
                            </div>
                            <button
                                @click.stop="handleDelete(tc.id)"
                                class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <span
                                    class="material-icons-outlined text-[18px]"
                                    >delete_outline</span
                                >
                            </button>
                        </div>

                        <!-- Card Body (Expanded) -->
                        <div
                            v-show="expandedItems.has(String(tc.id))"
                            class="bg-white border-t border-gray-100"
                        >
                            <!-- 상단: 선행 조건 & 최종 결과 -->
                            <div class="grid grid-cols-2 gap-6 p-5 pb-6">
                                <div>
                                    <div
                                        class="flex justify-between items-center mb-2"
                                    >
                                        <label
                                            class="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1"
                                        >
                                            <span
                                                class="material-icons-outlined text-[14px]"
                                                >login</span
                                            >
                                            선행 조건</label
                                        >
                                    </div>
                                    <div
                                        class="text-[12px] p-3 bg-indigo-50/30 rounded-lg border border-indigo-100/50 leading-relaxed text-gray-700 wrap-break-word min-h-[60px]"
                                    >
                                        {{ tc.preconditions || "-" }}
                                    </div>
                                </div>
                                <div>
                                    <div
                                        class="flex justify-between items-center mb-2"
                                    >
                                        <label
                                            class="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1"
                                        >
                                            <span
                                                class="material-icons-outlined text-[14px]"
                                                >logout</span
                                            >
                                            최종 결과</label
                                        >
                                    </div>
                                    <div
                                        class="text-[12px] p-3 bg-teal-50/30 rounded-lg border border-teal-100/50 leading-relaxed text-gray-700 wrap-break-word min-h-[60px]"
                                    >
                                        {{ tc.expected_result || "-" }}
                                    </div>
                                </div>
                            </div>
                            <div class="h-px bg-gray-100 mx-5 my-0"></div>
                            <!-- 하단: 수행 절차 -->
                            <div class="p-5 pt-6">
                                <div
                                    class="flex justify-between items-center mb-4"
                                >
                                    <label
                                        class="text-[11px] font-bold text-gray-400 uppercase flex items-center gap-1"
                                    >
                                        <span
                                            class="material-icons-outlined text-[14px]"
                                            >list_alt</span
                                        >
                                        수행 절차
                                    </label>
                                </div>
                                <div class="space-y-3">
                                    <div
                                        v-for="(step, idx) in tc.steps || []"
                                        :key="idx"
                                        class="flex gap-3 group"
                                    >
                                        <span
                                            class="text-[11px] font-mono text-gray-400 pt-2 shrink-0 w-6 text-center bg-gray-50 rounded h-6 mt-1 flex items-center justify-center"
                                            >{{ idx + 1 }}</span
                                        >
                                        <div
                                            class="flex-1 grid grid-cols-2 gap-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100 hover:bg-white hover:shadow-sm hover:border-indigo-100 transition-all"
                                        >
                                            <div class="flex flex-col gap-1">
                                                <span
                                                    class="text-[10px] font-bold text-indigo-400 uppercase"
                                                    >Action</span
                                                >
                                                <p
                                                    class="text-[13px] text-gray-700 leading-relaxed font-medium"
                                                >
                                                    {{ step.action }}
                                                </p>
                                            </div>
                                            <div
                                                class="flex flex-col gap-1 border-l border-gray-200 pl-4"
                                            >
                                                <span
                                                    class="text-[10px] font-bold text-teal-500 uppercase"
                                                    >Expected</span
                                                >
                                                <p
                                                    class="text-[13px] text-gray-600 leading-relaxed"
                                                >
                                                    {{ step.expected || "-" }}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <!-- 하단: Action Step Bar -->
        <div
            class="border-t border-gray-200 bg-white shadow-[0_-5px_25px_-5px_rgba(0,0,0,0.1)] z-20 shrink-0 transition-all duration-300 relative"
            :class="mergeStep === 'idle' ? 'h-20' : 'h-[60vh]'"
        >
            <!-- 1. Idle Step: Start Button -->
            <div
                v-if="mergeStep === 'idle'"
                class="h-full flex items-center justify-between px-8 bg-gray-50/50"
            >
                <div class="flex items-center gap-3">
                    <span class="material-icons-outlined text-indigo-600"
                        >info</span
                    >
                    <p class="text-sm text-gray-600">
                        병합할 테스트케이스를 확인하고 선택해주세요.
                    </p>
                </div>
                <button
                    @click="mergeStep = 'ready'"
                    class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all flex items-center gap-2"
                >
                    <span class="material-icons-outlined">play_arrow</span>
                    병합 프로세스 시작
                </button>
            </div>

            <!-- 2. Ready / Review Step : Form & Actions -->
            <div v-else class="h-full flex flex-col">
                <!-- Header Actions -->
                <div
                    class="px-6 py-3 border-b border-gray-200 flex justify-between items-center bg-indigo-50/30"
                >
                    <div class="flex items-center gap-2">
                        <span
                            class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider"
                            >Step 2</span
                        >
                        <h4 class="text-sm font-bold text-gray-800">
                            병합 결과 검토 및 확정
                        </h4>
                    </div>
                    <div class="flex gap-2">
                        <!-- AI Generate Button -->
                        <button
                            v-if="mergeStep !== 'generating'"
                            @click="handleAiMerge"
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-all"
                        >
                            <span class="material-icons-outlined text-[16px]"
                                >auto_awesome</span
                            >
                            {{
                                mergeStep === "review"
                                    ? "AI 다시 생성"
                                    : "AI 자동 병합 실행"
                            }}
                        </button>
                    </div>
                </div>

                <!-- Form Content -->
                <div class="flex-1 overflow-y-auto p-6 bg-white relative">
                    <!-- Loading Overlay -->
                    <div
                        v-if="mergeStep === 'generating'"
                        class="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
                    >
                        <div
                            class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"
                        ></div>
                        <p class="text-indigo-800 font-bold animate-pulse">
                            AI가 최적의 병합안을 생성하고 있습니다...
                        </p>
                        <p class="text-xs text-indigo-400 mt-1">
                            약 5~10초 정도 소요될 수 있습니다.
                        </p>
                    </div>

                    <div class="grid grid-cols-12 gap-8 h-full">
                        <!-- Left Info -->
                        <div class="col-span-4 space-y-6">
                            <div class="space-y-2">
                                <label
                                    class="text-xs font-bold text-gray-500 uppercase"
                                    >통합된 제목</label
                                >
                                <input
                                    type="text"
                                    v-model="mergedResult.title"
                                    class="w-full p-3 border border-gray-200 rounded-lg font-bold text-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="테스트케이스 제목"
                                />
                            </div>
                            <div class="space-y-2">
                                <label
                                    class="text-xs font-bold text-gray-500 uppercase"
                                    >전제 조건</label
                                >
                                <textarea
                                    v-model="mergedResult.preconditions"
                                    class="w-full p-3 border border-gray-200 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-40 resize-none leading-relaxed"
                                    placeholder="전제 조건"
                                ></textarea>
                            </div>
                            <div class="space-y-2">
                                <label
                                    class="text-xs font-bold text-gray-500 uppercase"
                                    >기대(최종) 결과</label
                                >
                                <textarea
                                    v-model="mergedResult.expected_result"
                                    class="w-full p-3 border border-gray-200 rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-24 resize-none leading-relaxed"
                                    placeholder="최종 결과"
                                ></textarea>
                            </div>
                        </div>

                        <!-- Right Steps -->
                        <div class="col-span-8 flex flex-col">
                            <label
                                class="text-xs font-bold text-gray-500 uppercase mb-2"
                                >통합된 수행 절차</label
                            >
                            <div
                                class="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col"
                            >
                                <div
                                    class="bg-gray-50 px-4 py-2 border-b border-gray-200 grid grid-cols-[40px_1fr_1fr_40px] gap-2 text-[11px] font-bold text-gray-400 uppercase"
                                >
                                    <div class="text-center">#</div>
                                    <div>Action</div>
                                    <div>Expected Result</div>
                                    <div></div>
                                </div>
                                <div
                                    class="flex-1 overflow-y-auto bg-white p-2 space-y-1"
                                >
                                    <div
                                        v-for="(
                                            step, idx
                                        ) in mergedResult.steps"
                                        :key="idx"
                                        class="group flex items-start gap-2 p-2 rounded hover:bg-gray-50 border border-transparent hover:border-indigo-100 transition-all"
                                    >
                                        <div
                                            class="w-10 pt-2 text-center text-xs font-mono text-gray-400 font-bold"
                                        >
                                            {{ idx + 1 }}
                                        </div>
                                        <div class="flex-1">
                                            <textarea
                                                v-model="step.action"
                                                rows="2"
                                                class="w-full text-xs p-2 bg-gray-50/50 border border-gray-100 rounded focus:bg-white focus:ring-1 focus:ring-indigo-500 resize-none"
                                            ></textarea>
                                        </div>
                                        <div class="flex-1">
                                            <textarea
                                                v-model="step.expected"
                                                rows="2"
                                                class="w-full text-xs p-2 bg-gray-50/50 border border-gray-100 rounded focus:bg-white focus:ring-1 focus:ring-teal-500 resize-none"
                                            ></textarea>
                                        </div>
                                        <div
                                            class="w-10 pt-1 text-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <button
                                                @click="
                                                    mergedResult.steps.splice(
                                                        idx,
                                                        1
                                                    )
                                                "
                                                class="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded"
                                            >
                                                <span
                                                    class="material-icons-outlined text-[16px]"
                                                    >close</span
                                                >
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Empty State placeholder -->
                                    <div
                                        v-if="mergedResult.steps.length === 0"
                                        class="py-10 text-center text-gray-400 text-sm italic"
                                    >
                                        생성된 절차가 없습니다. AI 자동 병합을
                                        실행하세요.
                                    </div>
                                </div>
                                <div
                                    class="p-2 border-t border-gray-100 bg-gray-50 text-right"
                                >
                                    <button
                                        @click="
                                            mergedResult.steps.push({
                                                action: '',
                                                expected: '',
                                            })
                                        "
                                        class="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1 flex items-center gap-1 ml-auto"
                                    >
                                        <span
                                            class="material-icons-outlined text-[14px]"
                                            >add</span
                                        >
                                        단계 추가
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div
                    class="p-4 border-t border-gray-200 bg-white flex justify-between items-center pr-24"
                >
                    <button
                        @click="mergeStep = 'idle'"
                        class="text-gray-500 hover:text-gray-800 font-bold text-sm px-4 py-2"
                    >
                        취소 및 뒤로가기
                    </button>
                    <button
                        @click="handleConfirmMerge"
                        :disabled="mergeStep !== 'review'"
                        class="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span class="material-icons-outlined">save_alt</span>
                        병합 확정 (기존 TC 교체하기)
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
