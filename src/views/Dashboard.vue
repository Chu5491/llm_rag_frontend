<script setup lang="ts">
import {ref, computed} from "vue";
import TestCaseTable from "../components/TestCaseTable.vue";
import type {TestCase} from "../types/testcase.js";
import {generateTestCases} from "../services/api.js";

// 소스 타입
const sourceType = ref<"file" | "figma">("file");

// 테스트케이스 결과
const testCases = ref<TestCase[]>([]);
const isLoading = ref<boolean>(false);
const error = ref<string | null>(null);

// 컨텍스트 정보
const contexts = ref<any[]>([]);

// 테스트케이스 생성
const handleGenerate = async () => {
    isLoading.value = true;
    error.value = null;
    testCases.value = [];

    const endpoint =
        sourceType.value === "file"
            ? "/api/v1/rag/generate/file"
            : "/api/v1/rag/generate/figma";

    try {
        const data = await generateTestCases(endpoint);
        parseResponse(data);
    } catch (e: any) {
        error.value = e?.message ?? "Unknown error";
    } finally {
        isLoading.value = false;
    }
};

// 응답 파싱
const parseResponse = (data: any) => {
    contexts.value = data.contexts || [];

    try {
        const parsed = JSON.parse(data.answer);
        if (Array.isArray(parsed)) {
            testCases.value = parsed;
        } else {
            testCases.value = [];
        }
    } catch {
        testCases.value = [];
        error.value = "JSON 파싱 실패: " + data.answer?.substring(0, 100);
    }
};

// 통계
const stats = computed(() => ({
    total: testCases.value.length,
    high: testCases.value.filter((tc: TestCase) => tc.priority === "High")
        .length,
    medium: testCases.value.filter((tc: TestCase) => tc.priority === "Medium")
        .length,
    low: testCases.value.filter((tc: TestCase) => tc.priority === "Low").length,
}));

const hasTestCases = computed(() => testCases.value.length > 0);
const hasContexts = computed(() => contexts.value.length > 0);
</script>

<template>
    <!-- 대시보드 메인 래퍼 -->
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 -->
        <header>
            <h1 class="text-2xl font-semibold text-gray-900">
                QA 테스트케이스 생성
            </h1>
            <p class="mt-1 text-sm text-gray-500">
                PDF 문서 또는 Figma 디자인을 기반으로 테스트케이스를 자동
                생성합니다.
            </p>
        </header>

        <!-- 메인 카드 -->
        <section class="rounded-lg bg-white p-6 shadow space-y-6">
            <!-- 소스 타입 선택 + 생성 버튼 -->
            <div class="flex flex-wrap items-center gap-4">
                <div class="flex items-center space-x-6">
                    <label class="flex cursor-pointer items-center space-x-2">
                        <input
                            v-model="sourceType"
                            type="radio"
                            value="file"
                            class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span class="text-gray-700">📄 File</span>
                    </label>

                    <label class="flex cursor-pointer items-center space-x-2">
                        <input
                            v-model="sourceType"
                            type="radio"
                            value="figma"
                            class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span class="text-gray-700">🎨 Figma</span>
                    </label>
                </div>

                <button
                    class="ml-auto inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="isLoading"
                    @click="handleGenerate"
                >
                    <span
                        v-if="isLoading"
                        class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    />
                    <span class="mr-1"></span>
                    <span class="ml-1">
                        {{ isLoading ? "생성 중..." : "테스트케이스 생성" }}
                    </span>
                </button>
            </div>

            <!-- 에러 메시지 -->
            <div
                v-if="error"
                class="rounded border border-red-100 bg-red-50 p-3 text-sm text-red-700"
            >
                ⚠️ {{ error }}
            </div>

            <!-- 통계 카드 -->
            <section
                v-if="hasTestCases"
                class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <!-- Total -->
                <article
                    class="rounded-lg bg-white p-4 shadow hover:shadow-md transition-shadow"
                >
                    <div class="text-2xl font-bold text-gray-900">
                        {{ stats.total }}
                    </div>
                    <div class="mt-1 text-sm text-gray-500">
                        전체 테스트 케이스
                    </div>
                </article>

                <!-- High Priority -->
                <article
                    class="rounded-lg bg-white p-4 shadow hover:shadow-md transition-shadow"
                >
                    <div class="text-2xl font-bold text-red-600">
                        {{ stats.high }}
                    </div>
                    <div class="mt-1 text-sm text-gray-500">높음 우선순위</div>
                </article>

                <!-- Medium Priority -->
                <article
                    class="rounded-lg bg-white p-4 shadow hover:shadow-md transition-shadow"
                >
                    <div class="text-2xl font-bold text-yellow-500">
                        {{ stats.medium }}
                    </div>
                    <div class="mt-1 text-sm text-gray-500">중간 우선순위</div>
                </article>

                <!-- Low Priority -->
                <article
                    class="rounded-lg bg-white p-4 shadow hover:shadow-md transition-shadow"
                >
                    <div class="text-2xl font-bold text-green-600">
                        {{ stats.low }}
                    </div>
                    <div class="mt-1 text-sm text-gray-500">낮음 우선순위</div>
                </article>
            </section>

            <!-- 테스트케이스 테이블 -->
            <section
                v-if="hasTestCases"
                class="overflow-hidden rounded-lg bg-white shadow"
            >
                <TestCaseTable :testCases="testCases" />
            </section>

            <!-- 컨텍스트 영역 -->
            <section v-if="hasContexts">
                <details class="overflow-hidden rounded-lg bg-white shadow">
                    <summary
                        class="flex cursor-pointer items-center bg-gray-50 px-6 py-4 transition-colors hover:bg-gray-100"
                    >
                        <span class="text-lg font-medium text-gray-900">
                            사용된 컨텍스트 ({{ contexts.length }}개)
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
        </section>
    </main>
</template>
