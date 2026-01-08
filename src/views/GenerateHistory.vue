<script setup lang="ts">
import {ref, onMounted, onUnmounted, computed} from "vue";
import {
    fetchHistories,
    fetchHistoryDetail,
    pollRunningItems,
    cancelGeneration,
    retryGeneration,
} from "../services/historyApi.js";
import {fetchProjects} from "../services/projectApi.js";

import type {
    GenerationItem,
    GenerationStatus,
    HistoryDetailResponse,
} from "../types/Generate.js";
import type {ProjectResponse} from "../types/project.js";
import Table, {type Column} from "../components/Table.vue";
import DateRangePicker from "../components/DateRangePicker.vue";

// 상태
const histories = ref<GenerationItem[]>([]);
const selectedHistoryId = ref<number | null>(null);
const selectedHistory = ref<HistoryDetailResponse | null>(null);
const isLoading = ref(true); // 로딩 상태
const error = ref<string | null>(null); // 에러 메시지
const isDetailLoading = ref(false); // 상세 내용 로딩
const detailError = ref<string | null>(null); // 상세 에러
const stopPolling = ref<() => void>(); // 폴링 중지 함수
const detailRequestSeq = ref(0);
const POLL_INTERVAL_MS = 3000;
const itemsPerPage = ref(10); // 테이블 페이지네이션
const searchQuery = ref(""); // 검색어
const selectedStatus = ref<"all" | GenerationStatus>("all"); // 상태 필터
const selectedProjectId = ref<number | "all">("all"); // 프로젝트 필터
const projects = ref<ProjectResponse[]>([]); // 프로젝트 목록
const isFilterOpen = ref(false); // 필터 팝업 표시

const dateRange = ref({start: "", end: ""}); // 날짜 필터 (Default: 전체)

// 프로젝트 가져오기
const loadProjects = async () => {
    try {
        const data = await fetchProjects(0, 100); // 드롭다운용 (최대 100개)
        projects.value = data;
    } catch (e) {
        console.error("Failed to load projects", e);
    }
};

// 검색 및 상태 필터링된 히스토리 리스트
const filteredHistories = computed(() => {
    let result = histories.value;

    // 1. 검색어 필터링
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(
            (item) =>
                item.title.toLowerCase().includes(query) ||
                item.model_name.toLowerCase().includes(query)
        );
    }

    // 2. 상태 필터링
    if (selectedStatus.value !== "all") {
        result = result.filter((item) => item.status === selectedStatus.value);
    }

    // 3. 프로젝트 필터링
    if (selectedProjectId.value !== "all") {
        result = result.filter(
            (item) => item.project_id === selectedProjectId.value
        );
    }

    // 4. 날짜 필터링
    if (dateRange.value.start || dateRange.value.end) {
        result = result.filter((item) => {
            const itemDate = new Date(item.started_at);
            // 시작 날짜 (00:00:00)
            if (dateRange.value.start) {
                const start = new Date(dateRange.value.start);
                start.setHours(0, 0, 0, 0);
                if (itemDate < start) return false;
            }
            // 종료 날짜 (23:59:59)
            if (dateRange.value.end) {
                const end = new Date(dateRange.value.end);
                end.setHours(23, 59, 59, 999);
                if (itemDate > end) return false;
            }
            return true;
        });
    }

    return result;
});

// 진행 중인 항목 상태 업데이트 (불변성 유지)
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

    // 실행 중인 항목이 없으면 폴링 중단
    if (!histories.value.some((item) => item.status === "running")) {
        if (stopPolling.value) {
            stopPolling.value();
            stopPolling.value = undefined;
        }
    }
};

// 목록 조회 및 폴링 시작
const loadHistories = async () => {
    try {
        isLoading.value = true;
        error.value = null;

        // 상세 패널 초기화
        detailRequestSeq.value += 1;
        selectedHistoryId.value = null;
        selectedHistory.value = null;
        isDetailLoading.value = false;
        detailError.value = null;

        // 폴링 중단
        if (stopPolling.value) {
            stopPolling.value();
            stopPolling.value = undefined;
        }

        // 히스토리 목록 가져오기
        const data = await fetchHistories();
        histories.value = data;
        // 진행 중인 항목만 필터링
        const runningItems = data.filter((item) => item.status === "running");

        // 실행 중인 항목 있으면 폴링 시작
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

// 마운트 시 데이터 로드
onMounted(() => {
    loadHistories();
    loadProjects();
});

// 언마운트 시 폴링 정리
onUnmounted(() => {
    if (stopPolling.value) {
        stopPolling.value();
    }

    detailRequestSeq.value += 1;
});

// 목록 새로고침
const handleRefresh = () => {
    loadHistories();
};

// ------------- 그룹핑 로직 -------------

// 날짜별 그룹핑 (검색/필터 적용 후)
const groupedHistories = computed(() => {
    const groups: {label: string; items: GenerationItem[]}[] = [];
    const sorted = [...filteredHistories.value].sort(
        (a, b) =>
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDate = (d1: Date, d2: Date) =>
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    sorted.forEach((item) => {
        const itemDate = new Date(item.started_at);
        let label = "";

        if (isSameDate(itemDate, today)) {
            label = "TODAY";
        } else if (isSameDate(itemDate, yesterday)) {
            label = "YESTERDAY";
        } else {
            label = itemDate.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
            });
        }

        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.label === label) {
            lastGroup.items.push(item);
        } else {
            groups.push({label, items: [item]});
        }
    });

    return groups;
});

// ------------- UI 유틸리티 -------------

const isCompleted = (
    status: GenerationStatus
): status is "success" | "failed" =>
    status === "success" || status === "failed";

const getStatusColorClass = (status: GenerationStatus) => {
    if (status === "running") return "text-blue-500 bg-blue-50 border-blue-100";
    if (status === "success")
        return "text-green-500 bg-green-50 border-green-100";
    if (status === "cancelled")
        return "text-gray-500 bg-gray-50 border-gray-100";
    return "text-red-500 bg-red-50 border-red-100";
};

// 시간 포맷 (오후 HH:mm:ss)
const formatTime = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    return d.toLocaleTimeString("ko-KR", {
        hour12: true,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
    });
};

// 소요시간 포맷 (PT1M18S -> 1m 54s)
const formatDuration = (value?: string | null) => {
    if (!value) return "-";
    try {
        const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+\.?\d*)S)?/;
        const matches = value.match(regex);
        if (!matches) return value;
        const [, hours, minutes, seconds] = matches;
        const parts = [];
        if (hours) parts.push(`${parseInt(hours, 10)}h`);
        if (minutes) parts.push(`${parseInt(minutes, 10)}m`);
        if (seconds) parts.push(`${parseFloat(seconds).toFixed(0)}s`);
        return parts.length > 0 ? parts.join(" ") : "0s";
    } catch (e) {
        return value;
    }
};

// 프로젝트 ID로 이름 조회
const getProjectName = (projectId: number) => {
    const project = projects.value.find((p) => p.id === projectId);
    return project ? project.name : `Project #${projectId}`;
};

// 로그 패널 닫기
const closeHistoryDetail = () => {
    selectedHistoryId.value = null;
    selectedHistory.value = null;
};

// 상세 토글
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
        selectedHistory.value = detail;
    } catch (err) {
        if (seq !== detailRequestSeq.value) return;
        detailError.value = "상세 조회 실패";
    } finally {
        if (seq !== detailRequestSeq.value) return;
        isDetailLoading.value = false;
    }
};

// 사용자 액션
const handleCancel = async (id: number) => {
    if (!confirm("정말로 작업을 중단하시겠습니까?")) return;
    try {
        await cancelGeneration(id);
        loadHistories();
    } catch (err) {
        alert("작업 중단 실패");
    }
};
const handleRetry = async (id: number) => {
    if (!confirm("재실행하시겠습니까?")) return;
    try {
        await retryGeneration(id);
        loadHistories();
    } catch (err) {
        alert("재실행 실패");
    }
};

// 테이블 컬럼 정의
const historyDetailColumns: Column[] = [
    {key: "testcase_id", label: "ID", width: "w-32", sortable: true},
    {key: "title", label: "제목", sortable: true},
    {key: "module", label: "기능", sortable: true},
    {key: "priority", label: "우선순위", width: "w-32", sortable: true},
    {key: "expected_result", label: "예상 결과", sortable: false},
];
</script>

<template>
    <main class="p-6 space-y-6">
        <!-- 헤더 -->
        <header
            class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        >
            <div>
                <p class="mt-1 text-sm text-gray-500">
                    테스트케이스 자동생성 실행 내역과 상태를 확인합니다.
                </p>
            </div>
            <div class="flex items-center gap-3 mt-2 md:mt-0">
                <button
                    @click="handleRefresh"
                    class="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                    title="새로고침"
                >
                    <span class="material-icons-outlined">refresh</span>
                </button>
                <RouterLink
                    to="/generate/new"
                    class="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    <span class="material-icons-outlined text-sm mr-1"
                        >add</span
                    >
                    새로 생성
                </RouterLink>
            </div>
        </header>

        <!-- 검색 및 필터 -->
        <div
            class="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm"
        >
            <div class="relative flex-1 w-full">
                <span
                    class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"
                >
                    <span class="material-icons-outlined">search</span>
                </span>
                <input
                    :value="searchQuery"
                    @input="
                        searchQuery = ($event.target as HTMLInputElement).value
                    "
                    type="text"
                    placeholder="Search by activity name..."
                    class="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-500 transition-all text-gray-800"
                />
            </div>

            <!-- 프로젝트 필터 -->
            <div class="hidden md:block w-48 shrink-0">
                <select
                    v-model="selectedProjectId"
                    class="w-full text-sm border-gray-300 rounded-md focus:border-indigo-500 focus:ring-indigo-500 bg-white py-2 pl-3 pr-8 shadow-sm cursor-pointer hover:bg-gray-50"
                >
                    <option value="all">전체 프로젝트</option>
                    <option v-for="p in projects" :key="p.id" :value="p.id">
                        {{ p.name }}
                    </option>
                </select>
            </div>

            <div class="h-6 w-px bg-gray-300 mx-1 hidden md:block"></div>

            <div class="relative">
                <button
                    @click="isFilterOpen = !isFilterOpen"
                    class="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
                >
                    <span class="material-icons-outlined text-gray-500"
                        >filter_list</span
                    >
                    <span class="text-sm font-medium">필터</span>
                    <span
                        v-if="
                            selectedStatus !== 'all' ||
                            dateRange.start ||
                            dateRange.end
                        "
                        class="flex h-2 w-2 rounded-full bg-indigo-500"
                    ></span>
                </button>

                <div
                    v-if="isFilterOpen"
                    class="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-100 z-10 p-4"
                >
                    <div
                        class="flex justify-between items-center mb-4 border-b border-gray-100 pb-2"
                    >
                        <h3 class="font-medium text-gray-900">Filters</h3>
                        <button
                            @click="
                                selectedStatus = 'all';
                                dateRange = {start: '', end: ''};
                            "
                            class="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            Reset
                        </button>
                    </div>

                    <div class="space-y-4">
                        <!-- Date Range -->
                        <div>
                            <label
                                class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
                                >Date Range</label
                            >
                            <!-- 날짜 선택기 -->
                            <DateRangePicker v-model="dateRange" />
                        </div>

                        <!-- Status Filter -->
                        <div>
                            <label
                                class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
                                >Status</label
                            >
                            <div class="grid grid-cols-2 gap-2">
                                <button
                                    @click="selectedStatus = 'all'"
                                    class="px-3 py-1.5 rounded text-xs font-medium border text-center transition-all"
                                    :class="
                                        selectedStatus === 'all'
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                    "
                                >
                                    전체
                                </button>
                                <button
                                    @click="selectedStatus = 'success'"
                                    class="px-3 py-1.5 rounded text-xs font-medium border text-center transition-all"
                                    :class="
                                        selectedStatus === 'success'
                                            ? 'bg-green-50 border-green-200 text-green-700'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                    "
                                >
                                    성공
                                </button>
                                <button
                                    @click="selectedStatus = 'failed'"
                                    class="px-3 py-1.5 rounded text-xs font-medium border text-center transition-all"
                                    :class="
                                        selectedStatus === 'failed'
                                            ? 'bg-red-50 border-red-200 text-red-700'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                    "
                                >
                                    실패
                                </button>
                                <button
                                    @click="selectedStatus = 'running'"
                                    class="px-3 py-1.5 rounded text-xs font-medium border text-center transition-all"
                                    :class="
                                        selectedStatus === 'running'
                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                    "
                                >
                                    실행중
                                </button>
                                <button
                                    @click="selectedStatus = 'cancelled'"
                                    class="px-3 py-1.5 rounded text-xs font-medium border text-center transition-all col-span-2"
                                    :class="
                                        selectedStatus === 'cancelled'
                                            ? 'bg-gray-100 border-gray-300 text-gray-700'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                    "
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 본문 -->
        <div v-if="isLoading" class="flex justify-center py-20">
            <div
                class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"
            ></div>
        </div>

        <div v-else-if="error" class="text-center py-20">
            <span class="material-icons-outlined text-4xl text-red-400"
                >error_outline</span
            >
            <p class="mt-2 text-gray-600">{{ error }}</p>
            <button
                @click="loadHistories"
                class="mt-4 text-indigo-600 hover:underline"
            >
                다시 시도
            </button>
        </div>

        <div v-else class="relative pl-10 sm:pl-16">
            <!-- 타임라인 라인 -->
            <div class="absolute left-6 top-6 bottom-0 w-px bg-gray-200"></div>

            <div
                v-if="groupedHistories.length === 0"
                class="text-center py-10 text-gray-500"
            >
                데이터가 없습니다.
            </div>

            <!-- 그룹 목록 -->
            <section
                v-for="(group, gIdx) in groupedHistories"
                :key="group.label"
                class="mb-16 relative"
            >
                <!-- 날짜 배지 -->
                <div class="absolute left-6 top-0 -translate-x-1/2 z-10">
                    <span
                        class="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-bold ring-1 ring-inset ring-gray-200 bg-white text-gray-600 shadow-sm whitespace-nowrap"
                    >
                        {{ group.label }}
                    </span>
                </div>

                <div class="pt-14 space-y-4">
                    <!-- 아이템 -->
                    <article
                        v-for="item in group.items"
                        :key="item.id"
                        class="relative bg-white border border-gray-200 rounded-lg p-5 shadow-sm transition-all hover:shadow-md group"
                        :class="{
                            'ring-2 ring-indigo-500 border-transparent':
                                selectedHistoryId === item.id,
                        }"
                    >
                        <div
                            class="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                        >
                            <!-- 좌측: 정보 -->
                            <div class="flex gap-4 min-w-0">
                                <!-- 상태 아이콘 -->
                                <div class="shrink-0 mt-1">
                                    <div
                                        class="w-8 h-8 rounded-full flex items-center justify-center border"
                                        :class="
                                            getStatusColorClass(item.status)
                                        "
                                    >
                                        <span
                                            v-if="item.status === 'running'"
                                            class="material-icons-outlined text-lg animate-spin"
                                            style="animation-direction: reverse"
                                            >sync</span
                                        >
                                        <span
                                            v-else-if="
                                                item.status === 'success'
                                            "
                                            class="material-icons-outlined text-lg"
                                            >check</span
                                        >
                                        <span
                                            v-else-if="
                                                item.status === 'cancelled'
                                            "
                                            class="material-icons-outlined text-lg"
                                            >block</span
                                        >
                                        <span
                                            v-else
                                            class="material-icons-outlined text-lg"
                                            >priority_high</span
                                        >
                                    </div>
                                </div>

                                <div class="flex-1 min-w-0">
                                    <!-- 프로젝트명 -->
                                    <div class="mb-1">
                                        <span
                                            class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                                        >
                                            {{
                                                getProjectName(item.project_id)
                                            }}
                                        </span>
                                    </div>

                                    <div class="flex items-center gap-2 mb-1">
                                        <h3
                                            class="text-lg font-semibold text-gray-900 truncate"
                                        >
                                            {{ item.title }}
                                        </h3>
                                        <span
                                            class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border"
                                            :class="
                                                item.status === 'running'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                    : item.status === 'success'
                                                    ? 'bg-green-50 text-green-700 border-green-100'
                                                    : item.status ===
                                                      'cancelled'
                                                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                                                    : 'bg-red-50 text-red-700 border-red-100'
                                            "
                                        >
                                            {{
                                                item.status === "cancelled"
                                                    ? "CANCELLED"
                                                    : item.status
                                            }}
                                        </span>
                                    </div>

                                    <div class="flex items-center gap-24 mb-3">
                                        <!-- Model Badge -->
                                        <div
                                            class="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600 font-mono shrink-0"
                                        >
                                            <span
                                                class="material-icons-outlined text-[14px]"
                                                >smart_toy</span
                                            >
                                            {{ item.model_name }}
                                        </div>

                                        <!-- Progress Bar (Running Only - Inline) -->
                                        <div
                                            v-if="item.status === 'running'"
                                            class="flex-1 flex items-center gap-3"
                                        >
                                            <div
                                                class="w-full h-6 bg-gray-100 rounded-full overflow-hidden flex-1 shadow-inner min-w-[300px]"
                                            >
                                                <div
                                                    class="h-full bg-blue-500 rounded-full transition-all duration-500 animate-pulse"
                                                    :style="{
                                                        width: `${item.progress}%`,
                                                    }"
                                                ></div>
                                            </div>
                                            <span
                                                class="text-xs font-bold text-indigo-600 whitespace-nowrap"
                                            >
                                                {{ item.progress }}%
                                            </span>
                                        </div>
                                    </div>

                                    <!-- 요약 통계 -->
                                    <div
                                        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 mt-2"
                                    >
                                        <div class="flex flex-col">
                                            <span
                                                class="text-xs text-gray-400 font-medium uppercase"
                                            >
                                                {{
                                                    item.status === "failed" ||
                                                    item.status === "cancelled"
                                                        ? "Result Note"
                                                        : "Generated TC Count"
                                                }}
                                            </span>
                                            <span
                                                class="text-sm text-gray-700 font-medium"
                                            >
                                                {{
                                                    item.summary ||
                                                    (item.status === "failed"
                                                        ? "로그 확인 필요"
                                                        : "집계 중...")
                                                }}
                                            </span>
                                        </div>

                                        <div class="flex flex-col">
                                            <span
                                                class="text-xs text-gray-400 font-medium uppercase"
                                                >Start Time</span
                                            >
                                            <span
                                                class="text-sm text-gray-700"
                                                >{{
                                                    formatTime(item.started_at)
                                                }}</span
                                            >
                                        </div>

                                        <div class="flex flex-col">
                                            <span
                                                class="text-xs text-gray-400 font-medium uppercase"
                                                >Duration</span
                                            >
                                            <span
                                                class="text-sm text-gray-700 font-mono"
                                                >{{
                                                    formatDuration(
                                                        item.duration
                                                    )
                                                }}</span
                                            >
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 우측: 액션 -->
                            <div class="shrink-0 flex items-start gap-2 pt-1">
                                <button
                                    @click="handleHistoryClick(item.id)"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    <span
                                        class="material-icons-outlined text-lg"
                                        >description</span
                                    >
                                    {{
                                        selectedHistoryId === item.id
                                            ? "Hide Logs"
                                            : "Show Logs"
                                    }}
                                </button>

                                <button
                                    v-if="item.status === 'success'"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    <span
                                        class="material-icons-outlined text-lg"
                                        >bar_chart</span
                                    >
                                    Report
                                </button>
                                <button
                                    v-else-if="item.status === 'running'"
                                    @click="handleCancel(item.id)"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                                >
                                    <span
                                        class="material-icons-outlined text-lg"
                                        >stop_circle</span
                                    >
                                    Stop
                                </button>
                                <button
                                    v-else
                                    @click="handleRetry(item.id)"
                                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    <span
                                        class="material-icons-outlined text-lg"
                                        >refresh</span
                                    >
                                    Retry
                                </button>
                            </div>
                        </div>

                        <!-- 상세 패널 -->
                        <div
                            v-if="selectedHistoryId === item.id"
                            class="mt-6 border-t border-gray-100 pt-6 animate-fadeIn"
                        >
                            <div class="flex items-center justify-between mb-4">
                                <h3
                                    class="text-base font-semibold text-gray-900"
                                >
                                    실행 로그 및 결과
                                </h3>
                                <button
                                    @click="closeHistoryDetail"
                                    class="text-gray-400 hover:text-gray-600"
                                >
                                    <span class="material-icons-outlined"
                                        >close</span
                                    >
                                </button>
                            </div>

                            <div
                                v-if="isDetailLoading"
                                class="flex justify-center py-8"
                            >
                                <div
                                    class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"
                                ></div>
                            </div>
                            <div
                                v-else-if="detailError"
                                class="text-red-500 text-sm"
                            >
                                {{ detailError }}
                            </div>
                            <div v-else class="space-y-4">
                                <!-- Logs -->
                                <div
                                    class="bg-gray-900 rounded-md p-4 overflow-x-auto max-h-60 text-xs font-mono text-gray-300 scrollbar-thin scrollbar-thumb-gray-700"
                                >
                                    <pre
                                        class="whitespace-pre-wrap break-all"
                                        >{{
                                            selectedHistory?.logs ||
                                            "로그가 없습니다."
                                        }}</pre
                                    >
                                </div>

                                <!-- Result Table -->
                                <div
                                    v-if="
                                        selectedHistory?.result_data &&
                                        Array.isArray(
                                            selectedHistory.result_data
                                        )
                                    "
                                    class="border border-gray-200 rounded-lg overflow-hidden"
                                >
                                    <Table
                                        :columns="historyDetailColumns"
                                        :data="selectedHistory.result_data"
                                        v-model:items-per-page="itemsPerPage"
                                        pagination-mode="client"
                                        expandable
                                        row-key="testcase_id"
                                    >
                                        <template #cell-testcase_id="{value}">
                                            <code
                                                class="text-xs font-mono text-indigo-600 font-bold bg-indigo-50 px-1 py-0.5 rounded"
                                                >{{ value }}</code
                                            >
                                        </template>
                                        <template #cell-priority="{value}">
                                            <span
                                                class="px-2 py-0.5 rounded text-xs font-medium"
                                                :class="{
                                                    'bg-red-100 text-red-700':
                                                        value === 'High',
                                                    'bg-yellow-100 text-yellow-800':
                                                        value === 'Medium',
                                                    'bg-gray-100 text-gray-700':
                                                        value === 'Low',
                                                }"
                                            >
                                                {{ value }}
                                            </span>
                                        </template>
                                        <template #expanded-row="{item}">
                                            <div
                                                class="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 text-sm text-gray-700"
                                            >
                                                <div>
                                                    <strong
                                                        class="block text-gray-900 mb-1"
                                                        >Preconditions:</strong
                                                    >
                                                    <p
                                                        class="whitespace-pre-line text-gray-600 bg-gray-50 p-2 rounded"
                                                    >
                                                        {{
                                                            item.preconditions ||
                                                            "-"
                                                        }}
                                                    </p>
                                                </div>
                                                <div>
                                                    <strong
                                                        class="block text-gray-900 mb-1"
                                                        >Steps:</strong
                                                    >
                                                    <ul
                                                        class="list-disc list-inside space-y-1 bg-gray-50 p-2 rounded text-gray-600"
                                                    >
                                                        <li
                                                            v-for="(
                                                                step, i
                                                            ) in item.steps"
                                                            :key="i"
                                                        >
                                                            {{ step }}
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </template>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </article>
                </div>
            </section>
        </div>
    </main>
</template>

<style scoped>
/* Timeline specific adjustments */
.animate-fadeIn {
    animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Custom Scrollbar for Logs */
.scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 3px;
}
</style>
