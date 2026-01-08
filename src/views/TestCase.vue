<script setup lang="ts">
import {ref, computed} from "vue";
import {useRouter} from "vue-router";

import Table, {type Column} from "../components/Table.vue";

const router = useRouter();

// TC 상세 이동 (Table row-click)
const handleRowClick = (item: any) => {
    router.push({
        name: "TestCaseDetail",
        params: {id: item.id},
    });
};

// 테이블 컬럼 정의
const columns: Column[] = [
    {key: "id", label: "TC ID", width: "w-24"},
    {key: "function", label: "기능", width: "w-24"},
    {key: "title", label: "타이틀"},
    {key: "priority", label: "중요도", width: "w-24"},
    {key: "createdAt", label: "작성일", width: "w-32"},
    {key: "updatedAt", label: "최근 수정일", width: "w-32"},
    {key: "status", label: "검증 결과", width: "w-28", align: "center"},
];

// 샘플 데이터
const testCases = ref([
    {
        id: "TC-001",
        function: "Login",
        title: "Valid Credential Login",
        priority: "High",
        createdAt: "2023-10-25",
        updatedAt: "2023-10-27",
        status: "approved",
    },
    {
        id: "TC-002",
        function: "Login",
        title: "Invalid Password Check",
        priority: "High",
        createdAt: "2023-10-25",
        updatedAt: "2023-10-26",
        status: "ai",
    },
    {
        id: "TC-003",
        function: "Payment",
        title: "Legacy Gateway Timeout",
        priority: "Medium",
        createdAt: "2023-10-20",
        updatedAt: "2023-10-21",
        status: "rejected",
    },
    {
        id: "TC-004",
        function: "Search",
        title: "Empty Query Behavior",
        priority: "Low",
        createdAt: "2023-10-28",
        updatedAt: "2023-10-28",
        status: "approved",
    },
    {
        id: "TC-005",
        function: "Profile",
        title: "Image Upload Format Check",
        priority: "Medium",
        createdAt: "2023-10-22",
        updatedAt: "2023-10-24",
        status: "approved",
    },
]);

const projects = ref(["SKT Agent Bench", "T-Gen", "Samsung VOC"]);
const selectedProject = ref("SKT Agent Bench");
const searchQuery = ref("");
const itemsPerPage = ref(10);

// 검색 필터링된 TC 목록
const filteredTestCases = computed(() => {
    return testCases.value.filter((testCase) => {
        const matchesSearch =
            testCase.title
                .toLowerCase()
                .includes(searchQuery.value.toLowerCase()) ||
            testCase.function
                .toLowerCase()
                .includes(searchQuery.value.toLowerCase()) ||
            testCase.id.toLowerCase().includes(searchQuery.value.toLowerCase());
        return matchesSearch;
    });
});

// 날짜 포맷팅
const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("ko-KR", options);
};

// 상태 버튼 클릭 핸들러 (Cycle)
const handleStatusClick = (testCase: any) => {
    // Cycle through statuses: approved -> ai -> rejected -> approved
    const statusOrder = ["approved", "ai", "rejected"];
    const currentIndex = statusOrder.indexOf(testCase.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    testCase.status = statusOrder[nextIndex];
};

// 프로젝트별 필터링
const filterByProject = () => {
    // Add your project filtering logic here
    console.log("Filtering by project:", selectedProject.value);
};
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
                            placeholder="테스트케이스 검색"
                        />
                    </div>
                </div>

                <div class="w-full md:w-64">
                    <label class="block text-sm font-medium text-gray-700 mb-1"
                        >프로젝트 필터</label
                    >
                    <select
                        v-model="selectedProject"
                        class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        @change="filterByProject"
                    >
                        <option
                            v-for="project in projects"
                            :key="project"
                            :value="project"
                        >
                            {{ project }}
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
                <template #cell-id="{value}">
                    <span class="text-gray-500">{{ value }}</span>
                </template>

                <!-- 기능 -->
                <template #cell-function="{value}">
                    <span class="text-gray-500">{{ value }}</span>
                </template>

                <!-- 타이틀 -->
                <template #cell-title="{value}">
                    <span class="font-medium text-gray-900">{{ value }}</span>
                </template>

                <!-- 중요도 -->
                <template #cell-priority="{value}">
                    <span
                        :class="`priority-tag ${
                            value === 'High'
                                ? 'priority-high'
                                : value === 'Medium'
                                ? 'priority-medium'
                                : 'priority-low'
                        }`"
                    >
                        {{ value }}
                    </span>
                </template>

                <!-- 작성일 -->
                <template #cell-createdAt="{value}">
                    <span class="text-gray-500">{{ formatDate(value) }}</span>
                </template>

                <!-- 수정일 -->
                <template #cell-updatedAt="{value}">
                    <span class="text-gray-500">{{ formatDate(value) }}</span>
                </template>

                <!-- 상태 (Verification Result in UI) -->
                <template #cell-status="{value, item}">
                    <button
                        @click.stop="handleStatusClick(item)"
                        :class="`status-badge ${
                            value === 'approved'
                                ? 'status-approved'
                                : value === 'ai'
                                ? 'status-ai'
                                : 'status-rejected'
                        }`"
                    >
                        {{
                            value === "approved"
                                ? "사용"
                                : value === "ai"
                                ? "AI 생성"
                                : "미사용"
                        }}
                    </button>
                </template>
            </Table>
        </section>
    </main>
</template>

<style scoped>
/* Add any component-specific styles here */
</style>
