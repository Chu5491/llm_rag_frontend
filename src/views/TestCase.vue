<script setup>
import {ref, computed} from "vue";
import {useRouter} from "vue-router";

const router = useRouter();

// TC 상세 이동
const goToTestCaseDetail = (testCaseId) => {
    router.push({
        name: "TestCaseDetail",
        params: {id: testCaseId},
    });
};
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
const formatDate = (dateString) => {
    const options = {year: "numeric", month: "2-digit", day: "2-digit"};
    return new Date(dateString).toLocaleDateString("ko-KR", options);
};

// 상태 버튼 클릭 핸들러 (Cycle)
const handleStatusClick = (testCase) => {
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

// 검색 필터링 (Computed에서 처리)
const filterTestCases = () => {
    // Search is handled by the computed property
};
</script>

<template>
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 -->
        <header>
            <p class="mt-1 text-sm text-gray-500">
                생성된 테스트케이스를 확인하고 관리할 수 있습니다.
            </p>
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
                            @input="filterTestCases"
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
            <div class="overflow-x-auto">
                <table class="table-container">
                    <thead class="table-header">
                        <tr>
                            <th class="table-header-cell">TC ID</th>
                            <th class="table-header-cell">기능</th>
                            <th class="table-header-cell">타이틀</th>
                            <th class="table-header-cell">중요도</th>
                            <th class="table-header-cell">작성일</th>
                            <th class="table-header-cell">최근 수정일</th>
                            <th class="table-header-cell text-center">
                                검증 결과
                            </th>
                        </tr>
                    </thead>
                    <tbody class="table-body">
                        <tr
                            v-for="testCase in filteredTestCases"
                            :key="testCase.id"
                            class="table-row cursor-pointer"
                            @click="goToTestCaseDetail(testCase.id)"
                        >
                            <td class="table-cell text-gray-500">
                                {{ testCase.id }}
                            </td>
                            <td class="table-cell text-gray-500">
                                {{ testCase.function }}
                            </td>
                            <td class="table-cell font-medium text-gray-900">
                                {{ testCase.title }}
                            </td>
                            <td class="table-cell">
                                <span
                                    :class="`priority-tag ${
                                        testCase.priority === 'High'
                                            ? 'priority-high'
                                            : testCase.priority === 'Medium'
                                            ? 'priority-medium'
                                            : 'priority-low'
                                    }`"
                                >
                                    {{ testCase.priority }}
                                </span>
                            </td>
                            <td class="table-cell text-gray-500">
                                {{ formatDate(testCase.createdAt) }}
                            </td>
                            <td class="table-cell text-gray-500">
                                {{ formatDate(testCase.updatedAt) }}
                            </td>
                            <td class="table-cell text-center">
                                <button
                                    @click.stop="handleStatusClick(testCase)"
                                    :class="`status-badge ${
                                        testCase.status === 'approved'
                                            ? 'status-approved'
                                            : testCase.status === 'ai'
                                            ? 'status-ai'
                                            : 'status-rejected'
                                    }`"
                                >
                                    {{
                                        testCase.status === "approved"
                                            ? "사용"
                                            : testCase.status === "ai"
                                            ? "AI 생성"
                                            : "미사용"
                                    }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </main>
</template>

<style scoped>
/* Add any component-specific styles here */
</style>
