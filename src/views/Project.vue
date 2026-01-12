<script setup lang="ts">
import {ref, onMounted, computed, watch} from "vue";
import {useRouter, useRoute} from "vue-router";
import {fetchProjects} from "../services/projectApi.js";
import type {ProjectResponse} from "../types/project.js";
import Table, {type Column} from "../components/Table.vue";
import LoadingSpinner from "../components/LoadingSpinner.vue";
import SearchFilterBar from "../components/SearchFilterBar.vue";

const router = useRouter();
const route = useRoute();

// 프로젝트 목록 상태
const projects = ref<ProjectResponse[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const itemsPerPage = ref(10);
const searchQuery = ref((route.query.q as string) || "");

// URL 동기화
watch(searchQuery, (newVal) => {
    router.replace({
        query: {
            ...route.query,
            q: newVal || undefined,
        },
    });
});

// 검색 필터링
const filteredProjects = computed(() => {
    if (!searchQuery.value) return projects.value;
    const query = searchQuery.value.toLowerCase();
    return projects.value.filter(
        (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query))
    );
});

// 테이블 컬럼 정의
const tableColumns: Column[] = [
    {key: "id", label: "ID", width: "w-16", align: "center", sortable: true},
    {key: "name", label: "프로젝트명", width: "w-48", sortable: true},
    {key: "status", label: "상태", width: "w-24", align: "center"},
    {key: "service_type", label: "유형", width: "w-32", sortable: true},
    {key: "description", label: "설명", width: "w-24", sortable: false},
    {
        key: "tc_count",
        label: "TC 건 수",
        width: "w-28",
        align: "center",
        sortable: true,
    },
    {
        key: "created_at",
        label: "등록일",
        width: "w-32",
        align: "center",
        sortable: true,
    },
    {
        key: "updated_at",
        label: "수정일",
        width: "w-32",
        align: "center",
        sortable: true,
    },
    {key: "is_active", label: "사용 여부", width: "w-32", align: "center"},
];

// 날짜 포맷팅 Helper
const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
};

// 데이터 로드 (전체 로드)
const loadProjects = async () => {
    isLoading.value = true;
    error.value = null;
    try {
        // LIMIT 1000으로 설정하여 사실상 전체 데이터를 가져옴
        const data = await fetchProjects(0, 1000);
        projects.value = data;
    } catch (e: any) {
        console.error("프로젝트 로드 실패:", e);
        error.value = "프로젝트 목록을 불러오는 데 실패했습니다.";
    } finally {
        isLoading.value = false;
    }
};

// 숫자 포맷팅 (천 단위 콤마)
const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
};

// 상세 페이지 이동 (Table row-click 이벤트 핸들러)
const handleRowClick = (item: any) => {
    router.push(`/project/detail/${item.id}`);
};

// 초기 로드
onMounted(() => {
    loadProjects();
});
</script>

<template>
    <!-- 대시보드 메인 래퍼 -->
    <main class="p-6 space-y-6">
        <!-- 페이지 헤더 -->
        <header
            class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        >
            <div>
                <p class="mt-1 text-sm text-gray-500">
                    생성된 프로젝트의 목록을 조회합니다.
                </p>
            </div>
            <RouterLink
                to="/project/new"
                class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                <span>프로젝트 등록</span>
            </RouterLink>
        </header>

        <!-- 검색 필터 -->
        <SearchFilterBar
            :search-query="searchQuery"
            search-placeholder="프로젝트 명 또는 설명으로 검색하세요..."
            :projects="undefined!"
            :selected-project-id="null"
            @update:search-query="searchQuery = $event"
        >
            <!-- 프로젝트 리스트 페이지이므로 프로젝트 선택 셀렉터는 숨김 -->
            <template #project-options></template>
        </SearchFilterBar>

        <!-- 메인 카드 -->
        <section class="rounded-lg bg-white p-6 shadow space-y-6 min-h-[400px]">
            <!-- 로딩 상태 -->
            <LoadingSpinner
                v-if="isLoading"
                message="프로젝트 목록을 불러오는 중입니다..."
            />

            <!-- 에러 상태 -->
            <div
                v-else-if="error"
                class="flex flex-col items-center justify-center py-20"
            >
                <span class="material-icons-outlined text-4xl text-red-400"
                    >error_outline</span
                >
                <p class="mt-2 text-sm text-gray-500">{{ error }}</p>
                <button
                    @click="loadProjects"
                    class="mt-4 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    다시 시도
                </button>
            </div>

            <!-- 프로젝트 목록 테이블 -->
            <Table
                v-else
                :columns="tableColumns"
                :data="filteredProjects"
                v-model:items-per-page="itemsPerPage"
                pagination-mode="client"
                @row-click="handleRowClick"
            >
                <template #cell-name="{value}">
                    <code class="text-xs font-mono text-indigo-600">
                        {{ value }}
                    </code>
                </template>

                <!-- 상태 (TC Count 기반) -->
                <template #cell-status="{item}">
                    <span
                        class="px-2 py-0.5 rounded text-xs font-medium"
                        :class="
                            item.tc_count > 0
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                        "
                    >
                        {{ item.tc_count > 0 ? "Active" : "Archived" }}
                    </span>
                </template>

                <template #cell-service_type="{value}">
                    <span
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                    >
                        {{ value }}
                    </span>
                </template>
                <template #cell-description="{value}">
                    <div class="truncate max-w-xs" :title="value">
                        {{ value }}
                    </div>
                </template>
                <template #cell-tc_count="{value}">
                    <span class="badge badge-green">
                        {{ formatNumber(value) }}
                    </span>
                </template>

                <!-- 날짜 필드 -->
                <template #cell-created_at="{value}">
                    <span class="text-gray-500 text-xs">{{
                        formatDate(value)
                    }}</span>
                </template>
                <template #cell-updated_at="{value}">
                    <span class="text-gray-500 text-xs">{{
                        formatDate(value)
                    }}</span>
                </template>

                <!-- 사용 여부 (하드코딩) -->
                <template #cell-is_active>
                    <span
                        class="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
                    >
                        사용
                    </span>
                </template>
            </Table>
        </section>
    </main>
</template>
