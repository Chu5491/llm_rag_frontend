<script setup lang="ts">
import {ref, computed, onMounted} from "vue";
import {useRouter} from "vue-router";
import {getTestCaseList, fetchProjects} from "../services/api.js";
import type {TestcaseResponse} from "../types/testcase.js";
import type {ProjectResponse} from "../types/project.js";

import Table, {type Column} from "../components/Table.vue";

const router = useRouter();

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
const selectedProjectId = ref<number | null>(null);
const searchQuery = ref("");
const itemsPerPage = ref(10);
const isLoading = ref(false);

// 검색 필터링된 TC 목록
const filteredTestCases = computed(() => {
    if (!testCases.value) return [];

    return testCases.value.filter((testCase: TestcaseResponse) => {
        const query = searchQuery.value.toLowerCase();
        const matchesSearch =
            testCase.title.toLowerCase().includes(query) ||
            testCase.module.toLowerCase().includes(query) ||
            testCase.id.toString().includes(query);
        return matchesSearch;
    });
});

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
        const list = await fetchProjects();
        projects.value = list;
        // 기본 프로젝트 선택 (첫번째)
        if (list.length > 0) {
            selectedProjectId.value = list[0].id;
            await loadTestCases();
        }
    } catch (error) {
        console.error("프로젝트 목록 로드 실패:", error);
    }
};

const loadTestCases = async () => {
    if (!selectedProjectId.value) return;

    isLoading.value = true;
    try {
        // 전체 목록 조회 (클라이언트 페이지네이션 사용)
        const list = await getTestCaseList({
            project_id: selectedProjectId.value,
            limit: 1000, // 충분히 큰 수
        });
        testCases.value = list;
    } catch (error) {
        console.error("테스트케이스 목록 로드 실패:", error);
    } finally {
        isLoading.value = false;
    }
};

// 프로젝트 변경 핸들러
const handleProjectChange = () => {
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
                <h1 class="text-2xl font-bold text-gray-900">
                    테스트케이스 관리
                </h1>
                <p class="mt-1 text-sm text-gray-500">
                    생성된 테스트케이스를 확인하고 관리할 수 있습니다.
                </p>
            </div>
        </header>

        <!-- 메인 카드 -->
        <section class="rounded-lg bg-white p-6 shadow space-y-6">
            <!-- 검색 및 필터 영역 -->
            <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
                <div class="flex-1 w-full md:w-auto">
                    <div class="relative max-w-md">
                        <span
                            class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"
                        >
                            <span class="material-icons-outlined">search</span>
                        </span>
                        <input
                            v-model="searchQuery"
                            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="테스트케이스 검색 (제목, 기능, ID)"
                        />
                    </div>
                </div>

                <div class="w-full md:w-64">
                    <label class="block text-sm font-medium text-gray-700 mb-1"
                        >프로젝트 필터</label
                    >
                    <select
                        v-model="selectedProjectId"
                        class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        @change="handleProjectChange"
                    >
                        <option
                            v-for="project in projects"
                            :key="project.id"
                            :value="project.id"
                        >
                            {{ project.name }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- 테이블 영역 -->
            <Table
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
                        <p v-if="isLoading">데이터를 불러오는 중입니다...</p>
                        <p v-else>표시할 테스트케이스가 없습니다.</p>
                    </div>
                </template>
            </Table>
        </section>
    </main>
</template>

<style scoped>
/* Scoped styles removed as Tailwind is used */
</style>
