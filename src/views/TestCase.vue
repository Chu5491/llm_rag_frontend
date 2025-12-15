<template>
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 -->
        <header>
            <h1 class="text-2xl font-semibold text-gray-900">
                테스트케이스 관리
            </h1>
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
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                TC ID
                            </th>
                            <th
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                기능
                            </th>
                            <th
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                타이틀
                            </th>
                            <th
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                중요도
                            </th>
                            <th
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                작성일
                            </th>
                            <th
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                최근 수정일
                            </th>
                            <th
                                class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                검증 결과
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr
                            v-for="testCase in filteredTestCases"
                            :key="testCase.id"
                            class="hover:bg-gray-50 transition-colors cursor-pointer"
                            @click="goToTestCaseDetail(testCase.id)"
                        >
                            <td
                                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            >
                                {{ testCase.id }}
                            </td>
                            <td
                                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            >
                                {{ testCase.function }}
                            </td>
                            <td
                                class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                            >
                                {{ testCase.title }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span
                                    :class="`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        testCase.priority === 'High'
                                            ? 'bg-red-100 text-red-800'
                                            : testCase.priority === 'Medium'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-green-100 text-green-800'
                                    }`"
                                >
                                    {{ testCase.priority }}
                                </span>
                            </td>
                            <td
                                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            >
                                {{ formatDate(testCase.createdAt) }}
                            </td>
                            <td
                                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            >
                                {{ formatDate(testCase.updatedAt) }}
                            </td>
                            <td
                                class="px-6 py-4 whitespace-nowrap text-center text-sm"
                            >
                                <button
                                    @click="handleStatusClick(testCase)"
                                    :class="`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                        testCase.status === 'approved'
                                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                            : testCase.status === 'ai'
                                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                                    }`"
                                >
                                    {{
                                        testCase.status === "approved"
                                            ? "사용"
                                            : testCase.status === "ai"
                                            ? "AI"
                                            : "반려"
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

<script setup>
import {ref, computed} from "vue";
import {useRouter} from "vue-router";

const router = useRouter();

// 테스트케이스 상세 페이지로 이동
const goToTestCaseDetail = (testCaseId) => {
    router.push({
        name: "TestCaseDetail",
        params: {id: testCaseId},
    });
};
// Sample data - replace with your actual data fetching logic
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

// Computed property for filtered test cases
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

// Format date for display
const formatDate = (dateString) => {
    const options = {year: "numeric", month: "2-digit", day: "2-digit"};
    return new Date(dateString).toLocaleDateString("ko-KR", options);
};

// Handle status button click
const handleStatusClick = (testCase) => {
    // Cycle through statuses: approved -> ai -> rejected -> approved
    const statusOrder = ["approved", "ai", "rejected"];
    const currentIndex = statusOrder.indexOf(testCase.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    testCase.status = statusOrder[nextIndex];
};

// Filter test cases by project
const filterByProject = () => {
    // Add your project filtering logic here
    console.log("Filtering by project:", selectedProject.value);
};

// Filter test cases by search query
const filterTestCases = () => {
    // Search is handled by the computed property
};
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
