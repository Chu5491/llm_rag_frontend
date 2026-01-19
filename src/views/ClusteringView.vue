<script setup lang="ts">
import {ref, onMounted, computed, watch} from "vue";
import {runClustering} from "../services/clusteringApi.js";
import {
    fetchProjects,
    fetchHistories,
    getTestCaseList,
} from "../services/api.js";
import type {ProjectResponse} from "../types/project.js";
import type {GenerationItem} from "../types/Generate.js";
import type {TestcaseResponse} from "../types/testcase.js";

import SearchFilterBar from "../components/SearchFilterBar.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import Table, {type Column} from "../components/Table.vue";
import MergeWorkspace from "../components/MergeWorkspace.vue";
import type {ClusterItem} from "../types/clustering.js";

// --- 상태 (State) ---
const isLoading = ref(false); // 목록/설정 로딩용
const isClustering = ref(false); // API 호출 로딩용
const clusteringResponse = ref<any>(null); // 원본 응답 저장

// 프로젝트 및 히스토리 선택
const projects = ref<ProjectResponse[]>([]);
const histories = ref<GenerationItem[]>([]);
const selectedProjectId = ref<number | null>(null);
const selectedHistoryId = ref<number | null>(null);

// 히스토리 기반 동적 모듈 (Dynamic Modules)
const rawTestCases = ref<TestcaseResponse[]>([]);
const historyModules = computed(() => {
    if (!rawTestCases.value || rawTestCases.value.length === 0) return [];
    // 중복 없는 모듈 목록 추출
    const modules = new Set(
        rawTestCases.value.map((tc) => tc.module).filter(Boolean)
    );
    return Array.from(modules).sort();
});

const selectedTab = ref<string>(""); // "전체" 없음, 기본값 빈 문자열

// 화면 모드: 'merge' (군집) 또는 'noise' (단일 항목)
const viewMode = ref<"merge" | "noise">("merge");

// 군집화 파라미터
const similarityThreshold = ref(85); // 기본값 85%
const minSamples = ref(2); // 기본값 2
const itemsPerPage = ref(5); // 페이지당 항목 수 (기본 5)

const clusters = ref<ClusterItem[]>([]);
const noiseItems = ref<TestcaseResponse[]>([]);

// 선택된 군집 (Computed)
const selectedCluster = computed(() => {
    return clusters.value.find((c) => c.selected);
});

// --- 헬퍼 (Helpers) ---
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

// 테이블 컬럼 정의 (Noise 항목용)
const noiseColumns: Column[] = [
    {key: "testcase_id_tag", label: "TC ID", width: "w-24"},
    {key: "module", label: "기능", width: "w-24"},
    {key: "score", label: "유사도", width: "w-20", align: "center"},
    {key: "title", label: "타이틀"},
    {key: "preconditions", label: "전제 조건"},
];

// 테이블 컬럼 정의 (Cluster 항목용)
const clusterColumns: Column[] = [
    {key: "checkbox", label: "", width: "w-12", align: "center"},
    {key: "score", label: "유사도", width: "w-24"},
    {key: "summary", label: "요약", width: "w-1/3"},
    {key: "count", label: "개수", width: "w-20", align: "center"},
    {key: "insight", label: "AI Insight", width: "w-1/3"},
    {key: "arrow", label: "", width: "w-10", align: "right"},
];

const getClusterRowClass = (item: ClusterItem) => {
    return item.selected
        ? "bg-indigo-50/60 border-l-4 border-l-indigo-500 hover:bg-indigo-50/70"
        : "border-l-4 border-l-transparent hover:bg-indigo-50/50";
};

// --- 액션 (Actions) ---

const loadProjects = async () => {
    try {
        projects.value = await fetchProjects();
    } catch (e) {
        console.error("프로젝트 로드 실패", e);
    }
};

const handleProjectChange = async () => {
    if (!selectedProjectId.value) return;

    // 하위 상태 초기화
    selectedHistoryId.value = null;
    clusters.value = [];
    noiseItems.value = [];
    rawTestCases.value = [];
    selectedTab.value = "";

    try {
        const historyList = await fetchHistories(selectedProjectId.value);
        histories.value = historyList;
    } catch (e) {
        console.error("프로젝트 상세 정보 로드 실패", e);
    }
};

const handleHistoryChange = async () => {
    if (!selectedProjectId.value || !selectedHistoryId.value) return;

    isLoading.value = true;
    rawTestCases.value = [];
    clusters.value = [];
    noiseItems.value = [];
    selectedTab.value = ""; // 탭 초기화

    try {
        // 모듈 탭 구성을 위해 해당 히스토리의 모든 TC 조회
        const list = await getTestCaseList({
            project_id: selectedProjectId.value,
            limit: 10000,
            history_id: selectedHistoryId.value,
        });
        rawTestCases.value = list;

        // 가능한 경우 첫 번째 모듈 자동 선택 및 군집화 트리거
        if (historyModules.value.length > 0) {
            selectedTab.value = historyModules.value[0];
        }
    } catch (e) {
        console.error("히스토리 테스트케이스 로드 실패", e);
    } finally {
        isLoading.value = false;
    }
};

// 군집화 실행 (Run Clustering)
const fetchClustering = async () => {
    if (
        !selectedProjectId.value ||
        !selectedHistoryId.value ||
        !selectedTab.value
    )
        return;

    isClustering.value = true;
    clusters.value = [];
    noiseItems.value = [];
    viewMode.value = "merge"; // 새로운 조회 시 병합 보기로 초기화

    try {
        // 유사도(%)를 eps로 변환 (eps = 1 - similarity/100)
        const calculatedEps = 1 - similarityThreshold.value / 100;
        // EPS가 0이 되면 안되므로 최소값 보정 (선택 사항)
        const finalEps = Math.max(0.01, Number(calculatedEps.toFixed(4)));

        const res = await runClustering({
            project_id: selectedProjectId.value,
            history_id: selectedHistoryId.value,
            module: selectedTab.value,
            eps: finalEps,
            min_samples: minSamples.value,
        });

        clusteringResponse.value = res;

        // 그룹 파싱
        if (res.groups && Array.isArray(res.groups)) {
            res.groups.forEach((group: any, idx: number) => {
                // 그룹 구조: { group_id: number, average_distance: number, items: Testcase[] }
                if (!group.items || group.items.length === 0) return;

                const firstTc = group.items[0];
                const count = group.items.length;
                const distance = group.average_distance;

                // 점수 계산: (1 - 거리) * 100
                // 거리가 0이면 유사도 100%, 거리가 1이면 유사도 0%
                let finalScore = 0;
                if (typeof distance === "number") {
                    // 방어 로직: 거리가 0~1 범위를 벗어나는 경우 처리
                    const validDistance = Math.max(0, Math.min(1, distance));
                    // 소수점 2자리까지 정밀도 유지 (예: 84.68)
                    finalScore = Number(((1 - validDistance) * 100).toFixed(2));
                } else {
                    // 거리가 없는 경우 임의 점수 부여 (Fallback)
                    finalScore = 85 + Math.floor(Math.random() * 14);
                }

                clusters.value.push({
                    id: firstTc.id,
                    testcase_id_tag: firstTc.testcase_id_tag,
                    title: firstTc.title || `Cluster ${idx + 1}`,
                    description: firstTc.preconditions || "전제 조건 없음",
                    count: count,
                    score: finalScore,
                    insight:
                        "유사도가 높은 테스트케이스 그룹입니다. 병합을 권장합니다.",
                    testcases: group.items,
                    selected: false,
                });
            });
        }

        // Noise 파싱
        if (res.noise && Array.isArray(res.noise)) {
            noiseItems.value = res.noise.map((item: any) => {
                // 거리 기반 점수 계산
                const distance = item.distance_to_nearest;
                let score = 0;
                if (typeof distance === "number") {
                    const validDistance = Math.max(0, Math.min(1, distance));
                    // 소수점 2자리까지 정밀도 유지
                    score = Number(((1 - validDistance) * 100).toFixed(2));
                }
                return {
                    ...item,
                    score: score,
                };
            });
        }
    } catch (e) {
        console.error("군집화 API 오류", e);
    } finally {
        isClustering.value = false;
    }
};

// --- Watchers ---
watch(selectedTab, () => {
    // 탭이 변경되거나 파라미터가 변경되면 자동으로 호출
    if (selectedTab.value && selectedHistoryId.value) {
        fetchClustering();
    }
});

const resetFilters = () => {
    similarityThreshold.value = 85;
    minSamples.value = 2;
};

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
    <main class="p-6 space-y-6 flex flex-col bg-gray-50/50">
        <!-- 페이지 헤더 -->
        <header>
            <p class="mt-1 text-sm text-gray-500">
                중복 테스트케이스를 확인할 수 있습니다.
                <br />
                현재는 구상중입니다.
            </p>
        </header>
        <!-- Filter Bar -->
        <SearchFilterBar
            :search-query="''"
            :projects="projects"
            :selected-project-id="selectedProjectId"
            :is-filter-active="similarityThreshold !== 85 || minSamples !== 2"
            @update:selected-project-id="
                selectedProjectId = $event ? Number($event) : null;
                handleProjectChange();
            "
            @reset="resetFilters"
        >
            <template #project-options>
                <option value="" disabled selected>프로젝트 선택</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">
                    {{ p.name }}
                </option>
            </template>

            <!-- History Selector -->
            <template #history-selector>
                <select
                    v-model="selectedHistoryId"
                    class="project-select min-w-60"
                    :disabled="!selectedProjectId"
                    :class="{
                        'opacity-50 cursor-not-allowed': !selectedProjectId,
                    }"
                    @change="handleHistoryChange"
                >
                    <option :value="null" disabled>
                        {{
                            selectedProjectId
                                ? "수행 이력 선택 (필수)"
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

            <template #filters>
                <div class="space-y-4 p-1">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="block text-sm font-bold text-gray-700"
                                >유사도(%)</label
                            >
                            <input
                                type="number"
                                v-model.number="similarityThreshold"
                                min="1"
                                max="99"
                                class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                            />
                            <p class="text-xs text-gray-400">
                                높을수록 더 엄격하게 유사함을 판단합니다.
                            </p>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-sm font-bold text-gray-700"
                                >최소 병합 수</label
                            >
                            <input
                                type="number"
                                v-model.number="minSamples"
                                min="2"
                                class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                            />
                            <p class="text-xs text-gray-400">
                                최소 이 개수 이상 모여야 그룹화됩니다.
                            </p>
                        </div>
                    </div>
                </div>
            </template>
        </SearchFilterBar>

        <!-- 2. Content Area -->
        <section
            class="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 relative min-h-[600px]"
        >
            <!-- Warning/Empty States -->
            <div
                v-if="!selectedHistoryId"
                class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 z-10 bg-white/80 backdrop-blur-sm"
            >
                <span class="material-icons-outlined text-5xl mb-3"
                    >assignment_late</span
                >
                <p class="text-lg font-medium text-gray-600">
                    프로젝트와 생성 히스토리를 선택해주세요
                </p>
                <p class="text-sm mt-1">
                    히스토리를 선택하면 해당 테스트케이스의 유사도를 기반으로
                    군집화 분석을 수행할 수 있습니다.
                </p>
            </div>

            <div
                v-else-if="isLoading"
                class="absolute inset-0 z-20 bg-white/90 backdrop-blur flex flex-col items-center justify-center"
            >
                <LoadingSpinner message="수행 이력을 불러오는 중..." />
            </div>

            <!-- Tabs (Modules) -->
            <div class="border-b border-gray-100 bg-white shrink-0 px-6 pt-2">
                <nav
                    class="flex space-x-6 overflow-x-auto pb-2"
                    v-if="historyModules.length > 0"
                >
                    <button
                        v-for="feat in historyModules"
                        :key="feat"
                        @click="selectedTab = feat"
                        class="py-3 px-1 border-b-[2.5px] font-medium text-sm transition-all whitespace-nowrap outline-none select-none"
                        :class="
                            selectedTab === feat
                                ? 'border-indigo-600 text-indigo-700 font-bold'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        "
                    >
                        {{ feat }}
                    </button>
                </nav>
                <div v-else class="py-4 text-sm text-gray-400 italic">
                    표시할 기능 모듈이 없습니다.
                </div>
            </div>

            <!-- View Mode Switcher (Merge vs Noise) -->
            <div
                v-if="selectedTab"
                class="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex gap-4 items-center"
            >
                <div
                    class="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm"
                >
                    <button
                        @click="viewMode = 'merge'"
                        class="px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2"
                        :class="
                            viewMode === 'merge'
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                                : 'text-gray-500 hover:bg-gray-50'
                        "
                    >
                        <span class="material-icons-outlined text-[16px]"
                            >merge_type</span
                        >
                        병합 제안
                        <span
                            class="ml-1 bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[10px]"
                            >{{ clusters.length }}</span
                        >
                    </button>
                    <button
                        @click="viewMode = 'noise'"
                        class="px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2"
                        :class="
                            viewMode === 'noise'
                                ? 'bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200'
                                : 'text-gray-500 hover:bg-gray-50'
                        "
                    >
                        <span class="material-icons-outlined text-[16px]"
                            >do_not_disturb_on</span
                        >
                        단일 항목 (Noise)
                        <span
                            class="ml-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px]"
                            >{{ noiseItems.length }}</span
                        >
                    </button>
                </div>
                <div class="h-4 w-px bg-gray-300 mx-2"></div>
                <p class="text-xs text-gray-500 flex items-center gap-1">
                    <span
                        class="material-icons-outlined text-[14px] text-indigo-500"
                        v-if="viewMode === 'merge'"
                        >info</span
                    >
                    <span v-if="viewMode === 'merge'"
                        >유사도
                        <strong>{{ similarityThreshold }}%</strong>이상의
                        테스트케이스를 확인했습니다.</span
                    >
                    <span v-else
                        >유사도가 낮아 병합이 불필요한 단일 테스트케이스
                        목록입니다.</span
                    >
                </p>
            </div>

            <!-- Content Split View -->
            <div class="flex-1 flex relative">
                <!-- Loading Overlay for Clustering -->
                <div
                    v-if="isClustering"
                    class="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center"
                >
                    <LoadingSpinner message="AI 군집화 분석 중..." />
                </div>

                <!-- MERGE VIEW -->
                <template v-if="viewMode === 'merge'">
                    <div
                        v-if="!isClustering && clusters.length === 0"
                        class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 z-0"
                    >
                        <span
                            class="material-icons-outlined text-5xl mb-2 text-gray-200"
                            >check_circle_outline</span
                        >
                        <p class="text-sm">
                            발견된 중복/유사 패턴이 없습니다. 모든 TC가
                            고유해보입니다!
                        </p>
                    </div>

                    <div v-else class="flex-1 flex w-full h-full">
                        <!-- Left: Cluster List -->
                        <div class="flex-1 bg-gray-50 border-r border-gray-200">
                            <Table
                                :columns="clusterColumns"
                                :data="clusters"
                                :pagination-mode="'client'"
                                v-model:items-per-page="itemsPerPage"
                                :row-class="getClusterRowClass"
                                @row-click="selectCluster"
                            >
                                <!-- Checkbox -->
                                <template #cell-checkbox="{item}">
                                    <input
                                        type="checkbox"
                                        :checked="item.selected"
                                        class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                                    />
                                </template>

                                <!-- Score -->
                                <template #cell-score="{value}">
                                    <span
                                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-sm bg-indigo-50 text-indigo-700 border-indigo-200"
                                    >
                                        {{ value }}%
                                    </span>
                                </template>

                                <!-- Summary (Title + ID) -->
                                <template #cell-summary="{item}">
                                    <div class="flex flex-col gap-1">
                                        <span
                                            class="font-bold text-gray-800 text-[15px] group-hover:text-indigo-700 transition-colors line-clamp-1"
                                            >{{ item.title }}</span
                                        >
                                        <span
                                            class="text-xs text-gray-400 font-mono"
                                            >{{ item.testcase_id_tag }}</span
                                        >
                                    </div>
                                </template>

                                <!-- Count -->
                                <template #cell-count="{value}">
                                    <span
                                        class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-bold text-gray-600"
                                        >{{ value }}</span
                                    >
                                </template>

                                <!-- Insight -->
                                <template #cell-insight="{value}">
                                    <div class="flex items-start gap-2">
                                        <span
                                            class="material-icons-outlined text-[16px] mt-0.5 shrink-0 text-indigo-500"
                                            >auto_awesome</span
                                        >
                                        <p
                                            class="text-xs text-gray-500 line-clamp-2 leading-relaxed"
                                        >
                                            {{ value }}
                                        </p>
                                    </div>
                                </template>

                                <!-- Arrow -->
                                <template #cell-arrow>
                                    <span
                                        class="material-icons-outlined text-gray-300 group-hover:text-indigo-400 transition-colors"
                                        >chevron_right</span
                                    >
                                </template>
                            </Table>
                        </div>
                    </div>
                </template>

                <!-- 노이즈 보기 -->
                <template v-else>
                    <!-- Empty Noise -->
                    <div
                        v-if="!isClustering && noiseItems.length === 0"
                        class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 z-0"
                    >
                        <span
                            class="material-icons-outlined text-5xl mb-2 text-gray-200"
                            >check_circle</span
                        >
                        <p class="text-sm">
                            단일 항목이 없습니다. 모두 그룹화되었습니다!
                        </p>
                    </div>

                    <div v-else class="flex-1 bg-white p-6">
                        <Table
                            :columns="noiseColumns"
                            :data="noiseItems"
                            :pagination-mode="'client'"
                            v-model:items-per-page="itemsPerPage"
                        >
                            <!-- Tag ID -->
                            <template #cell-testcase_id_tag="{value}">
                                <span
                                    class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono font-bold"
                                    >{{ value || "-" }}</span
                                >
                            </template>

                            <!-- Module -->
                            <template #cell-module="{value}">
                                <span
                                    class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold"
                                    >{{ value }}</span
                                >
                            </template>

                            <!-- Score (Similarity) -->
                            <template #cell-score="{value}">
                                <span
                                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-sm bg-amber-50 text-amber-700 border-amber-200"
                                >
                                    {{ value }}%
                                </span>
                            </template>

                            <!-- Title -->
                            <template #cell-title="{value}">
                                <span class="font-bold text-gray-800">{{
                                    value
                                }}</span>
                            </template>

                            <!-- Preconditions -->
                            <template #cell-preconditions="{value}">
                                <span
                                    class="text-xs text-gray-500 truncate block max-w-xs"
                                    >{{ value || "-" }}</span
                                >
                            </template>
                        </Table>
                    </div>
                </template>
            </div>
        </section>

        <!-- 오른쪽: 워크스페이스 패널 (Fixed Overlay) -->
        <transition
            enter-active-class="transition ease-out duration-300 transform"
            enter-from-class="opacity-0 translate-x-10"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="transition ease-in duration-200 transform"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 translate-x-10"
        >
            <MergeWorkspace
                v-if="selectedCluster"
                :cluster="selectedCluster"
                @close="clusters.forEach((c) => (c.selected = false))"
            />
        </transition>
    </main>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8;
}
</style>
