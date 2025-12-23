<script setup lang="ts">
import {ref, onMounted, onUnmounted} from "vue";
import {
    fetchHistories,
    fetchHistoryDetail,
    pollRunningItems,
    cancelGeneration,
} from "../services/api.js";

import type {
    GenerationItem,
    GenerationStatus,
    HistoryDetailResponse,
} from "../types/Generate.js";
import TestCaseTable from "../components/TestCaseTable.vue";

// 상태 변수들
const histories = ref<GenerationItem[]>([]);
const selectedHistoryId = ref<number | null>(null);
const selectedHistory = ref<HistoryDetailResponse | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);
const isDetailLoading = ref(false);
const detailError = ref<string | null>(null);
const stopPolling = ref<() => void>(); // 폴링을 중지하기 위한 함수 참조
const detailRequestSeq = ref(0);
const POLL_INTERVAL_MS = 3000;

// 진행 중인 항목들의 최신 상태를 histories에 반영.
const updateRunningItems = (details: HistoryDetailResponse[]) => {
    details.forEach((detail) => {
        const index = histories.value.findIndex(
            (item) => item.id === detail.id
        );
        if (index !== -1) {
            // 기존 항목을 새 정보로 업데이트 (불변성 유지)
            histories.value[index] = {...histories.value[index], ...detail};
        }
    });

    // running 항목이 더 이상 없으면 폴링을 자동 중지
    if (!histories.value.some((item) => item.status === "running")) {
        if (stopPolling.value) {
            stopPolling.value();
            stopPolling.value = undefined;
        }
    }
};

// 히스토리 목록을 조회하고 필요 시(running 존재) 폴링을 시작.
const loadHistories = async () => {
    try {
        isLoading.value = true;
        error.value = null;

        // 목록 갱신 시, 열려있는 상세 패널 상태를 초기화
        detailRequestSeq.value += 1;
        selectedHistoryId.value = null;
        selectedHistory.value = null;
        isDetailLoading.value = false;
        detailError.value = null;

        // 기존 폴링이 실행 중이면 중지
        if (stopPolling.value) {
            stopPolling.value();
            stopPolling.value = undefined;
        }
        // 히스토리 목록 가져오기
        const data = await fetchHistories();
        histories.value = data;
        // 진행 중인 항목만 필터링
        const runningItems = data.filter((item) => item.status === "running");

        // 진행 중인 항목이 있으면 폴링 시작 (3초마다 업데이트)
        if (runningItems.length > 0) {
            stopPolling.value = pollRunningItems(
                runningItems.map((item) => item.id),
                updateRunningItems,
                POLL_INTERVAL_MS
            );
        }
    } catch (err) {
        console.error("히스토리 조회 중 오류 발생:", err);
        error.value = "히스토리 조회 중 오류가 발생했습니다.";
    } finally {
        isLoading.value = false;
    }
};

// 컴포넌트가 마운트되면 데이터 로드 시작
onMounted(() => {
    loadHistories();
});

// 컴포넌트가 언마운트되면 폴링 정리
onUnmounted(() => {
    if (stopPolling.value) {
        stopPolling.value();
    }

    detailRequestSeq.value += 1;
});

// 히스토리 목록을 다시 불러옵니다.
const handleRefresh = () => {
    loadHistories();
};

// (추후) 필터 UI를 열기 위한 핸들러입니다.
const handleFilter = () => {
    console.log("필터 버튼 클릭");
};

// 상태 체크를 위한 타입 가드 함수
const isCompleted = (
    status: GenerationStatus
): status is "success" | "failed" =>
    status === "success" || status === "failed";

// 성공 또는 실행 중 상태인지 판별합니다.
const isSuccessOrRunning = (
    status: GenerationStatus
): status is "success" | "running" =>
    status === "success" || status === "running";

// 상태 배지 색상을 반환합니다.
const getStatusColor = (status: GenerationStatus) => {
    if (status === "running") return "bg-blue-100 text-blue-700";
    if (status === "success") return "bg-green-100 text-green-700";
    if (status === "cancelled") return "bg-gray-100 text-gray-700";
    return "bg-red-100 text-red-700";
};

// 상태 텍스트를 반환합니다.
const statusText = (status: GenerationStatus) => {
    if (status === "running") return "Running";
    if (status === "success") return "Success";
    if (status === "cancelled") return "Cancelled";
    return "Failed";
};

// 상태 배지 클래스명을 반환합니다.
const statusBadgeClass = (status: GenerationStatus) => {
    return getStatusColor(status);
};

// ISO 날짜 문자열을 로컬 시간 문자열로 포맷합니다.
const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
};

// duration 값을 UI 표시용으로 포맷합니다.
const formatDuration = (value?: string | null) => {
    if (!value) return "-";

    try {
        // PT1M18.073085S -> "1m 18s" 형식으로 변환
        const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+\.?\d*)S)?/;
        const matches = value.match(regex);

        if (!matches) return value; // 형식이 안 맞는 경우 원본 반환

        const [, hours, minutes, seconds] = matches;
        const parts = [];

        if (hours) parts.push(`${parseInt(hours, 10)}h`);
        if (minutes) parts.push(`${parseInt(minutes, 10)}m`);
        if (seconds) parts.push(`${parseFloat(seconds).toFixed(0)}s`);

        return parts.length > 0 ? parts.join(" ") : "0s";
    } catch (e) {
        console.error("Duration 파싱 오류:", e);
        return value; // 오류 시 원본 반환
    }
};

// 로그 패널을 닫고 관련 상태를 초기화합니다.
const closeHistoryDetail = () => {
    detailRequestSeq.value += 1;
    selectedHistoryId.value = null;
    selectedHistory.value = null;
    isDetailLoading.value = false;
    detailError.value = null;
};

// 선택된 히스토리의 상세(로그)를 토글/조회합니다.
const handleHistoryClick = async (id: number) => {
    if (selectedHistoryId.value === id) {
        closeHistoryDetail();
        return;
    }

    selectedHistoryId.value = id;
    const seq = ++detailRequestSeq.value;
    isDetailLoading.value = true;
    detailError.value = null;
    selectedHistory.value = null;

    try {
        const detail = await fetchHistoryDetail(id);
        if (seq !== detailRequestSeq.value) return;
        if (selectedHistoryId.value !== id) return;
        selectedHistory.value = detail;
    } catch (err) {
        console.error("히스토리 상세 조회 중 오류 발생:", err);
        if (seq !== detailRequestSeq.value) return;
        if (selectedHistoryId.value !== id) return;
        detailError.value = "히스토리 상세 조회 중 오류가 발생했습니다.";
    } finally {
        if (seq !== detailRequestSeq.value) return;
        if (selectedHistoryId.value !== id) return;
        isDetailLoading.value = false;
    }
};

// 작업을 중단합니다.
const handleCancel = async (id: number) => {
    if (!confirm("정말로 작업을 중단하시겠습니까?")) return;

    try {
        await cancelGeneration(id);
        // 즉시 목록 갱신
        loadHistories();
    } catch (err) {
        console.error("작업 중단 중 오류 발생:", err);
        alert("작업 중단에 실패했습니다.");
    }
};
</script>

<template>
    <!-- 기존 자동생성/대시보드랑 같은 레이아웃 -->
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 -->
        <header
            class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        >
            <div>
                <p class="mt-1 text-sm text-gray-500">
                    테스트케이스 자동생성 실행 내역과 상태를 확인합니다.
                </p>
                <p v-if="error" class="mt-1 text-sm text-red-500">
                    {{ error }}
                </p>
            </div>

            <div class="flex items-center gap-3 mt-2 md:mt-0">
                <button
                    type="button"
                    class="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                    title="새로고침"
                    @click="handleRefresh"
                >
                    <span class="material-icons-outlined">refresh</span>
                </button>
                <button
                    type="button"
                    class="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                    title="필터"
                    @click="handleFilter"
                >
                    <span class="material-icons-outlined">filter_list</span>
                </button>
                <RouterLink
                    to="/generate/new"
                    type="button"
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                    title="새 자동생성"
                >
                    <span class="material-icons-outlined">add</span>
                </RouterLink>
            </div>
        </header>

        <!-- 메인 카드 -->
        <section class="rounded-lg bg-white p-6 shadow space-y-4">
            <!-- 로딩 중일 때 표시 -->
            <div v-if="isLoading" class="flex justify-center py-8">
                <div
                    class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"
                ></div>
            </div>

            <!-- 히스토리 카드 리스트 -->
            <template v-else-if="histories.length > 0">
                <template v-for="item in histories" :key="item.id">
                    <article
                        class="group flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-start"
                        :class="[
                            item.status === 'running'
                                ? 'border-indigo-300 bg-indigo-50/60'
                                : '',
                            selectedHistoryId === item.id
                                ? 'ring-2 ring-indigo-500'
                                : '',
                        ]"
                    >
                        <!-- 상태 아이콘 -->
                        <div class="shrink-0">
                            <div
                                class="flex h-11 w-11 items-center justify-center rounded-full"
                                :class="[
                                    item.status === 'running'
                                        ? 'bg-blue-100'
                                        : item.status === 'success'
                                        ? 'bg-green-100'
                                        : 'bg-red-100',
                                ]"
                            >
                                <span
                                    v-if="item.status === 'running'"
                                    class="material-icons-outlined text-xl text-indigo-600 animate-[spin_0.8s_linear_infinite_reverse]"
                                >
                                    sync
                                </span>
                                <span
                                    v-else-if="item.status === 'success'"
                                    class="material-icons-outlined text-2xl text-green-600"
                                >
                                    check_circle_outline
                                </span>
                                <span
                                    v-else-if="item.status === 'cancelled'"
                                    class="material-icons-outlined text-2xl text-gray-500"
                                >
                                    block
                                </span>
                                <span
                                    v-else
                                    class="material-icons-outlined text-2xl text-red-500"
                                >
                                    highlight_off
                                </span>
                            </div>
                        </div>

                        <!-- 본문 영역 -->
                        <div class="min-w-0 flex-1">
                            <div
                                class="mb-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <h3
                                    class="truncate text-sm font-semibold text-gray-900"
                                >
                                    #{{ item.id }} {{ item.title }}
                                    <span class="text-xs text-gray-500 ml-2">{{
                                        item.model_name
                                    }}</span>
                                </h3>
                                <span
                                    class="inline-flex items-center rounded px-2 py-1 text-xs font-medium"
                                    :class="statusBadgeClass(item.status)"
                                >
                                    {{ statusText(item.status) }}
                                </span>
                            </div>

                            <!-- Running: 프로그레스바 -->
                            <div v-if="item.status === 'running'" class="mt-2">
                                <div
                                    class="flex justify-between text-xs text-gray-500 mb-1"
                                >
                                    <span
                                        >진행 중 ({{ item.current_batch }}/{{
                                            item.total_batches
                                        }})</span
                                    >
                                    <span>{{ item.progress }}%</span>
                                </div>
                                <div
                                    class="h-2 w-full rounded-full bg-gray-200"
                                >
                                    <div
                                        class="h-2 rounded-full bg-indigo-500"
                                        :style="{
                                            width: `${item.progress}%`,
                                        }"
                                    />
                                </div>
                                <p
                                    class="mt-1 text-xs text-gray-500 flex items-center gap-2"
                                >
                                    <span>{{
                                        formatDate(item.started_at)
                                    }}</span>
                                    <span
                                        class="h-1 w-1 rounded-full bg-gray-300"
                                    />
                                    <span>Build #{{ item.id }}</span>
                                </p>
                            </div>

                            <!-- 완료/실패: 요약/시간 -->
                            <div v-else class="mt-1 space-y-1">
                                <p
                                    v-if="item.summary"
                                    :class="{
                                        'text-sm': true,
                                        'text-red-600 font-medium':
                                            isCompleted(item.status) &&
                                            item.status === 'failed',
                                        'text-gray-700': isSuccessOrRunning(
                                            item.status
                                        ),
                                    }"
                                >
                                    {{ item.summary }}
                                </p>
                                <p
                                    class="text-xs text-gray-500 flex items-center gap-2"
                                >
                                    <span>{{
                                        formatDate(item.started_at)
                                    }}</span>
                                    <template v-if="isCompleted(item.status)">
                                        <span
                                            class="h-1 w-1 rounded-full bg-gray-300"
                                        />
                                        <span class="flex items-center gap-1">
                                            <span
                                                class="material-icons-outlined text-[14px]"
                                                >timer</span
                                            >
                                            <span>{{
                                                formatDuration(item.duration)
                                            }}</span>
                                        </span>
                                    </template>
                                </p>
                            </div>
                        </div>

                        <!-- 우측 버튼 -->
                        <div
                            class="flex w-full shrink-0 justify-end gap-2 border-t pt-3 text-xs sm:ml-4 sm:w-auto sm:border-t-0 sm:border-l sm:pl-4 border-gray-200"
                        >
                            <button
                                type="button"
                                @click.stop="handleHistoryClick(item.id)"
                                class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100"
                            >
                                <span class="material-icons-outlined text-sm">
                                    description
                                </span>
                                {{
                                    selectedHistoryId === item.id
                                        ? "Hide Logs"
                                        : "Show Logs"
                                }}
                            </button>

                            <button
                                v-if="item.status === 'success'"
                                type="button"
                                class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100"
                            >
                                <span class="material-icons-outlined text-sm">
                                    bar_chart
                                </span>
                                Report
                            </button>

                            <button
                                v-else-if="
                                    item.status === 'failed' ||
                                    item.status === 'cancelled'
                                "
                                type="button"
                                class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100"
                            >
                                <span class="material-icons-outlined text-sm">
                                    restart_alt
                                </span>
                                Retry
                            </button>

                            <button
                                v-else-if="item.status === 'running'"
                                type="button"
                                @click.stop="handleCancel(item.id)"
                                class="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-gray-500 hover:bg-gray-100"
                                title="중지"
                            >
                                <span
                                    class="material-icons-outlined text-red-500"
                                >
                                    stop_circle
                                </span>
                            </button>
                        </div>
                    </article>

                    <div
                        v-if="selectedHistoryId === item.id"
                        class="rounded-lg border border-gray-200 bg-white p-4"
                    >
                        <div class="mb-4 flex items-center justify-between">
                            <h3 class="text-lg font-medium">실행 로그</h3>
                            <div class="flex items-center gap-2">
                                <span
                                    v-if="selectedHistory"
                                    class="text-sm text-gray-500"
                                >
                                    {{ formatDate(selectedHistory.started_at) }}
                                    <template
                                        v-if="selectedHistory.finished_at"
                                    >
                                        &nbsp;&bull;
                                        {{
                                            formatDuration(
                                                selectedHistory.duration
                                            )
                                        }}
                                    </template>
                                </span>
                                <button
                                    @click="closeHistoryDetail"
                                    class="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                    title="닫기"
                                >
                                    <span
                                        class="material-icons-outlined text-xl"
                                        >close</span
                                    >
                                </button>
                            </div>
                        </div>

                        <div
                            v-if="isDetailLoading"
                            class="flex justify-center py-4"
                        >
                            <div
                                class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"
                            ></div>
                        </div>

                        <div v-else-if="detailError" class="py-3">
                            <p class="text-sm text-red-500">
                                {{ detailError }}
                            </p>
                        </div>

                        <div
                            v-else
                            class="bg-gray-50 rounded-md overflow-hidden"
                        >
                            <div class="p-4 overflow-x-auto">
                                <pre
                                    class="text-sm font-mono text-gray-800 whitespace-pre-wrap wrap-break-word"
                                    >{{
                                        selectedHistory?.logs ||
                                        "로그가 없습니다."
                                    }}</pre
                                >
                            </div>
                        </div>

                        <div
                            v-if="selectedHistory?.result_data"
                            class="mt-4 pt-4 border-t border-gray-200"
                        >
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="font-medium">결과 데이터</h4>
                                <p
                                    class="text-xs text-gray-500"
                                    v-if="
                                        Array.isArray(
                                            selectedHistory.result_data
                                        )
                                    "
                                >
                                    총
                                    {{ selectedHistory.result_data.length }}개의
                                    테스트케이스
                                </p>
                            </div>

                            <div
                                class="border rounded-lg overflow-hidden border-gray-200"
                            >
                                <TestCaseTable
                                    v-if="
                                        Array.isArray(
                                            selectedHistory.result_data
                                        )
                                    "
                                    :test-cases="selectedHistory.result_data"
                                />
                                <pre
                                    v-else
                                    class="text-sm overflow-auto max-h-60"
                                    >{{
                                        JSON.stringify(
                                            selectedHistory.result_data,
                                            null,
                                            2
                                        )
                                    }}</pre
                                >
                            </div>
                        </div>
                    </div>
                </template>
            </template>

            <!-- 데이터가 없을 때 표시 -->
            <div v-else class="py-12 text-center text-gray-500">
                <p>조회된 히스토리가 없습니다.</p>
            </div>
        </section>
    </main>
</template>
