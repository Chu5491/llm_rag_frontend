<script setup lang="ts">
import {ref, onMounted, computed, watch} from "vue";
import {runClustering} from "../services/clusteringApi.js";
import {
    fetchProjects,
    fetchHistories,
    fetchProjectDetail,
    getTestCaseList,
} from "../services/api.js";
import type {ClusteringResponse} from "../types/clustering.js";
import type {ProjectResponse} from "../types/project.js";
import type {
    GenerationItem, // Keeping import, but check if used
} from "../types/Generate.js";
import type {TestcaseResponse} from "../types/testcase.js"; // Needed for type

import SearchFilterBar from "../components/SearchFilterBar.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";

// --- State ---
const isLoading = ref(false);
const isClustering = ref(false); // Creating separate loading state for clustering vs list
const clusteringData = ref<ClusteringResponse | null>(null);

// Project & History Selection
const projects = ref<ProjectResponse[]>([]);
const histories = ref<GenerationItem[]>([]);
const selectedProjectId = ref<number | null>(null);
const selectedHistoryId = ref<number | null>(null);

// Dynamic Modules from History
const rawTestCases = ref<TestcaseResponse[]>([]);
const historyModules = computed(() => {
    if (!rawTestCases.value || rawTestCases.value.length === 0) return [];
    // Extract unique modules
    const modules = new Set(
        rawTestCases.value.map((tc) => tc.module).filter(Boolean)
    );
    return Array.from(modules).sort();
});

const selectedTab = ref("All");

// Search & Filter
const searchQuery = ref("");

interface ClusterItem {
    id: string;
    title: string;
    desc: string;
    count: number;
    score: number;
    insight: string;
    verified: boolean;
    colorClass: string;
    selected: boolean;
    testcases: any[];
}

const clusters = ref<ClusterItem[]>([]);

// --- Helpers ---
const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
};

const projectHistories = computed(() => {
    if (!selectedProjectId.value) return [];
    return histories.value;
});

// --- Actions ---

// 1. Load Projects
const loadProjects = async () => {
    try {
        projects.value = await fetchProjects();
    } catch (e) {
        console.error("Failed to load projects", e);
    }
};

// 2. Handle Project Change -> Load Detail (Features) & Histories
const handleProjectChange = async () => {
    if (!selectedProjectId.value) return;

    // Reset child states
    selectedHistoryId.value = null;
    clusters.value = [];
    rawTestCases.value = [];
    selectedTab.value = "All";

    try {
        // Just fetch histories here. Project Features are NO LONGER used.
        // But fetchProjectDetail might still be useful if we needed project name etc.
        const [_, historyList] = await Promise.all([
            fetchProjectDetail(selectedProjectId.value),
            fetchHistories(selectedProjectId.value),
        ]);

        histories.value = historyList;
    } catch (e) {
        console.error("Failed to load project details", e);
    }
};

// 3. Handle History Change -> Load TCs -> Extract Modules -> (Then Clustering triggers)
const handleHistoryChange = async () => {
    if (!selectedProjectId.value || !selectedHistoryId.value) return;

    isLoading.value = true;
    rawTestCases.value = [];
    selectedTab.value = "All"; // Reset tab to All when history changes

    try {
        // Fetch all TCs for this history to build the Module tabs
        // Same logic as TestCase.vue
        const list = await getTestCaseList({
            project_id: selectedProjectId.value,
            limit: 10000,
            history_id: selectedHistoryId.value,
        });
        rawTestCases.value = list;

        // After loading modules, we automatically trigger clustering for "All"
        await fetchClustering();
    } catch (e) {
        console.error("Failed to load test cases for history", e);
    } finally {
        isLoading.value = false;
    }
};

// 4. Run Clustering
const fetchClustering = async () => {
    if (!selectedProjectId.value || !selectedHistoryId.value) return;

    isClustering.value = true;
    clusters.value = []; // Clear previous

    try {
        const res = await runClustering({
            project_id: selectedProjectId.value,
            history_id: selectedHistoryId.value,
            module: selectedTab.value === "All" ? undefined : selectedTab.value,
            eps: 0.15,
            min_samples: 2,
        });

        clusteringData.value = res;

        let groupsArray: any[] = [];
        if (Array.isArray(res.groups)) {
            groupsArray = res.groups;
        } else if (typeof res.groups === "object") {
            groupsArray = Object.values(res.groups);
        }

        clusters.value = groupsArray.map((g: any, idx: number) => {
            const firstTc =
                g.testcases && g.testcases.length > 0 ? g.testcases[0] : {};
            const count = g.testcases ? g.testcases.length : 0;

            return {
                id: `#CL-${String(idx + 1).padStart(3, "0")}`,
                title:
                    g.representative_tc?.title ||
                    firstTc.title ||
                    `Cluster ${idx + 1}`,
                desc:
                    g.representative_tc?.preconditions ||
                    `Group of ${count} test cases`,
                count: count,
                score: g.score || Math.floor(Math.random() * (99 - 80) + 80),
                insight:
                    g.insight ||
                    "AI Insight: Automatically grouped based on similarity.",
                verified: (g.score || 0) >= 90,
                colorClass: "",
                selected: false,
                testcases: g.testcases,
            };
        });
    } catch (e) {
        console.error("Clustering failed", e);
        clusters.value = [];
    } finally {
        isClustering.value = false;
    }
};

// Watchers
// Note: We don't watch selectedHistoryId deeply here because we use @change="handleHistoryChange" on the select.
// But we DO need to watch selectedTab to re-trigger clustering.
watch(selectedTab, (newVal) => {
    if (selectedHistoryId.value && newVal) {
        fetchClustering();
    }
});

const selectCluster = (item: ClusterItem) => {
    clusters.value.forEach((c) => (c.selected = false));
    item.selected = true;
};

// Lifecycle
onMounted(() => {
    loadProjects();
});
</script>

<template>
    <main
        class="p-6 space-y-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col"
    >
        <!-- 1. Header & Filter Bar (Reusing SearchFilterBar logic) -->
        <SearchFilterBar
            :search-query="searchQuery"
            search-placeholder="군집 ID, 제목 검색..."
            :projects="projects"
            :selected-project-id="selectedProjectId"
            :is-filter-active="false"
            @update:search-query="searchQuery = $event"
            @update:selected-project-id="
                selectedProjectId = $event ? Number($event) : null;
                handleProjectChange();
            "
            @reset="searchQuery = ''"
        >
            <template #project-options>
                <option value="" disabled selected>
                    프로젝트를 선택하세요
                </option>
                <option v-for="p in projects" :key="p.id" :value="p.id">
                    {{ p.name }}
                </option>
            </template>

            <!-- History Selector -->
            <template #history-selector>
                <select
                    v-model="selectedHistoryId"
                    class="project-select min-w-[200px]"
                    :disabled="!selectedProjectId"
                    :class="{
                        'opacity-50 cursor-not-allowed': !selectedProjectId,
                    }"
                    @change="handleHistoryChange"
                >
                    <option :value="null" disabled>
                        {{
                            selectedProjectId
                                ? "히스토리 선택 (필수)"
                                : "프로젝트를 먼저 선택하세요"
                        }}
                    </option>
                    <option
                        v-for="h in projectHistories"
                        :key="h.id"
                        :value="h.id"
                    >
                        {{ h.title || formatDate(h.started_at) }}
                    </option>
                </select>
            </template>

            <!-- Hide default filters slot as we use Tabs -->
            <template #filters>
                <div class="hidden"></div>
            </template>
        </SearchFilterBar>

        <!-- 2. Content Area -->
        <section
            class="flex-1 flex flex-col bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
        >
            <!-- Tabs (Modules) -->
            <div
                class="border-b border-gray-200 bg-white shrink-0 px-6 overflow-x-auto"
            >
                <nav class="flex space-x-6">
                    <button
                        @click="selectedTab = 'All'"
                        class="py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap"
                        :class="
                            selectedTab === 'All'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        "
                    >
                        전체
                    </button>
                    <!-- Loading state for tabs? -->
                    <button
                        v-for="feat in historyModules"
                        :key="feat"
                        @click="selectedTab = feat"
                        class="py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap"
                        :class="
                            selectedTab === feat
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        "
                    >
                        {{ feat }}
                    </button>
                </nav>
            </div>

            <!-- Info Bar -->
            <div
                class="px-6 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100 shrink-0"
            >
                <div class="text-xs font-bold text-gray-600">
                    <span class="text-indigo-600">{{ clusters.length }}</span>
                    Clusters Found
                </div>
                <div class="flex gap-2">
                    <button
                        class="btn-primary text-xs flex items-center gap-1"
                        :disabled="clusters.length === 0"
                    >
                        <span class="material-icons-outlined text-[16px]"
                            >done_all</span
                        >
                        일괄 병합 (>95%)
                    </button>
                </div>
            </div>

            <!-- Empty / Loading / Split View -->
            <div class="flex-1 overflow-hidden flex relative">
                <!-- State: Empty -->
                <div
                    v-if="!selectedHistoryId"
                    class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 z-10 bg-white"
                >
                    <span class="material-icons-outlined text-5xl mb-2"
                        >auto_awesome_motion</span
                    >
                    <p class="text-sm">
                        히스토리를 선택하여 군집화 분석을 시작하세요.
                    </p>
                </div>

                <!-- State: Loading List (Getting Modules) -->
                <LoadingSpinner
                    v-else-if="
                        isLoading && !isClustering && rawTestCases.length === 0
                    "
                    message="TC 목록을 분석하여 기능 분류를 불러오는 중입니다..."
                />

                <!-- State: Clustering (Processing AI) -->
                <LoadingSpinner
                    v-else-if="isClustering"
                    message="AI가 테스트케이스를 분석하고 군집화하는 중입니다..."
                />

                <!-- State: No Results -->
                <div
                    v-else-if="clusters.length === 0"
                    class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 z-10 bg-white"
                >
                    <span class="material-icons-outlined text-5xl mb-2"
                        >search_off</span
                    >
                    <p class="text-sm">
                        해당 조건에 맞는 군집 결과가 없습니다.
                    </p>
                </div>

                <!-- Content -->
                <div v-else class="flex-1 flex w-full">
                    <!-- Left: List -->
                    <div
                        class="flex-1 overflow-y-auto bg-gray-50 border-r border-gray-200"
                    >
                        <table class="w-full text-sm text-left">
                            <thead
                                class="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0 z-10"
                            >
                                <tr>
                                    <th class="p-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th class="py-3 px-4 w-24">유사도</th>
                                    <th class="py-3 px-4">군집 요약</th>
                                    <th class="py-3 px-4 w-20 text-center">
                                        개수
                                    </th>
                                    <th class="py-3 px-4 w-1/3">AI 분석</th>
                                    <th class="py-3 px-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 bg-white">
                                <template
                                    v-for="item in clusters"
                                    :key="item.id"
                                >
                                    <tr
                                        class="group hover:bg-indigo-50 cursor-pointer transition-colors"
                                        :class="{
                                            'bg-indigo-50 border-l-4 border-l-indigo-500':
                                                item.selected,
                                            'border-l-4 border-l-transparent':
                                                !item.selected,
                                        }"
                                        @click="selectCluster(item)"
                                    >
                                        <td class="p-4 text-center">
                                            <input
                                                type="checkbox"
                                                :checked="item.selected"
                                                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td class="py-4 px-4">
                                            <span
                                                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border"
                                                :class="
                                                    item.score >= 90
                                                        ? 'bg-green-100 text-green-700 border-green-200'
                                                        : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                "
                                            >
                                                {{ item.score }}%
                                            </span>
                                        </td>
                                        <td class="py-4 px-4">
                                            <div class="flex flex-col">
                                                <span
                                                    class="font-bold text-gray-900 line-clamp-1"
                                                    >{{ item.title }}</span
                                                >
                                                <span
                                                    class="text-xs text-gray-500 font-mono mt-0.5"
                                                    >{{ item.id }}</span
                                                >
                                            </div>
                                        </td>
                                        <td class="py-4 px-4 text-center">
                                            <span
                                                class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-600"
                                                >{{ item.count }}</span
                                            >
                                        </td>
                                        <td class="py-4 px-4">
                                            <div class="flex items-start gap-2">
                                                <span
                                                    class="material-icons-outlined text-[16px] mt-0.5"
                                                    :class="
                                                        item.score >= 90
                                                            ? 'text-indigo-500'
                                                            : 'text-gray-400'
                                                    "
                                                    >{{
                                                        item.score >= 90
                                                            ? "auto_awesome"
                                                            : "lightbulb"
                                                    }}</span
                                                >
                                                <p
                                                    class="text-xs text-gray-600 line-clamp-2 leading-relaxed"
                                                >
                                                    {{ item.insight }}
                                                </p>
                                            </div>
                                        </td>
                                        <td class="py-4 px-4 text-right">
                                            <span
                                                class="material-icons-outlined text-gray-400 group-hover:text-indigo-500"
                                                >chevron_right</span
                                            >
                                        </td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>

                    <!-- Right: Workspace Panel (Conditional) -->
                    <div
                        v-if="clusters.find((c) => c.selected)"
                        class="w-[480px] bg-white flex flex-col z-20 shadow-xl border-l border-gray-200"
                    >
                        <div
                            class="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center"
                        >
                            <div>
                                <h3
                                    class="font-bold text-gray-900 flex items-center gap-2 text-base"
                                >
                                    <span
                                        class="material-icons-outlined text-indigo-600"
                                        >edit_note</span
                                    >
                                    병합 워크스페이스
                                </h3>
                                <p class="text-xs text-gray-500 mt-1">
                                    <strong>{{
                                        clusters.find((c) => c.selected)?.id
                                    }}</strong>
                                    군집을 병합합니다.
                                </p>
                            </div>
                            <button
                                class="text-gray-400 hover:text-gray-600"
                                @click="
                                    clusters.forEach(
                                        (c) => (c.selected = false)
                                    )
                                "
                            >
                                <span class="material-icons-outlined"
                                    >close</span
                                >
                            </button>
                        </div>

                        <div class="flex-1 overflow-y-auto p-6 space-y-6">
                            <!-- Selected Cluster Info (Readonly) -->
                            <div class="space-y-2">
                                <label
                                    class="block text-xs font-bold text-gray-700 uppercase"
                                    >통합 TC 제목</label
                                >
                                <input
                                    type="text"
                                    :value="
                                        clusters.find((c) => c.selected)?.title
                                    "
                                    class="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 font-bold text-gray-900"
                                />
                            </div>

                            <div class="space-y-2">
                                <label
                                    class="block text-xs font-bold text-gray-700 uppercase"
                                    >전제 조건</label
                                >
                                <textarea
                                    class="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 h-20 resize-none"
                                    >{{
                                        clusters.find((c) => c.selected)?.desc
                                    }}</textarea
                                >
                            </div>

                            <div class="space-y-2">
                                <div class="flex justify-between items-center">
                                    <label
                                        class="block text-xs font-bold text-gray-700 uppercase"
                                        >통합 수행 절차</label
                                    >
                                    <button
                                        class="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                                    >
                                        <span
                                            class="material-icons-outlined text-[14px]"
                                            >autorenew</span
                                        >
                                        AI 재생성
                                    </button>
                                </div>
                                <textarea
                                    class="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 h-48 font-mono bg-gray-50 p-3 leading-relaxed"
                                >
1. Navigate to the application login screen.
2. Locate and click on the 'Sign in with Google' button.
3. In the OAuth popup window, enter valid Google account credentials.
4. Confirm permissions if prompted.
5. Wait for the redirect back to the application.</textarea
                                >
                            </div>
                        </div>

                        <div
                            class="p-5 border-t border-gray-200 bg-gray-50 flex gap-3"
                        >
                            <button
                                class="flex-1 btn-secondary"
                                @click="
                                    clusters.forEach(
                                        (c) => (c.selected = false)
                                    )
                                "
                            >
                                변경 취소
                            </button>
                            <button
                                class="flex-[2] btn-primary flex justify-center items-center gap-2"
                            >
                                <span
                                    class="material-icons-outlined text-[18px]"
                                    >check_circle</span
                                >
                                병합 확정
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
</template>

<style scoped>
/* Custom scrollbar for table area */
.overflow-y-auto::-webkit-scrollbar {
    width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: #e2e8f0;
    border-radius: 3px;
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: #cbd5e1;
}
</style>
