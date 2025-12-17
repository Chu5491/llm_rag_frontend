<script setup lang="ts">
import {ref, computed} from "vue";
import type {TestCase} from "../types/testcase.js";

const props = defineProps<{testCases?: TestCase[]; contexts?: any[]}>();

// 정렬 상태
const sortKey = ref<keyof TestCase | "testcase_id">("testcase_id");
const sortOrder = ref<"asc" | "desc">("asc");

// 펼쳐진 행
const expandedRows = ref(new Set<string | number>());

// 테스트케이스 존재 여부
const hasTestCases = computed(() => (props.testCases?.length ?? 0) > 0);
const hasContexts = computed(() => props.contexts && props.contexts.length > 0);

// 정렬된 테스트케이스
const sortedTestCases = computed(() => {
    const cases = [...(props.testCases || [])] as TestCase[];
    cases.sort((a, b) => {
        const aVal = a[sortKey.value] ?? "";
        const bVal = b[sortKey.value] ?? "";
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortOrder.value === "asc" ? cmp : -cmp;
    });
    return cases;
});

// 정렬 토글
const toggleSort = (key: keyof TestCase | "testcase_id") => {
    if (sortKey.value === key) {
        sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
    } else {
        sortKey.value = key;
        sortOrder.value = "asc";
    }
};

// 행 펼치기/접기
const toggleRow = (id: string | number) => {
    if (expandedRows.value.has(id)) {
        expandedRows.value.delete(id);
    } else {
        expandedRows.value.add(id);
    }
    // Set 자체를 새로 할당해서 반응성 트리거
    expandedRows.value = new Set(expandedRows.value);
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
</script>

<template>
  <table class="table-container">
    <thead class="table-header">
    <tr>
      <th class="w-10 table-header-cell table-expand-icon"></th>
      <th
          class="w-32 table-header-cell table-header-sortable"
          @click="toggleSort('testcase_id')"
      >
        ID
        <SortIndicator :active="sortKey === 'testcase_id'" :order="sortOrder" />
      </th>
      <th
          class="table-header-cell table-header-sortable"
          @click="toggleSort('title')"
      >
        제목
        <SortIndicator :active="sortKey === 'title'" :order="sortOrder" />
      </th>
      <th
          class="table-header-cell table-header-sortable"
          @click="toggleSort('module')"
      >
        기능
        <SortIndicator :active="sortKey === 'module'" :order="sortOrder" />
      </th>
      <th
          class="w-32 table-header-cell table-header-sortable"
          @click="toggleSort('priority')"
      >
        우선순위
        <SortIndicator :active="sortKey === 'priority'" :order="sortOrder" />
      </th>
      <th class="table-header-cell">예상 결과</th>
    </tr>
    </thead>

    <tbody class="table-body">
    <template v-for="tc in sortedTestCases" :key="tc.testcase_id">
      <!-- 메인 행 -->
      <tr
          class="table-row cursor-pointer"
          :class="{ 'bg-gray-50': expandedRows.has(tc.testcase_id) }"
          @click="toggleRow(tc.testcase_id)"
      >
        <td class="table-cell table-expand-icon">
          {{ expandedRows.has(tc.testcase_id) ? "▼" : "▶" }}
        </td>
        <td class="table-cell">
          <code class="text-xs font-mono text-indigo-600">
            {{ tc.testcase_id }}
          </code>
        </td>
        <td class="table-cell">{{ tc.title }}</td>
        <td class="table-cell">{{ tc.module }}</td>
        <td class="table-cell">
                        <span
                            class="priority-tag"
                            :class="{
                                'priority-high': tc.priority === 'High',
                                'priority-medium': tc.priority === 'Medium',
                                'priority-low': tc.priority === 'Low'
                            }"
                        >
                            {{ tc.priority }}
                        </span>
        </td>
        <td class="table-cell">{{ tc.expected_result }}</td>
      </tr>

      <!-- 펼쳐진 상세 행 -->
      <tr v-if="expandedRows.has(tc.testcase_id)">
        <td colspan="6" class="table-detail-container">
          <div class="table-detail-content">
            <section class="table-detail-section md:col-span-1">
              <h4 class="table-detail-title">사전 조건</h4>
              <p>{{ tc.preconditions || "-" }}</p>
            </section>

            <section class="table-detail-section md:col-span-2">
              <h4 class="table-detail-title">테스트 단계</h4>
              <ol class="table-steps-list">
                <li v-for="(step, idx) in tc.steps" :key="idx">
                  {{ step.replace(/^\d+\.\s*/, "") }}
                </li>
              </ol>
            </section>
          </div>
        </td>
      </tr>
    </template>
    </tbody>
  </table>
</template>
