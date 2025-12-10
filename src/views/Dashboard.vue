<script setup>
import {ref, computed} from "vue";
import TestCaseTable from "../components/TestCaseTable.vue";

// 소스 타입
const sourceType = ref("file"); // 'file' | 'figma'

// 테스트케이스 결과
const testCases = ref([]);
const isLoading = ref(false);
const error = ref(null);

// 컨텍스트 정보
const contexts = ref([]);

// 테스트케이스 생성
const handleGenerate = async () => {
    isLoading.value = true;
    error.value = null;
    testCases.value = [];

    const endpoint =
        sourceType.value === "file"
            ? "/api/v1/rag/generate/file"
            : "/api/v1/rag/generate/figma";

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({model: "exaone3.5:2.4b"}),
        });

        if (!res.ok) throw new Error("테스트케이스 생성 실패");

        const data = await res.json();
        parseResponse(data);
    } catch (e) {
        error.value = e.message;
    } finally {
        isLoading.value = false;
    }
};

// 응답 파싱
const parseResponse = (data) => {
    contexts.value = data.contexts || [];

    try {
        const parsed = JSON.parse(data.answer);
        if (Array.isArray(parsed)) {
            testCases.value = parsed;
        } else {
            testCases.value = [];
        }
    } catch {
        testCases.value = [];
        error.value = "JSON 파싱 실패: " + data.answer?.substring(0, 100);
    }
};

// 통계
const stats = computed(() => ({
    total: testCases.value.length,
    high: testCases.value.filter((tc) => tc.priority === "High").length,
    medium: testCases.value.filter((tc) => tc.priority === "Medium").length,
    low: testCases.value.filter((tc) => tc.priority === "Low").length,
}));
</script>

<template>
    <div class="dashboard">
        <header class="dashboard-header">
            <h1 class="page-title">QA 테스트케이스 생성</h1>
            <p class="page-subtitle">
                PDF 문서 또는 Figma 디자인을 기반으로 테스트케이스를 자동
                생성합니다.
            </p>
        </header>

        <!-- 소스 선택 + 생성 버튼 -->
        <div class="generate-section card">
            <div class="source-selector">
                <label class="source-option">
                    <input type="radio" v-model="sourceType" value="file" />
                    <span class="source-label">📄 File</span>
                </label>
                <label class="source-option">
                    <input type="radio" v-model="sourceType" value="figma" />
                    <span class="source-label">🎨 Figma</span>
                </label>
            </div>

            <button
                class="btn btn-primary generate-btn"
                :disabled="isLoading"
                @click="handleGenerate"
            >
                <span v-if="isLoading" class="spinner"></span>
                <span v-else>🚀</span>
                {{ isLoading ? "생성 중..." : "테스트케이스 생성" }}
            </button>
        </div>

        <!-- Error -->
        <div v-if="error" class="error-message">
            <span>⚠️</span>
            {{ error }}
        </div>

        <!-- Stats -->
        <div v-if="testCases.length > 0" class="stats-grid">
            <div class="stat-card">
                <span class="stat-value">{{ stats.total }}</span>
                <span class="stat-label">전체</span>
            </div>
            <div class="stat-card high">
                <span class="stat-value">{{ stats.high }}</span>
                <span class="stat-label">High</span>
            </div>
            <div class="stat-card medium">
                <span class="stat-value">{{ stats.medium }}</span>
                <span class="stat-label">Medium</span>
            </div>
            <div class="stat-card low">
                <span class="stat-value">{{ stats.low }}</span>
                <span class="stat-label">Low</span>
            </div>
        </div>

        <!-- Test Case Table -->
        <TestCaseTable v-if="testCases.length > 0" :testCases="testCases" />

        <!-- Contexts (접기/펴기) -->
        <details v-if="contexts.length > 0" class="contexts-section">
            <summary class="contexts-summary">
                📚 사용된 컨텍스트 ({{ contexts.length }}개)
            </summary>
            <div class="contexts-list">
                <div
                    v-for="(ctx, idx) in contexts"
                    :key="idx"
                    class="context-item"
                >
                    <div class="context-header">
                        <span class="context-index">#{{ idx + 1 }}</span>
                        <span class="context-source">{{
                            ctx.meta?.source || "unknown"
                        }}</span>
                    </div>
                    <pre class="context-text">{{ ctx.text }}</pre>
                </div>
            </div>
        </details>
    </div>
</template>

<style scoped>
.dashboard {
    max-width: 1200px;
}

.dashboard-header {
    margin-bottom: var(--space-xl);
}

.page-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: var(--space-sm);
    background: var(--color-accent-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.page-subtitle {
    color: var(--color-text-secondary);
    font-size: 0.9375rem;
}

/* Generate Section */
.generate-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-lg);
    margin-bottom: var(--space-xl);
}

.source-selector {
    display: flex;
    gap: var(--space-lg);
}

.source-option {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    cursor: pointer;
}

.source-option input[type="radio"] {
    width: 18px;
    height: 18px;
    accent-color: var(--color-accent-primary);
}

.source-label {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-text-primary);
}

.generate-btn {
    padding: var(--space-md) var(--space-xl);
    color: #1a1a1a !important;
}

/* Error */
.error-message {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: rgba(255, 143, 171, 0.1);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    color: var(--color-error);
    margin-bottom: var(--space-lg);
}

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
}

.stat-card {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    text-align: center;
    box-shadow: var(--shadow-sm);
}

.stat-value {
    display: block;
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: var(--space-xs);
    color: var(--color-text-primary);
}

.stat-label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.stat-card.high .stat-value {
    color: var(--color-error);
}
.stat-card.medium .stat-value {
    color: var(--color-warning);
}
.stat-card.low .stat-value {
    color: var(--color-success);
}

/* Contexts */
.contexts-section {
    margin-top: var(--space-xl);
}

.contexts-summary {
    padding: var(--space-md);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
}

.contexts-list {
    margin-top: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.context-item {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
}

.context-header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg-tertiary);
    border-bottom: 1px solid var(--color-border);
}

.context-index {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-accent-primary);
}

.context-source {
    font-size: 0.75rem;
    color: var(--color-text-muted);
}

.context-text {
    padding: var(--space-md);
    font-size: 0.8125rem;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
    color: var(--color-text-secondary);
}

@media (max-width: 768px) {
    .generate-section {
        flex-direction: column;
        align-items: stretch;
    }

    .generate-btn {
        width: 100%;
    }

    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>
