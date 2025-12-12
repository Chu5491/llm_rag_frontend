<script setup lang="ts">
import {ref, computed} from "vue";
import type {TestCase} from "../types/testcase.js";

const props = defineProps<{testCases?: TestCase[]; contexts?: any[]}>();

// 정렬 상태
const sortKey = ref<keyof TestCase | "testcase_id">("testcase_id");
const sortOrder = ref<"asc" | "desc">("asc");

// 펼쳐진 행
const expandedRows = ref(new Set<string | number>());

// 테스트케이스 존재 여부
const hasTestCases = computed(() => (props.testCases?.length ?? 0) > 0);
const hasContexts = computed(() => props.contexts && props.contexts.length > 0);

// 정렬된 테스트케이스
const sortedTestCases = computed(() => {
    const cases = [...(props.testCases || [])] as TestCase[];
    cases.sort((a, b) => {
        const aVal = a[sortKey.value] ?? "";
        const bVal = b[sortKey.value] ?? "";
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortOrder.value === "asc" ? cmp : -cmp;
    });
    return cases;
});

// 정렬 토글
const toggleSort = (key: keyof TestCase | "testcase_id") => {
    if (sortKey.value === key) {
        sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
    } else {
        sortKey.value = key;
        sortOrder.value = "asc";
    }
};

// 행 펼치기/접기
const toggleRow = (id: string | number) => {
    if (expandedRows.value.has(id)) {
        expandedRows.value.delete(id);
    } else {
        expandedRows.value.add(id);
    }
    // Set 자체를 새로 할당해서 반응성 트리거
    expandedRows.value = new Set(expandedRows.value);
};

// JSON 복사
const copyAsJson = async () => {
    try {
        await navigator.clipboard.writeText(
            JSON.stringify(props.testCases, null, 2)
        );
        alert("JSON이 클립보드에 복사되었습니다!");
    } catch {
        alert("복사 실패");
    }
};
</script>

<template>
    <section class="rounded-lg bg-white p-4 shadow space-y-4">
        <!-- 헤더 / 액션 -->
        <header class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-gray-900">
                테스트케이스 목록
            </h2>
            <button
                type="button"
                class="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                @click="copyAsJson"
                :disabled="!hasTestCases"
            >
                📋
                <span class="ml-1">JSON 복사</span>
            </button>
        </header>

        <!-- 데이터 없을 때 -->
        <p v-if="!hasTestCases" class="text-sm text-gray-500">
            아직 생성된 테스트케이스가 없습니다.
        </p>

        <!-- 테이블 -->
        <div
            v-else
            class="overflow-x-auto rounded-lg border border-gray-100 bg-white"
        >
            <table class="min-w-full text-sm">
                <thead class="bg-gray-50 text-xs font-medium text-gray-500">
                    <tr>
                        <th class="w-10 px-3 py-2 text-left"></th>
                        <th
                            class="w-32 px-3 py-2 text-left cursor-pointer select-none"
                            @click="toggleSort('testcase_id')"
                        >
                            ID
                            <span
                                v-if="sortKey === 'testcase_id'"
                                class="ml-1 text-[10px] text-gray-500"
                            >
                                {{ sortOrder === "asc" ? "↑" : "↓" }}
                            </span>
                        </th>
                        <th
                            class="px-3 py-2 text-left cursor-pointer select-none"
                            @click="toggleSort('title')"
                        >
                            제목
                            <span
                                v-if="sortKey === 'title'"
                                class="ml-1 text-[10px] text-gray-500"
                            >
                                {{ sortOrder === "asc" ? "↑" : "↓" }}
                            </span>
                        </th>
                        <th
                            class="px-3 py-2 text-left cursor-pointer select-none"
                            @click="toggleSort('title')"
                        >
                            기능
                            <span
                                v-if="sortKey === 'title'"
                                class="ml-1 text-[10px] text-gray-500"
                            >
                                {{ sortOrder === "asc" ? "↑" : "↓" }}
                            </span>
                        </th>
                        <th
                            class="w-32 px-3 py-2 text-left cursor-pointer select-none"
                            @click="toggleSort('priority')"
                        >
                            우선순위
                            <span
                                v-if="sortKey === 'priority'"
                                class="ml-1 text-[10px] text-gray-500"
                            >
                                {{ sortOrder === "asc" ? "↑" : "↓" }}
                            </span>
                        </th>
                        <th class="px-3 py-2 text-left">예상 결과</th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-gray-100">
                    <template
                        v-for="tc in sortedTestCases"
                        :key="tc.testcase_id"
                    >
                        <!-- 메인 행 -->
                        <tr
                            class="cursor-pointer hover:bg-gray-50"
                            :class="{
                                'bg-gray-50': expandedRows.has(tc.testcase_id),
                            }"
                            @click="toggleRow(tc.testcase_id)"
                        >
                            <td class="px-3 py-2 text-center align-top">
                                {{
                                    expandedRows.has(tc.testcase_id) ? "▼" : "▶"
                                }}
                            </td>
                            <td class="px-3 py-2 align-top">
                                <code class="text-xs font-mono text-indigo-600">
                                    {{ tc.testcase_id }}
                                </code>
                            </td>
                            <td class="px-3 py-2 align-top">
                                {{ tc.title }}
                            </td>
                            <td class="px-3 py-2 align-top">
                                {{ tc.module }}
                            </td>
                            <td class="px-3 py-2 align-top">
                                <span
                                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                                    :class="[
                                        tc.priority === 'High'
                                            ? 'bg-red-100 text-red-700'
                                            : tc.priority === 'Medium'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-green-100 text-green-700',
                                    ]"
                                >
                                    {{ tc.priority }}
                                </span>
                            </td>
                            <td class="px-3 py-2 align-top">
                                {{ tc.expected_result }}
                            </td>
                        </tr>

                        <!-- 펼쳐진 상세 행 -->
                        <tr v-if="expandedRows.has(tc.testcase_id)">
                            <td colspan="6" class="p1-8 pb-4">
                                <div
                                    class="grid gap-4 rounded-md bg-gray-50 p-4 text-sm text-gray-700 md:grid-cols-3"
                                >
                                    <section class="md:col-span-1 space-y-1">
                                        <h4
                                            class="text-xs font-semibold text-gray-500"
                                        >
                                            사전 조건
                                        </h4>
                                        <p>
                                            {{ tc.preconditions || "-" }}
                                        </p>
                                    </section>

                                    <section class="md:col-span-2 space-y-1">
                                        <h4
                                            class="text-xs font-semibold text-gray-500"
                                        >
                                            테스트 단계
                                        </h4>
                                        <ol
                                            class="list-decimal list-inside space-y-1"
                                        >
                                            <li
                                                v-for="(step, idx) in tc.steps"
                                                :key="idx"
                                            >
                                                {{
                                                    step.replace(
                                                        /^\d+\.\s*/,
                                                        ""
                                                    )
                                                }}
                                            </li>
                                        </ol>
                                    </section>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </section>
    <!-- 컨텍스트 영역 -->
    <section v-if="hasContexts">
        <details class="overflow-hidden rounded-lg bg-white shadow">
            <summary
                class="flex cursor-pointer items-center bg-gray-50 px-6 py-4 transition-colors hover:bg-gray-100"
            >
                <span class="text-lg font-medium text-gray-900">
                    사용된 컨텍스트 ({{ props.contexts?.length ?? 0 }}개)
                </span>
                <svg
                    class="ml-2 h-5 w-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </summary>

            <div class="space-y-4 p-6">
                <article
                    v-for="(ctx, idx) in contexts"
                    :key="idx"
                    class="rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-gray-200"
                >
                    <div class="flex items-center justify-between">
                        <span
                            class="rounded bg-indigo-50 px-2 py-1 text-sm font-medium text-indigo-600"
                        >
                            #{{ idx + 1 }} ·
                            {{ ctx.meta?.source || "알 수 없는 출처" }}
                        </span>
                    </div>

                    <pre
                        class="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-gray-700"
                        >{{ ctx.text }}</pre
                    >
                </article>
            </div>
        </details>
    </section>
</template>
