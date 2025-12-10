<script setup>
import {ref, computed} from "vue";

const props = defineProps({
    testCases: {
        type: Array,
        default: () => [],
    },
});

// 정렬 상태
const sortKey = ref("testcase_id");
const sortOrder = ref("asc");

// 펼쳐진 행
const expandedRows = ref(new Set());

// 정렬된 테스트케이스
const sortedTestCases = computed(() => {
    const cases = [...props.testCases];
    cases.sort((a, b) => {
        const aVal = a[sortKey.value] || "";
        const bVal = b[sortKey.value] || "";
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortOrder.value === "asc" ? cmp : -cmp;
    });
    return cases;
});

// 정렬 토글
const toggleSort = (key) => {
    if (sortKey.value === key) {
        sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
    } else {
        sortKey.value = key;
        sortOrder.value = "asc";
    }
};

// 행 펼치기/접기
const toggleRow = (id) => {
    if (expandedRows.value.has(id)) {
        expandedRows.value.delete(id);
    } else {
        expandedRows.value.add(id);
    }
    expandedRows.value = new Set(expandedRows.value); // 반응성 트리거
};

// JSON 복사
const copyAsJson = async () => {
    try {
        await navigator.clipboard.writeText(
            JSON.stringify(props.testCases, null, 2)
        );
        alert("JSON이 클립보드에 복사되었습니다!");
    } catch {
        alert("복사 실패");
    }
};

// Priority 뱃지 클래스
const getPriorityClass = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p === "high") return "badge-high";
    if (p === "medium") return "badge-medium";
    return "badge-low";
};
</script>

<template>
    <div class="testcase-table-wrapper">
        <div class="table-header">
            <h2 class="table-title">테스트케이스 목록</h2>
            <div class="table-actions">
                <button class="btn btn-secondary" @click="copyAsJson">
                    📋 JSON 복사
                </button>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th class="col-expand"></th>
                        <th class="col-id" @click="toggleSort('testcase_id')">
                            ID
                            <span
                                v-if="sortKey === 'testcase_id'"
                                class="sort-icon"
                            >
                                {{ sortOrder === "asc" ? "↑" : "↓" }}
                            </span>
                        </th>
                        <th class="col-title" @click="toggleSort('title')">
                            제목
                            <span v-if="sortKey === 'title'" class="sort-icon">
                                {{ sortOrder === "asc" ? "↑" : "↓" }}
                            </span>
                        </th>
                        <th
                            class="col-priority"
                            @click="toggleSort('priority')"
                        >
                            우선순위
                            <span
                                v-if="sortKey === 'priority'"
                                class="sort-icon"
                            >
                                {{ sortOrder === "asc" ? "↑" : "↓" }}
                            </span>
                        </th>
                        <th class="col-result">예상 결과</th>
                    </tr>
                </thead>
                <tbody>
                    <template
                        v-for="tc in sortedTestCases"
                        :key="tc.testcase_id"
                    >
                        <tr
                            :class="{
                                expanded: expandedRows.has(tc.testcase_id),
                            }"
                            @click="toggleRow(tc.testcase_id)"
                        >
                            <td class="col-expand">
                                <span class="expand-icon">
                                    {{
                                        expandedRows.has(tc.testcase_id)
                                            ? "▼"
                                            : "▶"
                                    }}
                                </span>
                            </td>
                            <td class="col-id">
                                <code>{{ tc.testcase_id }}</code>
                            </td>
                            <td class="col-title">{{ tc.title }}</td>
                            <td class="col-priority">
                                <span
                                    :class="[
                                        'badge',
                                        getPriorityClass(tc.priority),
                                    ]"
                                >
                                    {{ tc.priority }}
                                </span>
                            </td>
                            <td class="col-result">{{ tc.expected_result }}</td>
                        </tr>

                        <!-- 확장 행 -->
                        <tr
                            v-if="expandedRows.has(tc.testcase_id)"
                            class="expanded-row"
                        >
                            <td colspan="5">
                                <div class="expanded-content">
                                    <div class="detail-section">
                                        <h4 class="detail-label">사전 조건</h4>
                                        <p class="detail-value">
                                            {{ tc.preconditions || "-" }}
                                        </p>
                                    </div>
                                    <div class="detail-section">
                                        <h4 class="detail-label">
                                            테스트 단계
                                        </h4>
                                        <ol class="steps-list">
                                            <li
                                                v-for="(step, idx) in tc.steps"
                                                :key="idx"
                                            >
                                                {{
                                                    step.replace(
                                                        /^\d+\.\s*/,
                                                        ""
                                                    )
                                                }}
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
.testcase-table-wrapper {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
}

.table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-lg);
    border-bottom: 1px solid var(--color-border);
}

.table-title {
    font-size: 1.125rem;
    font-weight: 600;
}

.table-actions {
    display: flex;
    gap: var(--space-sm);
}

.table-container {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th {
    position: sticky;
    top: 0;
    background: var(--color-bg-tertiary);
    cursor: pointer;
    user-select: none;
}

th:hover {
    background: var(--color-bg-hover);
}

.col-expand {
    width: 40px;
    text-align: center;
}

.col-id {
    width: 120px;
}

.col-title {
    min-width: 200px;
}

.col-priority {
    width: 100px;
}

.col-result {
    min-width: 200px;
}

.sort-icon {
    margin-left: var(--space-xs);
    color: var(--color-accent-primary);
}

tbody tr {
    cursor: pointer;
    transition: background var(--transition-fast);
}

tbody tr:hover {
    background: var(--color-bg-hover);
}

tbody tr.expanded {
    background: rgba(99, 102, 241, 0.05);
}

.expand-icon {
    font-size: 0.625rem;
    color: var(--color-text-muted);
}

code {
    font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
    font-size: 0.8125rem;
    color: var(--color-accent-primary);
}

.expanded-row {
    background: var(--color-bg-tertiary) !important;
}

.expanded-row:hover {
    background: var(--color-bg-tertiary) !important;
}

.expanded-content {
    padding: var(--space-lg);
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: var(--space-xl);
}

.detail-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.detail-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
}

.detail-value {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
}

.steps-list {
    margin: 0;
    padding-left: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
}

.steps-list li {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
}

@media (max-width: 768px) {
    .expanded-content {
        grid-template-columns: 1fr;
    }
}
</style>
