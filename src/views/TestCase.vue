<script setup lang="ts">
import {ref, computed, onMounted, watch} from "vue";
import {useRouter, useRoute} from "vue-router";
import {
    getTestCaseList,
    fetchProjects,
    fetchHistories,
    fetchProjectDetail,
} from "../services/api.js";
import type {TestcaseResponse} from "../types/testcase.js";
import type {ProjectResponse} from "../types/project.js";
import type {GenerationItem} from "../types/Generate.js";
import SearchFilterBar from "../components/SearchFilterBar.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";

import Table, {type Column} from "../components/Table.vue";

const router = useRouter();
const route = useRoute();

// TC 상세 이동 (Table row-click)
const handleRowClick = (item: TestcaseResponse) => {
    router.push({
        name: "TestCaseDetail",
        params: {id: item.id},
    });
};

// 테이블 컬럼 정의 (API 스키마 매핑)
const columns: Column[] = [
    {key: "testcase_id_tag", label: "TC ID", width: "w-24"},
    {key: "module", label: "기능", width: "w-32"},
    {key: "title", label: "타이틀"},
    {key: "priority", label: "중요도", width: "w-24"},
    {key: "created_at", label: "작성일", width: "w-32"},
    {key: "updated_at", label: "최근 수정일", width: "w-32"},
    {key: "status", label: "상태", width: "w-28", align: "center"},
];

// 데이터 상태
const testCases = ref<TestcaseResponse[]>([]);
const projects = ref<ProjectResponse[]>([]);
const histories = ref<GenerationItem[]>([]);

// URL Query에서 초기값 로드
const getQueryParam = (key: string) => {
    const val = route.query[key];
    return val ? String(val) : "";
};
const getQueryNumber = (key: string) => {
    const val = route.query[key];
    return val ? Number(val) : null;
};

const selectedProjectId = ref<number | null>(getQueryNumber("pid"));
const selectedProjectDetail = ref<ProjectResponse | null>(null); // To store features

const selectedHistoryId = ref<number | null>(getQueryNumber("hid"));
const selectedStatus = ref<string>(getQueryParam("stat"));
const selectedPriority = ref<string>(getQueryParam("pri"));
const selectedModule = ref<string>(getQueryParam("mod"));

const searchQuery = ref(getQueryParam("q"));
const itemsPerPage = ref(10);
const isLoading = ref(false);

// 상태 변경 시 URL 업데이트
watch(
    [
        selectedProjectId,
        selectedHistoryId,
        selectedStatus,
        selectedPriority,
        selectedModule,
        searchQuery,
    ],
    () => {
        router.replace({
            query: {
                ...route.query,
                pid: selectedProjectId.value || undefined,
                hid: selectedHistoryId.value || undefined,
                stat: selectedStatus.value || undefined,
                pri: selectedPriority.value || undefined,
                mod: selectedModule.value || undefined,
                q: searchQuery.value || undefined,
            },
        });
    }
);

// 선택된 프로젝트의 히스토리 목록
const projectHistories = computed(() => {
    if (!selectedProjectId.value) return [];
    return histories.value;
});

// 선택된 프로젝트의 기능 목록 (현재 로드된 TC 리스트 기반 동적 생성)
const projectModules = computed(() => {
    if (!testCases.value || testCases.value.length === 0) return [];
    // TC 리스트에서 module만 추출하여 중복 제거
    const modules = new Set(
        testCases.value.map((tc) => tc.module).filter(Boolean)
    );
    return Array.from(modules).sort();
});

// 검색 필터링된 TC 목록
const filteredTestCases = computed(() => {
    if (!testCases.value) return [];

    return testCases.value.filter((testCase: TestcaseResponse) => {
        const query = searchQuery.value.toLowerCase();

        // 1. Search Query
        const matchesSearch =
            testCase.title.toLowerCase().includes(query) ||
            testCase.module.toLowerCase().includes(query) ||
            (testCase.testcase_id_tag || "").toLowerCase().includes(query);

        if (!matchesSearch) return false;

        // 2. Module Filter
        if (selectedModule.value && testCase.module !== selectedModule.value) {
            return false;
        }

        // 3. Priority Filter
        if (
            selectedPriority.value &&
            testCase.priority !== selectedPriority.value
        ) {
            return false;
        }

        // 4. Status Filter
        if (selectedStatus.value && testCase.status !== selectedStatus.value) {
            return false;
        }

        return true;
    });
});

// 히스토리 변경 핸들러
const handleHistoryChange = async () => {
    // 히스토리 변경 시 기존 필터 초기화 여부는 UX 결정 사항 (현재는 유지)
    loadTestCases();
};

// 날짜 포맷팅
const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("ko-KR", options);
};

// 데이터 로드
const loadProjects = async () => {
    try {
        const projectList = await fetchProjects();
        projects.value = projectList;

        // URL에 프로젝트 ID가 있으면 데이터 로드 트리거
        if (selectedProjectId.value) {
            await handleProjectChange();
        }
    } catch (error) {
        console.error("데이터 로드 실패:", error);
    }
};

const loadTestCases = async () => {
    if (!selectedProjectId.value || !selectedHistoryId.value) {
        testCases.value = []; // 히스토리 없을 시 리스트 초기화
        return;
    }

    isLoading.value = true;
    try {
        // 전체 목록 조회 (클라이언트 페이지네이션 사용)
        const list = await getTestCaseList({
            project_id: selectedProjectId.value,
            limit: 10000,
            status: undefined,
            history_id: selectedHistoryId.value, // 필수
            priority: undefined, // 필터는 클라이언트 사이드에서 처리 (또는 필요시 여기에 연결)
            module: undefined,
        });
        testCases.value = list;
    } catch (error) {
        console.error("테스트케이스 목록 로드 실패:", error);
        testCases.value = [];
    } finally {
        isLoading.value = false;
    }
};

// 필터 변경 핸들러
const handleProjectChange = async () => {
    if (!selectedProjectId.value) return;

    try {
        // 병렬 조회: 프로젝트 상세(기능) + 히스토리 목록
        const [detail, historyList] = await Promise.all([
            fetchProjectDetail(selectedProjectId.value),
            fetchHistories(selectedProjectId.value),
        ]);

        selectedProjectDetail.value = detail;
        histories.value = historyList;
    } catch (e) {
        console.error("프로젝트 데이터 조회 실패:", e);
    }

    loadTestCases();
};

const handleFilterChange = () => {
    loadTestCases();
};

// 초기화
onMounted(() => {
    loadProjects();
});
</script>

<template>
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 -->
        <header
            class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        >
            <div>
                <p class="mt-1 text-sm text-gray-500">
                    생성된 테스트케이스를 확인하고 관리할 수 있습니다.
                </p>
            </div>
        </header>

        <!-- 상단: 프로젝트 선택 및 검색/필터 -->
        <SearchFilterBar
            :search-query="searchQuery"
            search-placeholder="테스트케이스 검색 (제목, ID)"
            :projects="projects"
            :selected-project-id="selectedProjectId"
            :is-filter-active="
                !!(selectedModule || selectedPriority || selectedStatus)
            "
            @update:search-query="searchQuery = $event"
            @update:selected-project-id="
                // 타입 강제 변환 및 핸들러 호출
                selectedProjectId = $event ? Number($event) : null;
                // 프로젝트 변경 시 하위 필터 및 데이터 초기화
                selectedHistoryId = null;
                testCases = []; // 리스트 클리어
                selectedModule = '';
                selectedPriority = '';
                selectedStatus = '';
                handleProjectChange();
            "
            @reset="
                selectedModule = '';
                selectedPriority = '';
                selectedStatus = '';
                handleFilterChange();
            "
        >
            <!-- 프로젝트 옵션 -->
            <template #project-options>
                <option value="" disabled selected>
                    프로젝트를 선택하세요
                </option>
                <option
                    v-for="project in projects"
                    :key="project.id"
                    :value="project.id"
                >
                    {{ project.name }}
                </option>
            </template>

            <!-- 히스토리 선택 (Main Bar) -->
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
                        v-for="history in projectHistories"
                        :key="history.id"
                        :value="history.id"
                    >
                        {{ history.title || formatDate(history.started_at) }}
                    </option>
                </select>
            </template>

            <!-- 상세 필터 내용 -->
            <template #filters>
                <div class="space-y-6">
                    <!-- 1. 기능(Module) 필터 (Dynamic) -->
                    <div class="space-y-2">
                        <label class="block text-sm font-bold text-gray-700"
                            >기능 분류</label
                        >
                        <div
                            class="max-h-40 overflow-y-auto space-y-1 p-1 border border-gray-100 rounded-md"
                        >
                            <label
                                class="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                :class="{
                                    'bg-blue-50 border-blue-200':
                                        selectedModule === '',
                                }"
                            >
                                <input
                                    type="radio"
                                    v-model="selectedModule"
                                    value=""
                                    class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    @change="handleFilterChange"
                                />
                                <span class="text-sm text-gray-700">전체</span>
                            </label>

                            <!-- Dynamic Modules from TestCase List -->
                            <label
                                v-for="moduleName in projectModules"
                                :key="moduleName"
                                class="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                :class="{
                                    'bg-blue-50 border-blue-200':
                                        selectedModule === moduleName,
                                }"
                            >
                                <input
                                    type="radio"
                                    v-model="selectedModule"
                                    :value="moduleName"
                                    class="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                    @change="handleFilterChange"
                                />
                                <span class="text-sm text-gray-700">{{
                                    moduleName
                                }}</span>
                            </label>
                        </div>
                        <p
                            v-if="projectModules.length === 0"
                            class="text-xs text-gray-400"
                        >
                            * 리스트에 있는 기능만 표시됩니다.
                        </p>
                    </div>

                    <hr class="border-gray-100" />

                    <!-- 2. 중요도 & 상태 -->
                    <div class="grid grid-cols-2 gap-4">
                        <!-- Priority -->
                        <div class="space-y-2">
                            <label class="block text-sm font-bold text-gray-700"
                                >중요도</label
                            >
                            <select
                                v-model="selectedPriority"
                                class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                                @change="handleFilterChange"
                            >
                                <option value="">전체</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>

                        <!-- Status -->
                        <div class="space-y-2">
                            <label class="block text-sm font-bold text-gray-700"
                                >상태</label
                            >
                            <select
                                v-model="selectedStatus"
                                class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                                @change="handleFilterChange"
                            >
                                <option value="">전체</option>
                                <option value="generated">Generated</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>
            </template>
        </SearchFilterBar>

        <!-- 메인 카드 -->
        <section class="rounded-lg bg-white p-6 shadow space-y-6">
            <!-- 1. 프로젝트/히스토리 미선택 상태 -->
            <div
                v-if="!selectedProjectId || !selectedHistoryId"
                class="flex flex-col items-center justify-center py-20 text-gray-400"
            >
                <span class="material-icons-outlined text-5xl mb-3"
                    >assignment_late</span
                >
                <p class="text-lg font-medium text-gray-600">
                    프로젝트와 생성 히스토리를 선택해주세요
                </p>
                <p class="text-sm mt-1">
                    히스토리를 선택하면 해당 테스트케이스 목록을 확인할 수
                    있습니다.
                </p>
            </div>

            <!-- 2. 로딩 상태 -->
            <LoadingSpinner
                v-else-if="isLoading"
                message="테스트케이스 목록을 불러오는 중입니다..."
            />

            <!-- 3. 테이블 영역 (데이터 로드 완료 후) -->
            <Table
                v-else
                :columns="columns"
                :data="filteredTestCases"
                v-model:items-per-page="itemsPerPage"
                pagination-mode="client"
                @row-click="handleRowClick"
            >
                <!-- TC ID -->
                <template #cell-testcase_id_tag="{value}">
                    <span class="font-mono text-gray-500 text-xs">{{
                        value
                    }}</span>
                </template>

                <!-- 기능 (Module) -->
                <template #cell-module="{value}">
                    <span
                        class="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                    >
                        {{ value }}
                    </span>
                </template>

                <!-- 타이틀 -->
                <template #cell-title="{value}">
                    <span class="font-medium text-gray-900">{{ value }}</span>
                </template>

                <!-- 중요도 -->
                <template #cell-priority="{value}">
                    <span
                        v-if="value"
                        class="px-2 py-0.5 rounded text-xs font-medium"
                        :class="{
                            'bg-red-100 text-red-700': value === 'High',
                            'bg-yellow-100 text-yellow-800': value === 'Medium',
                            'bg-gray-100 text-gray-700': value === 'Low',
                        }"
                    >
                        {{ value }}
                    </span>
                    <span v-else class="text-gray-400 text-xs">-</span>
                </template>

                <!-- 작성일 -->
                <template #cell-created_at="{value}">
                    <span class="text-gray-500 text-sm">{{
                        formatDate(value)
                    }}</span>
                </template>

                <!-- 수정일 -->
                <template #cell-updated_at="{value}">
                    <span class="text-gray-500 text-sm">{{
                        formatDate(value)
                    }}</span>
                </template>

                <!-- 상태 (status) -->
                <template #cell-status="{value}">
                    <span
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        :class="{
                            'bg-green-50 text-green-700': value === 'active',
                            'bg-blue-50 text-blue-700': value === 'generated',
                            'bg-gray-100 text-gray-600':
                                value !== 'active' && value !== 'generated',
                        }"
                    >
                        <span
                            class="w-1.5 h-1.5 rounded-full"
                            :class="{
                                'bg-green-500': value === 'active',
                                'bg-blue-500': value === 'generated',
                                'bg-gray-400':
                                    value !== 'active' && value !== 'generated',
                            }"
                        ></span>
                        {{
                            value === "active"
                                ? "Active"
                                : value === "generated"
                                ? "Generated"
                                : value === "inactive"
                                ? "Inactive"
                                : value
                        }}
                    </span>
                </template>

                <!-- 데이터 없음 (로딩 중이 아니고 데이터가 0일 때) -->
                <template #empty>
                    <div class="py-12 text-center text-gray-500">
                        <p>표시할 테스트케이스가 없습니다.</p>
                    </div>
                </template>
            </Table>
        </section>
    </main>
</template>

<style scoped>
/* Scoped styles removed as Tailwind is used */
</style>
