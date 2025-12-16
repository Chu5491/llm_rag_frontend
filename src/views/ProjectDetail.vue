<template>
    <main class="p-6 space-y-6">
        <!-- Header Section -->
        <header class="flex justify-between items-start">
            <div>
                <h1 class="text-2xl font-semibold text-gray-900">
                    프로젝트 상세 정보
                </h1>
                <p class="mt-1 text-sm text-gray-500">
                    등록된 프로젝트의 상세 정보를 확인할 수 있습니다.
                </p>
            </div>
            <button
                @click="goBack"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
                뒤로 가기
            </button>
        </header>

        <!-- Main Content -->
        <section class="rounded-lg bg-white p-6 shadow space-y-8">
            <!-- Basic Info Section -->
            <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">
                    기본 정보
                </h3>
                <div class="bg-gray-50 p-5 rounded-lg border border-gray-100">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-4">
                            <div>
                                <p
                                    class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                                >
                                    프로젝트 이름
                                </p>
                                <p class="text-base font-medium text-gray-900">
                                    {{ project.name }}
                                </p>
                            </div>
                            <div>
                                <p
                                    class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                                >
                                    생성 일자
                                </p>
                                <p class="text-base text-gray-900">
                                    {{ formatDate(project.createdAt) }}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p
                                class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
                            >
                                프로젝트 설명
                            </p>
                            <p
                                class="text-base text-gray-700 whitespace-pre-line leading-relaxed"
                            >
                                {{ project.description }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Artifacts Section -->
            <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">
                    등록된 산출물
                </h3>
                <div
                    class="overflow-hidden rounded-lg border border-gray-200 shadow-sm"
                >
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th
                                    scope="col"
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    유형
                                </th>
                                <th
                                    scope="col"
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    파일명
                                </th>
                                <th
                                    scope="col"
                                    class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    데이터 분석
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr
                                v-for="artifact in project.artifacts"
                                :key="artifact.id"
                                class="hover:bg-gray-50 transition-colors"
                            >
                                <td
                                    class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                                >
                                    {{ artifact.type }}
                                </td>
                                <td
                                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                >
                                    {{ artifact.name }}
                                </td>
                                <td
                                    class="px-6 py-4 whitespace-nowrap text-center"
                                >
                                    <span
                                        :class="{
                                            'bg-green-100 text-green-800':
                                                artifact.status === '완료',
                                            'bg-yellow-100 text-yellow-800':
                                                artifact.status === '부분 완료',
                                            'bg-red-100 text-red-800':
                                                artifact.status === '실패',
                                        }"
                                        class="px-2.5 py-0.5 text-xs font-medium rounded-full"
                                    >
                                        {{ artifact.status }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- External Systems Section -->
            <div v-if="project.externalSystems.length > 0">
                <h3 class="text-lg font-medium text-gray-900 mb-4">
                    외부 시스템 데이터 분석
                </h3>
                <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    <div
                        v-for="system in project.externalSystems"
                        :key="system.id"
                        class="flex items-center p-4 rounded-lg border border-gray-200 hover:border-indigo-500 bg-white shadow-sm transition-all cursor-default"
                    >
                        <div
                            :class="{
                                'bg-blue-50 text-blue-700':
                                    system.id === 'Jira',
                                'bg-purple-50 text-purple-700':
                                    system.id === 'Figma',
                            }"
                            class="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg"
                        >
                            {{ getSystemIcon(system.id) }}
                        </div>
                        <div class="ml-4">
                            <p class="text-base font-semibold text-gray-900">
                                {{ system.name }}
                            </p>
                            <div class="flex items-center mt-1">
                                <span
                                    class="h-2 w-2 rounded-full mr-2"
                                    :class="
                                        system.status === 'connected'
                                            ? 'bg-green-500'
                                            : 'bg-red-500'
                                    "
                                ></span>
                                <p class="text-xs text-gray-500">
                                    {{
                                        system.status === "connected"
                                            ? "분석 완료"
                                            : "사용 안함"
                                    }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
</template>

<script setup lang="ts">
import {ref, onMounted} from "vue";
import {useRoute, useRouter} from "vue-router";

const route = useRoute();
const router = useRouter();

// 프로젝트 데이터 (실제로는 API에서 가져옴)
const project = ref({
    id: route.params.id as string,
    name: "새로운 프로젝트",
    description:
        "이 프로젝트는 테스트를 위한 프로젝트입니다.\n여러 줄로 된 설명을 확인할 수 있습니다.",
    createdAt: new Date().toISOString(),
    artifacts: [
        {
            id: 1,
            type: "요구사항정의서",
            name: "요구사항정의서_v1.0.pdf",
            status: "완료",
        },
        {
            id: 2,
            type: "화면설계서",
            name: "화면설계서_v1.0.pdf",
            status: "부분 완료",
        },
        {id: 3, type: "API 문서", name: "API_문서_v1.0.pdf", status: "실패"},
    ],
    externalSystems: [
        {id: "Figma", name: "Figma", status: "connected"},
        {id: "Jira", name: "Jira", status: "disconnected"},
    ],
});

// 외부 시스템 아이콘 매핑
const getSystemIcon = (systemId: string) => {
    const icons: Record<string, string> = {
        Jira: "J",
        Figma: "F",
        Github: "G",
        Slack: "S",
    };
    return icons[systemId] || "•";
};

// 날짜 포맷팅
const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    };
    return new Date(dateString).toLocaleDateString("ko-KR", options);
};

// 뒤로 가기
const goBack = () => {
    router.go(-1);
};
</script>
