<script setup lang="ts">
type GenerationStatus = "running" | "success" | "failed";

interface GenerationItem {
    id: number;
    title: string;
    status: GenerationStatus;
    summary?: string;
    startedAt: string;
    duration?: string;
    progress?: number; // running일 때만 사용
}

const histories: GenerationItem[] = [
    {
        id: 5,
        title: "SKT Agent Bench",
        status: "running",
        startedAt: "2분 전 시작",
        progress: 45,
    },
    {
        id: 4,
        title: "SKT Agent Bench",
        status: "success",
        summary: "TestCase 자동생성 완료 (154개)",
        startedAt: "2023.10.27 14:20",
        duration: "5m 30s",
    },
    {
        id: 3,
        title: "T-Gen",
        status: "failed",
        summary: "생성중 예기치 못한 오류 발생(로그 확인)",
        startedAt: "2023.10.26 09:15",
        duration: "1m 12s",
    },
    {
        id: 2,
        title: "T-Gen",
        status: "success",
        summary: "TestCase 자동생성 완료 (85개)",
        startedAt: "2023.10.26 08:00",
        duration: "3m 45s",
    },
    {
        id: 1,
        title: "Samsung VOC",
        status: "success",
        summary: "TestCase 자동생성 완료 (24개)",
        startedAt: "2023.10.25 18:00",
        duration: "45m 10s",
    },
];

// 실제 API 붙일 때 여기만 갈아끼우면 됨
const handleRefresh = () => {
    console.log("히스토리 새로고침");
};

const handleFilter = () => {
    console.log("필터 버튼 클릭");
};

const handleNewRun = () => {
    // 예: 자동생성 페이지로 이동 또는 다이얼로그 오픈 등
    console.log("새 자동 생성 실행");
};

const statusBadgeClass = (status: GenerationStatus) => {
    if (status === "running") {
        return "bg-blue-100 text-blue-700";
    }
    if (status === "success") {
        return "bg-green-100 text-green-700";
    }
    return "bg-red-100 text-red-700";
};
</script>

<template>
    <!-- 우리 기존 자동생성/대시보드랑 같은 레이아웃 -->
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 -->
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
                    @click="handleNewRun"
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                    title="새 자동생성"
                >
                    <span class="material-icons-outlined">add</span>
                </RouterLink>
            </div>
        </header>

        <!-- 메인 카드 (기존 페이지랑 동일한 카드 틀) -->
        <section class="rounded-lg bg-white p-6 shadow space-y-4">
            <!-- 히스토리 카드 리스트 -->
            <article
                v-for="item in histories"
                :key="item.id"
                class="group flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center"
                :class="
                    item.status === 'running'
                        ? 'border-indigo-300 bg-indigo-50/60'
                        : ''
                "
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
                        </h3>
                        <span
                            class="inline-flex items-center rounded px-2 py-1 text-xs font-medium"
                            :class="statusBadgeClass(item.status)"
                        >
                            {{
                                item.status === "running"
                                    ? "Running"
                                    : item.status === "success"
                                    ? "Success"
                                    : "Failed"
                            }}
                        </span>
                    </div>

                    <!-- Running: 프로그레스바 -->
                    <div v-if="item.status === 'running'" class="mt-2">
                        <div class="h-2 w-full rounded-full bg-gray-200">
                            <div
                                class="h-2 rounded-full bg-indigo-500"
                                :style="{
                                    width: `${item.progress ?? 0}%`,
                                }"
                            />
                        </div>
                        <p
                            class="mt-1 text-xs text-gray-500 flex items-center gap-2"
                        >
                            <span>{{ item.startedAt }}</span>
                            <span class="h-1 w-1 rounded-full bg-gray-300" />
                            <span>Build #{{ item.id }}</span>
                        </p>
                    </div>

                    <!-- 완료/실패: 요약/시간 -->
                    <div v-else class="mt-1 space-y-1">
                        <p
                            v-if="item.summary"
                            :class="[
                                'text-sm',
                                item.status === 'failed'
                                    ? 'text-red-600 font-medium'
                                    : 'text-gray-700',
                            ]"
                        >
                            {{ item.summary }}
                        </p>
                        <p
                            class="text-xs text-gray-500 flex items-center gap-2"
                        >
                            <span class="material-icons-outlined text-[14px]">
                                calendar_today
                            </span>
                            <span>{{ item.startedAt }}</span>
                            <span class="h-1 w-1 rounded-full bg-gray-300" />
                            <span class="material-icons-outlined text-[14px]">
                                timer
                            </span>
                            <span>{{ item.duration }}</span>
                        </p>
                    </div>
                </div>

                <!-- 우측 버튼 -->
                <div
                    class="flex w-full shrink-0 justify-end gap-2 border-t pt-3 text-xs sm:ml-4 sm:w-auto sm:border-t-0 sm:border-l sm:pl-4 border-gray-200"
                >
                    <button
                        type="button"
                        class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100"
                    >
                        <span class="material-icons-outlined text-sm">
                            description
                        </span>
                        Log
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
                        v-else-if="item.status === 'failed'"
                        type="button"
                        class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100"
                    >
                        <span class="material-icons-outlined text-sm">
                            restart_alt
                        </span>
                        Retry
                    </button>

                    <button
                        v-else
                        type="button"
                        class="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-gray-500 hover:bg-gray-100"
                        title="중지"
                    >
                        <span class="material-icons-outlined">
                            stop_circle
                        </span>
                    </button>
                </div>
            </article>
        </section>
    </main>
</template>
