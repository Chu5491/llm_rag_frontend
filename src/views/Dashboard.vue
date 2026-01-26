<script setup lang="ts">
import {ref, onMounted, watch, computed} from "vue";
import {Chart as Highcharts} from "highcharts-vue";
import {dashboardApi} from "../services/dashboardApi.js";
import {fetchProjects} from "../services/projectApi.js";
import type {DashboardStats} from "../types/dashboard.js";
import type {ProjectResponse} from "../types/project.js";

// Composables
import {useProjectCharts} from "../composables/dashboard/useProjectCharts.js";
import {useModelCharts} from "../composables/dashboard/useModelCharts.js";
import {useTrendCharts} from "../composables/dashboard/useTrendCharts.js";

// --- State ---
const stats = ref<DashboardStats>({
    total_project_count: 0,
    target_history_count: 0,
    target_testcase_count: 0,
    project_id: null,
    tc_usability_trend: [],
    tc_generation_trend: [],
    tc_generation_status_counts: [],
    tc_usability_status_counts: [],
    tc_model_stats: [],
});

const projects = ref<ProjectResponse[]>([]);
const selectedProjectId = ref<number | "all">("all");
const isLoading = ref(false);
const activeTab = ref("projects"); // 'projects', 'testcases', 'models'

const hasTcData = computed(() => {
    const s = stats.value;
    return (
        (s.tc_generation_trend && s.tc_generation_trend.length > 0) ||
        (s.tc_usability_trend && s.tc_usability_trend.length > 0) ||
        (s.tc_generation_status_counts &&
            s.tc_generation_status_counts.length > 0)
    );
});

// --- Composables 연결 ---
const {projectCompositionOptions, projectArtifactOptions, updateProjectCharts} =
    useProjectCharts();

const {modelStatsOptions, updateModelCharts} = useModelCharts();

const {
    generationTrendOptions,
    usabilityTrendOptions,
    generationStatusOptions,
    updateTrendCharts,
} = useTrendCharts();

// --- Actions ---
const loadProjects = async () => {
    try {
        const data = await fetchProjects(0, 100);
        projects.value = data;
    } catch (error) {
        console.error("프로젝트 목록 조회 실패:", error);
    }
};

const loadStats = async () => {
    isLoading.value = true;
    try {
        const projectId =
            selectedProjectId.value === "all"
                ? undefined
                : selectedProjectId.value;
        const data = await dashboardApi.getDashboardStats(projectId);
        stats.value = data;

        // Composable 업데이트 호출
        updateProjectCharts(data);
        updateModelCharts(data);
        updateTrendCharts(data);
    } catch (error) {
        console.error("통계 조회 실패:", error);
    } finally {
        isLoading.value = false;
    }
};

watch(selectedProjectId, () => {
    loadStats();
});

onMounted(() => {
    loadStats();
    loadProjects();
});
</script>

<template>
    <main class="p-6 md:p-10 space-y-6 max-w-7xl mx-auto">
        <!-- Header -->
        <header
            class="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
            <div>
                <p class="mt-2 text-sm text-gray-500">
                    전체 프로젝트 및 테스트케이스 현황을 한눈에 확인하세요.
                </p>
            </div>
            <div class="relative w-full md:w-64">
                <div
                    class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
                >
                    <span class="material-icons-outlined text-gray-400"
                        >filter_alt</span
                    >
                </div>
                <select
                    v-model="selectedProjectId"
                    class="block w-full pl-10 pr-10 py-2.5 text-base border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white shadow-sm cursor-pointer appearance-none"
                >
                    <option value="all">전체 프로젝트 보기</option>
                    <option
                        v-for="project in projects"
                        :key="project.id"
                        :value="project.id"
                    >
                        {{ project.name }}
                    </option>
                </select>
                <div
                    class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
                >
                    <span class="material-icons-outlined text-gray-400"
                        >expand_more</span
                    >
                </div>
            </div>
        </header>

        <!-- 0. Overview -->
        <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Project Count -->
            <div
                class="relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5 group hover:shadow-md transition-all duration-300"
            >
                <div
                    class="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-blue-50 opacity-50 group-hover:scale-110 transition-transform"
                ></div>
                <div
                    class="relative z-10 p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300"
                >
                    <span class="material-icons-outlined text-3xl"
                        >folder_special</span
                    >
                </div>
                <div class="relative z-10">
                    <p class="text-sm font-medium text-gray-500 mb-1">
                        총 프로젝트
                    </p>
                    <h3 class="text-3xl font-bold text-gray-900 tracking-tight">
                        {{ isLoading ? "-" : stats.total_project_count
                        }}<span class="text-sm font-normal text-gray-400 ml-1"
                            >개</span
                        >
                    </h3>
                </div>
            </div>
            <!-- History Count -->
            <div
                class="relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5 group hover:shadow-md transition-all duration-300"
            >
                <div
                    class="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-green-50 opacity-50 group-hover:scale-110 transition-transform"
                ></div>
                <div
                    class="relative z-10 p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors duration-300"
                >
                    <span class="material-icons-outlined text-3xl"
                        >history_edu</span
                    >
                </div>
                <div class="relative z-10">
                    <p class="text-sm font-medium text-gray-500 mb-1">
                        자동생성 이력
                    </p>
                    <h3 class="text-3xl font-bold text-gray-900 tracking-tight">
                        {{ isLoading ? "-" : stats.target_history_count
                        }}<span class="text-sm font-normal text-gray-400 ml-1"
                            >건</span
                        >
                    </h3>
                </div>
            </div>
            <!-- TC Count -->
            <div
                class="relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5 group hover:shadow-md transition-all duration-300"
            >
                <div
                    class="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-amber-50 opacity-50 group-hover:scale-110 transition-transform"
                ></div>
                <div
                    class="relative z-10 p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300"
                >
                    <span class="material-icons-outlined text-3xl"
                        >fact_check</span
                    >
                </div>
                <div class="relative z-10">
                    <p class="text-sm font-medium text-gray-500 mb-1">
                        전체 TC
                    </p>
                    <h3 class="text-3xl font-bold text-gray-900 tracking-tight">
                        {{ isLoading ? "-" : stats.target_testcase_count
                        }}<span class="text-sm font-normal text-gray-400 ml-1"
                            >개</span
                        >
                    </h3>
                </div>
            </div>
        </section>

        <!-- Tab Navigation -->
        <nav class="flex space-x-4 border-b border-gray-200">
            <button
                v-for="tab in [
                    {id: 'projects', label: '프로젝트 분석'},
                    {id: 'testcases', label: '테스트케이스'},
                    {id: 'models', label: 'AI 모델 성과'},
                ]"
                :key="tab.id"
                @click="activeTab = tab.id"
                :class="[
                    activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                ]"
            >
                {{ tab.label }}
            </button>
        </nav>

        <!-- 1. Projects Tab -->
        <div v-if="activeTab === 'projects'" class="space-y-6">
            <section
                v-if="!isLoading && (stats.projects_stats || []).length > 0"
            >
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <!-- Project Composition (Double Pie) -->
                    <div
                        class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2"
                    >
                        <highcharts
                            :options="projectCompositionOptions"
                            class="w-full h-80"
                            :key="selectedProjectId"
                        ></highcharts>
                    </div>
                    <!-- Artifacts (Column) -->
                    <div
                        class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2"
                    >
                        <highcharts
                            :options="projectArtifactOptions"
                            class="w-full h-80"
                            :key="selectedProjectId"
                        ></highcharts>
                    </div>
                </div>
            </section>
            <section
                v-else
                class="p-10 text-center text-gray-500 bg-white rounded-xl border border-gray-200"
            >
                프로젝트 데이터가 없습니다.
            </section>
        </div>

        <!-- 2. Test Cases Tab -->
        <div v-if="activeTab === 'testcases'" class="space-y-6">
            <section
                v-if="!isLoading && hasTcData"
                class="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
                <!-- Generation Trend -->
                <div
                    class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                >
                    <highcharts
                        :options="generationTrendOptions"
                        class="w-full h-80"
                        :key="selectedProjectId"
                    ></highcharts>
                </div>

                <!-- Status Distribution -->
                <div
                    class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                >
                    <highcharts
                        :options="generationStatusOptions"
                        class="w-full h-80"
                        :key="selectedProjectId"
                    ></highcharts>
                </div>

                <!-- Usability Trend -->
                <div
                    class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2"
                >
                    <highcharts
                        :options="usabilityTrendOptions"
                        class="w-full h-80"
                        :key="selectedProjectId"
                    ></highcharts>
                </div>
            </section>
            <section
                v-else
                class="p-10 text-center text-gray-500 bg-white rounded-xl border border-gray-200"
            >
                테스트케이스 데이터가 없습니다.
            </section>
        </div>

        <!-- 3. Models Tab -->
        <div v-if="activeTab === 'models'" class="space-y-6">
            <section
                v-if="!isLoading && (stats.tc_model_stats || []).length > 0"
            >
                <div
                    class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
                >
                    <highcharts
                        :options="modelStatsOptions"
                        class="w-full"
                        style="height: 480px"
                        :key="selectedProjectId"
                    ></highcharts>
                </div>
            </section>
            <section
                v-else
                class="p-10 text-center text-gray-500 bg-white rounded-xl border border-gray-200"
            >
                모델 데이터가 없습니다.
            </section>
        </div>

        <!-- Empty State (Global) -->
        <section
            v-if="
                !isLoading &&
                stats.total_project_count === 0 &&
                selectedProjectId === 'all'
            "
            class="mt-8 p-12 bg-white rounded-2xl border border-dashed border-gray-300 text-center"
        >
            <!-- ... (Empty State Content 유지) ... -->
            <div
                class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4"
            >
                <span class="material-icons-outlined text-3xl text-gray-400"
                    >folder_off</span
                >
            </div>
            <h3 class="text-lg font-medium text-gray-900">
                등록된 프로젝트가 없습니다
            </h3>
            <p class="mt-1 text-gray-500">
                새로운 프로젝트를 생성하여 테스트케이스 관리를 시작해보세요.
            </p>
        </section>
    </main>
</template>
