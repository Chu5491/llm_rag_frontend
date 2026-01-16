<script setup lang="ts">
import type {ClusterItem} from "../types/clustering.js";

import {ref} from "vue";
import {useAlert} from "../composables/useAlert.js";
import {deleteTestCase} from "../services/testcaseApi.js";

// --- Props & Emits ---
const props = defineProps<{
    cluster: ClusterItem;
}>();

const emit = defineEmits<{
    (e: "close"): void;
    (e: "delete-tc", id: number): void; // 상위 삭제 처리용 (필요 시 유지)
}>();

const {showAlert, showConfirm} = useAlert();

// --- 상태 ---
const expandedItems = ref<Set<string>>(new Set());
const isDraftMode = ref(false);

const toggleExpand = (id: string) => {
    if (expandedItems.value.has(id)) {
        expandedItems.value.delete(id);
    } else {
        expandedItems.value.add(id);
    }
};

// 테스트케이스 삭제 핸들러
const handleDelete = async (id: number) => {
    const confirmed = await showConfirm(
        "정말로 이 테스트케이스를 삭제하시겠습니까? 되돌릴 수 없습니다.",
        "삭제 확인"
    );
    if (!confirmed) return;

    try {
        await deleteTestCase(id);

        // UI 목록에서 제거 (Props 직접 수정 - Vue 3 반응형 활용)
        const idx = props.cluster.testcases.findIndex((tc) => tc.id === id);
        if (idx !== -1) {
            props.cluster.testcases.splice(idx, 1);
            props.cluster.count--;
        }

        await showAlert("삭제되었습니다.", "성공");
    } catch (error) {
        console.error("Test Case Delete Error:", error);
        await showAlert("삭제 중 오류가 발생했습니다.", "오류");
    }
};

// --- 헬퍼 함수 ---
// 필요 시 여기에 추가 (예: 날짜 포맷팅 등)
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
                    TC 병합
                </h3>
            </div>
            <div class="flex gap-2">
                <button
                    v-if="!isDraftMode"
                    @click="isDraftMode = true"
                    class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <span class="material-icons-outlined text-[18px]"
                        >play_arrow</span
                    >
                    병합 시작
                </button>
                <button
                    v-else
                    class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <span class="material-icons-outlined text-[18px]"
                        >save</span
                    >
                    저장 후 대체
                </button>
                <button
                    class="ml-2 text-gray-400 hover:text-gray-600"
                    @click="emit('close')"
                >
                    <span class="material-icons-outlined">close</span>
                </button>
            </div>
        </div>

        <!-- 메인 콘텐츠 영역 (스크롤) -->
        <div class="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30">
            <section>
                <div class="flex items-center justify-between mb-4">
                    <h4
                        class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"
                    >
                        <span class="material-icons-outlined text-[18px]"
                            >inventory_2</span
                        >
                        병합 대상 TC
                    </h4>
                    <p class="text-[14px] text-gray-400">
                        유사 TC {{ cluster.count }}개
                    </p>
                </div>

                <div class="space-y-3">
                    <!-- Uniform TC List -->
                    <div
                        v-for="tc in cluster.testcases"
                        :key="tc.id"
                        class="border-2 border-transparent hover:border-indigo-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all"
                        :class="{
                            'border-indigo-200! ring-2 ring-indigo-50':
                                expandedItems.has(String(tc.id)),
                        }"
                    >
                        <!-- Header -->
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
                                <span
                                    class="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-mono font-bold rounded border border-gray-200 shrink-0"
                                    >{{
                                        tc.testcase_id_tag || `TC-${tc.id}`
                                    }}</span
                                >
                                <span
                                    class="text-sm font-bold text-gray-700 truncate block"
                                    >{{ tc.title }}</span
                                >
                            </div>
                            <button
                                @click.stop="handleDelete(tc.id)"
                                class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="이 테스트케이스 삭제"
                            >
                                <span
                                    class="material-icons-outlined text-[18px]"
                                    >delete_outline</span
                                >
                            </button>
                        </div>

                        <div
                            v-show="expandedItems.has(String(tc.id))"
                            class="p-4 grid grid-cols-12 gap-6 bg-white border-t border-gray-100"
                        >
                            <div class="col-span-4 flex flex-col gap-6">
                                <div>
                                    <div
                                        class="flex justify-between items-center mb-2"
                                    >
                                        <label
                                            class="text-[11px] font-bold text-gray-400 uppercase"
                                            >선행 조건</label
                                        >
                                    </div>
                                    <div
                                        class="text-[12px] p-3 bg-gray-50 rounded-lg border border-gray-100 leading-relaxed text-gray-700 wrap-break-word"
                                    >
                                        {{ tc.preconditions || "-" }}
                                    </div>
                                </div>
                                <div>
                                    <div
                                        class="flex justify-between items-center mb-2"
                                    >
                                        <label
                                            class="text-[11px] font-bold text-gray-400 uppercase"
                                            >최종 결과</label
                                        >
                                    </div>
                                    <div
                                        class="text-[12px] p-3 bg-gray-50 rounded-lg border border-gray-100 leading-relaxed text-gray-700 wrap-break-word"
                                    >
                                        {{ tc.expected_result || "-" }}
                                    </div>
                                </div>
                            </div>
                            <div class="col-span-8">
                                <div
                                    class="flex justify-between items-center mb-2"
                                >
                                    <label
                                        class="text-[11px] font-bold text-gray-400 uppercase"
                                        >수행 절차</label
                                    >
                                </div>
                                <div class="space-y-3">
                                    <div
                                        v-for="(step, idx) in tc.steps || []"
                                        :key="idx"
                                        class="flex gap-3 group"
                                    >
                                        <span
                                            class="text-[11px] font-mono text-gray-400 pt-2 shrink-0 w-4"
                                            >{{ idx + 1 }}.</span
                                        >
                                        <div
                                            class="flex-1 grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100"
                                        >
                                            <div class="flex flex-col gap-1">
                                                <span
                                                    class="text-[10px] font-bold text-indigo-400 uppercase"
                                                    >Action</span
                                                >
                                                <p
                                                    class="text-[12px] text-gray-700 leading-relaxed"
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
                                                    class="text-[12px] text-gray-600 leading-relaxed"
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

        <!-- Consolidated Result Draft (하단 고정/편집 영역) -->
        <div
            v-if="isDraftMode"
            class="border-t border-indigo-200 bg-indigo-50/50 p-6 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] z-20 shrink-0"
        >
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                    <span
                        class="material-icons-outlined text-indigo-600 font-bold"
                        >edit_note</span
                    >
                    <h4 class="text-sm font-bold text-gray-800">
                        최종 병합 결과 (New Target TC)
                    </h4>
                    <span
                        class="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded flex items-center gap-1"
                    >
                        <span class="material-icons-outlined text-[12px]"
                            >check_circle</span
                        >
                        Auto-saving
                    </span>
                </div>
                <div class="flex gap-2">
                    <button
                        class="px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:text-gray-800"
                    >
                        초기화 (Clear)
                    </button>
                    <button
                        class="flex items-center gap-1 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[11px] font-bold hover:shadow-sm"
                    >
                        <span class="material-icons-outlined text-[16px]"
                            >history</span
                        >
                        기록
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-6">
                <div class="col-span-5 space-y-4">
                    <div class="space-y-1.5">
                        <label
                            class="text-[11px] font-bold text-gray-500 uppercase tracking-tight"
                            >통합된 제목</label
                        >
                        <input
                            class="w-full text-sm font-bold rounded-lg border-indigo-100 focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm bg-white"
                            type="text"
                            v-model="cluster.title"
                        />
                    </div>
                    <div class="space-y-1.5">
                        <label
                            class="text-[11px] font-bold text-gray-500 uppercase tracking-tight"
                            >통합된 전제 조건</label
                        >
                        <textarea
                            class="w-full text-xs rounded-lg border-indigo-100 focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm h-32 bg-white leading-relaxed resize-none"
                            v-model="cluster.description"
                        ></textarea>
                    </div>
                </div>
                <div class="col-span-7 flex flex-col">
                    <label
                        class="text-[11px] font-bold text-gray-500 uppercase tracking-tight mb-1.5"
                        >통합된 절차 및 기대 결과</label
                    >
                    <!-- 높이 수정: h-[260px] -> h-[400px]로 확장 -->
                    <div
                        class="flex-1 bg-white border border-indigo-100 rounded-lg shadow-sm overflow-y-auto h-[400px]"
                    >
                        <table class="w-full text-[12px]">
                            <thead
                                class="bg-gray-50 sticky top-0 border-b border-indigo-50"
                            >
                                <tr class="text-left">
                                    <th
                                        class="py-1.5 px-3 font-bold text-gray-400 w-10"
                                    >
                                        #
                                    </th>
                                    <th
                                        class="py-1.5 px-2 font-bold text-gray-400"
                                    >
                                        Step Description
                                    </th>
                                    <th class="py-1.5 px-3 text-right"></th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50">
                                <tr
                                    v-for="(step, idx) in cluster.testcases[0]
                                        ?.steps || []"
                                    :key="idx"
                                    class="hover:bg-gray-50"
                                >
                                    <td
                                        class="py-2 px-3 text-gray-400 font-mono"
                                    >
                                        {{ idx + 1 }}
                                    </td>
                                    <td class="py-2 px-2">
                                        {{ step.action }}
                                    </td>
                                    <td class="py-2 px-3 text-right">
                                        <button
                                            class="text-gray-300 hover:text-red-500"
                                        >
                                            <span
                                                class="material-icons-outlined text-[16px]"
                                                >close</span
                                            >
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="mt-2 text-right">
                        <button
                            class="text-[10px] font-bold text-indigo-600 flex items-center gap-1 ml-auto"
                        >
                            <span class="material-icons-outlined text-[14px]"
                                >add</span
                            >
                            사용자 정의 단계 추가
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
