<script setup>
import {ref, onMounted, onUnmounted} from "vue";
import {RouterLink, useRoute} from "vue-router";

const route = useRoute();

const navItems = [{path: "/", name: "Dashboard", icon: "📊"}];

const isActive = (path) => route.path === path;

// API 상태
const apiStatus = ref("checking"); // 'online' | 'offline' | 'checking'
let statusInterval = null;

const checkApiStatus = async () => {
    try {
        const res = await fetch("/api/v1/ollama/status");
        apiStatus.value = res.ok ? "online" : "offline";
    } catch {
        apiStatus.value = "offline";
    }
};

onMounted(() => {
    checkApiStatus();
    // 30초마다 상태 체크
    statusInterval = setInterval(checkApiStatus, 30000);
});

onUnmounted(() => {
    if (statusInterval) {
        clearInterval(statusInterval);
    }
});
</script>

<template>
    <aside class="sidebar">
        <div class="sidebar-header">
            <div class="logo">
                <span class="logo-icon">🧪</span>
                <span class="logo-text">LLM RAG QA</span>
            </div>
        </div>

        <nav class="sidebar-nav">
            <RouterLink
                v-for="item in navItems"
                :key="item.path"
                :to="item.path"
                :class="['nav-item', {active: isActive(item.path)}]"
            >
                <span class="nav-icon">{{ item.icon }}</span>
                <span class="nav-label">{{ item.name }}</span>
            </RouterLink>
        </nav>

        <div class="sidebar-footer">
            <div class="status-indicator" @click="checkApiStatus">
                <span
                    v-if="apiStatus === 'checking'"
                    class="spinner-small"
                ></span>
                <span v-else :class="['status-dot', apiStatus]"></span>
                <span class="status-text">
                    {{
                        apiStatus === "online"
                            ? "API Connected"
                            : apiStatus === "offline"
                            ? "API Disconnected"
                            : "Checking..."
                    }}
                </span>
            </div>
        </div>
    </aside>
</template>

<style scoped>
.sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 260px;
    background: linear-gradient(180deg, #fff5f7 0%, #fffbf0 100%);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    z-index: 100;
}

.sidebar-header {
    padding: var(--space-xl);
    border-bottom: 1px solid var(--color-border);
}

.logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.logo-icon {
    font-size: 1.5rem;
}

.logo-text {
    font-size: 1.125rem;
    font-weight: 700;
    background: #ef4444;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.sidebar-nav {
    flex: 1;
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
}

.nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
}

.nav-item:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
}

.nav-item.active {
    background: linear-gradient(135deg, rgba(255, 209, 102, 0.2) 100%);
    color: var(--color-accent-primary);
}

.nav-icon {
    font-size: 1.125rem;
}

.nav-label {
    font-size: 0.875rem;
    font-weight: 500;
}

.sidebar-footer {
    padding: var(--space-lg);
    border-top: 1px solid var(--color-border);
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    cursor: pointer;
    padding: var(--space-sm);
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast);
}

.status-indicator:hover {
    background: var(--color-bg-hover);
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-text-muted);
}

.status-dot.online {
    background: #22c55e;
    box-shadow: 0 0 8px #22c55e;
}

.status-dot.offline {
    background: #ef4444;
    box-shadow: 0 0 8px #ef4444;
}

.spinner-small {
    width: 8px;
    height: 8px;
    border: 1.5px solid var(--color-border);
    border-top-color: var(--color-accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.status-text {
    font-size: 0.75rem;
    color: var(--color-text-muted);
}
</style>
