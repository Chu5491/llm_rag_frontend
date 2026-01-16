<script setup lang="ts" generic="T extends Record<string, any>">
import {ref, computed, watch} from "vue";
import SortIndicator from "./SortIndicator.vue";

export interface Column {
    key: string;
    label: string;
    width?: string;
    sortable?: boolean;
    align?: "left" | "center" | "right";
    class?: string;
}

const props = withDefaults(
    defineProps<{
        columns: Column[];
        data: T[];
        itemsPerPage?: number;
        expandable?: boolean;
        rowKey?: string;
        totalItems?: number; // Server side total items, ignored in client mode
        currentPage?: number; // Server side current page, initial page in client mode
        sortKey?: string; // Server side sort key, initial sort key in client mode
        sortOrder?: "asc" | "desc"; // Server side sort order, initial sort order in client mode

        paginationMode?: "server" | "client"; // Pagination mode
        rowClass?: (item: T) => string; // Custom row class function
    }>(),
    {
        itemsPerPage: 10,
        expandable: false,
        rowKey: "id",
        totalItems: 0,
        currentPage: 1,
        sortKey: "",
        sortOrder: "asc",
        paginationMode: "server",
    }
);

const emit = defineEmits<{
    (e: "row-click", item: T): void;
    (e: "update:currentPage", page: number): void;
    (e: "update:itemsPerPage", count: number): void;
    (e: "update:sort", sort: {key: string; order: "asc" | "desc"}): void;
}>();

// Rows Per Page Options
const rowsPerPageOptions = [5, 10, 20, 50, 100];

// 펼쳐진 행 (ID 기준 string | number)
const expandedRows = ref(new Set<string | number>());

// --- Client Side State ---
// 클라이언트 모드일 때만 사용하는 내부 상태
// props.currentPage 등을 초기값으로 사용
const clientCurrentPage = ref(props.currentPage);
const clientSortKey = ref(props.sortKey);
const clientSortOrder = ref<"asc" | "desc">(props.sortOrder);

// Props 변경 시 내부 상태 동기화 (필요한 경우)
watch(
    () => props.currentPage,
    (newVal) => {
        if (props.paginationMode === "client") {
            clientCurrentPage.value = newVal;
        }
    }
);

// 모드에 따른 현재 상태 (Computed)
const currentSortKey = computed(() =>
    props.paginationMode === "server" ? props.sortKey : clientSortKey.value
);
const currentSortOrder = computed(() =>
    props.paginationMode === "server" ? props.sortOrder : clientSortOrder.value
);
const currentPageValue = computed(() =>
    props.paginationMode === "server"
        ? props.currentPage
        : clientCurrentPage.value
);

// 데이터 변경 시 Client Page 리셋 여부
watch(
    () => props.data.length,
    () => {
        if (props.paginationMode === "client") {
            // Re-calculate total pages
            const total = props.data.length;
            const maxPage = Math.ceil(total / props.itemsPerPage) || 1;
            if (clientCurrentPage.value > maxPage) {
                clientCurrentPage.value = maxPage;
            }
        }
    }
);

// --- Processed Data (Sorting & Pagination for Client Mode) ---
const processedData = computed<T[]>(() => {
    if (props.paginationMode === "server") {
        return props.data;
    }

    // 1. Sorting
    let sorted = [...props.data];
    if (clientSortKey.value) {
        sorted.sort((a, b) => {
            const valA = a[clientSortKey.value];
            const valB = b[clientSortKey.value];

            if (valA === valB) return 0;

            // Null/Undefined 처리
            if (valA == null) return 1;
            if (valB == null) return -1;

            let result = 0;
            if (typeof valA === "number" && typeof valB === "number") {
                result = valA - valB;
            } else {
                result = String(valA).localeCompare(String(valB));
            }

            return clientSortOrder.value === "asc" ? result : -result;
        });
    }

    // 2. Pagination
    const start = (clientCurrentPage.value - 1) * props.itemsPerPage;
    const end = start + props.itemsPerPage;
    return sorted.slice(start, end);
});

// 전체 아이템 수
const displayTotalItems = computed(() => {
    return props.paginationMode === "server"
        ? props.totalItems
        : props.data.length;
});

// 전체 페이지 수 계산
const totalPages = computed(() => {
    const total = displayTotalItems.value;
    const perPage = props.itemsPerPage || 10; // 0 방지
    if (total <= 0) return 0;
    return Math.ceil(total / perPage);
});

// 정렬 토글
const toggleSort = (key: string) => {
    const column = props.columns.find((c) => c.key === key);
    if (column?.sortable === false) return;

    // Next Order Logic
    let newOrder: "asc" | "desc" = "asc";
    if (currentSortKey.value === key) {
        newOrder = currentSortOrder.value === "asc" ? "desc" : "asc";
    }

    if (props.paginationMode === "server") {
        emit("update:sort", {key, order: newOrder});
    } else {
        clientSortKey.value = key;
        clientSortOrder.value = newOrder;
    }
};

// 행 클릭
const handleRowClick = (item: T) => {
    emit("row-click", item);
};

// 확장 토글
const toggleExpand = (id: string | number) => {
    if (expandedRows.value.has(id)) {
        expandedRows.value.delete(id);
    } else {
        expandedRows.value.add(id);
    }
    expandedRows.value = new Set(expandedRows.value);
};

// 페이지 변경
const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        if (props.paginationMode === "server") {
            emit("update:currentPage", page);
        } else {
            clientCurrentPage.value = page;
        }
    }
};

// 페이지 당 개수 변경
const handleItemsPerPageChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const newVal = Number(target.value);
    emit("update:itemsPerPage", newVal); // 부모가 갱신해줘야 함 (양쪽 모드 모두)

    // 페이지 리셋
    if (props.paginationMode === "server") {
        emit("update:currentPage", 1);
    } else {
        clientCurrentPage.value = 1;
    }
};

// 컬럼 유틸
const getAlignClass = (align?: string) => {
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-left";
};
</script>

<template>
    <div class="space-y-4">
        <!-- Table Wrapper -->
        <div
            class="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow-sm"
        >
            <table class="w-full text-sm text-left border-collapse">
                <thead class="table-header">
                    <tr>
                        <!-- 확장 아이콘 헤더 (옵션) -->
                        <th v-if="expandable" class="px-4 py-3 w-10"></th>

                        <th
                            v-for="col in columns"
                            :key="col.key"
                            class="px-4 py-3 select-none transition-colors border-b border-gray-200"
                            :class="[
                                col.width,
                                getAlignClass(col.align),
                                col.class,
                                col.sortable !== false
                                    ? 'cursor-pointer hover:bg-gray-100/80 group'
                                    : '',
                            ]"
                            @click="toggleSort(col.key)"
                        >
                            <div
                                class="flex items-center gap-1"
                                :class="{
                                    'justify-center': col.align === 'center',
                                    'justify-end': col.align === 'right',
                                }"
                            >
                                <span
                                    class="font-semibold text-gray-600 uppercase tracking-wider text-xs"
                                    >{{ col.label }}</span
                                >
                                <SortIndicator
                                    v-if="col.sortable !== false"
                                    :active="currentSortKey === col.key"
                                    :order="currentSortOrder"
                                />
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 bg-white">
                    <template v-if="processedData.length > 0">
                        <template
                            v-for="(item, idx) in processedData"
                            :key="item[rowKey] || idx"
                        >
                            <!-- 메인 행 -->
                            <tr
                                class="table-row transition-all duration-200"
                                :class="[
                                    {'cursor-pointer': $attrs.onRowClick},
                                    rowClass ? rowClass(item) : '',
                                ]"
                                @click="handleRowClick(item)"
                            >
                                <!-- 확장 버튼 셀 -->
                                <td
                                    v-if="expandable"
                                    class="px-4 py-3 text-center cursor-pointer text-gray-400 hover:text-indigo-500 transition-colors"
                                    @click.stop="toggleExpand(item[rowKey])"
                                >
                                    <span
                                        class="material-icons-outlined text-base"
                                    >
                                        {{
                                            expandedRows.has(item[rowKey])
                                                ? "expand_more"
                                                : "chevron_right"
                                        }}
                                    </span>
                                </td>

                                <td
                                    v-for="col in columns"
                                    :key="col.key"
                                    class="px-4 py-3 align-middle text-gray-700 font-medium"
                                    :class="[
                                        getAlignClass(col.align),
                                        col.class,
                                    ]"
                                >
                                    <!-- 슬롯 지원: cell-[key] -->
                                    <slot
                                        :name="`cell-${col.key}`"
                                        :item="item"
                                        :value="item[col.key]"
                                    >
                                        <!-- 기본 렌더링 -->
                                        {{ item[col.key] }}
                                    </slot>
                                </td>
                            </tr>

                            <!-- 확장 된 상세 행 -->
                            <tr
                                v-if="
                                    expandable && expandedRows.has(item[rowKey])
                                "
                                class="bg-gray-50/50 shadow-inner"
                            >
                                <td
                                    :colspan="columns.length + 1"
                                    class="p-0 border-b border-gray-100"
                                >
                                    <div class="p-4 bg-gray-50/30">
                                        <slot
                                            name="expanded-row"
                                            :item="item"
                                        ></slot>
                                    </div>
                                </td>
                            </tr>
                        </template>
                    </template>
                    <template v-else-if="displayTotalItems === 0">
                        <tr>
                            <td
                                :colspan="columns.length + (expandable ? 1 : 0)"
                                class="px-4 py-12 text-center text-gray-500"
                            >
                                <slot name="empty">
                                    <div
                                        class="flex flex-col items-center justify-center gap-2"
                                    >
                                        <span
                                            class="material-icons-outlined text-4xl text-gray-300"
                                            >inbox</span
                                        >
                                        <p>데이터가 없습니다.</p>
                                    </div>
                                </slot>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>

        <!-- Pagination & RowsPerPage -->
        <div
            v-if="displayTotalItems > 0"
            class="flex flex-col sm:flex-row items-center justify-between gap-4 px-2"
        >
            <!-- Left: Rows Selector & Info -->
            <div class="flex items-center gap-4 text-xs text-gray-500">
                <div class="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <select
                        :value="props.itemsPerPage"
                        @change="handleItemsPerPageChange"
                        class="form-select border-gray-300 rounded-md text-xs py-1 pl-2 pr-7 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm cursor-pointer hover:border-gray-400 transition-colors"
                    >
                        <option
                            v-for="opt in rowsPerPageOptions"
                            :key="opt"
                            :value="opt"
                        >
                            {{ opt }}
                        </option>
                    </select>
                </div>

                <div class="hidden sm:block w-px h-4 bg-gray-300 mx-2"></div>

                <div>
                    <span> Total {{ displayTotalItems }} items </span>
                </div>
            </div>

            <!-- Right: Pagination -->
            <div v-if="totalPages > 1" class="flex items-center gap-1">
                <button
                    @click="setPage(currentPageValue - 1)"
                    :disabled="currentPageValue === 1"
                    class="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <span class="material-icons-outlined text-sm"
                        >chevron_left</span
                    >
                </button>

                <div class="flex items-center gap-1">
                    <template v-if="totalPages <= 7">
                        <button
                            v-for="page in totalPages"
                            :key="page"
                            @click="setPage(page)"
                            class="min-w-7 h-7 flex items-center justify-center text-xs rounded-md transition-all duration-200"
                            :class="
                                currentPageValue === page
                                    ? 'bg-indigo-600 text-white font-semibold shadow-sm scale-105'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
                            "
                        >
                            {{ page }}
                        </button>
                    </template>
                    <template v-else>
                        <!-- Simple Logic for many pages: First, Last, Current +/- 1 -->
                        <button
                            @click="setPage(1)"
                            class="min-w-7 h-7 text-xs rounded-md hover:bg-gray-100"
                            :class="
                                currentPageValue === 1
                                    ? 'bg-indigo-600 text-white'
                                    : ''
                            "
                        >
                            1
                        </button>
                        <span
                            v-if="currentPageValue > 3"
                            class="text-gray-400 text-xs px-1"
                            >...</span
                        >

                        <template
                            v-for="p in [
                                currentPageValue - 1,
                                currentPageValue,
                                currentPageValue + 1,
                            ]"
                        >
                            <button
                                v-if="p > 1 && p < totalPages"
                                :key="p"
                                @click="setPage(p)"
                                class="min-w-7 h-7 flex items-center justify-center text-xs rounded-md transition-all"
                                :class="
                                    currentPageValue === p
                                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                                        : 'hover:bg-gray-100'
                                "
                            >
                                {{ p }}
                            </button>
                        </template>

                        <span
                            v-if="currentPageValue < totalPages - 2"
                            class="text-gray-400 text-xs px-1"
                            >...</span
                        >
                        <button
                            @click="setPage(totalPages)"
                            class="min-w-7 h-7 text-xs rounded-md hover:bg-gray-100"
                            :class="
                                currentPageValue === totalPages
                                    ? 'bg-indigo-600 text-white'
                                    : ''
                            "
                        >
                            {{ totalPages }}
                        </button>
                    </template>
                </div>

                <button
                    @click="setPage(currentPageValue + 1)"
                    :disabled="currentPageValue === totalPages"
                    class="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <span class="material-icons-outlined text-sm"
                        >chevron_right</span
                    >
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 기존 스타일 재사용 가능 */
</style>
