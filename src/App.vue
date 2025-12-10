<script setup>
import {ref} from "vue";
import Sidebar from "./components/Sidebar.vue";
</script>

<template>
    <div class="app-layout">
        <Sidebar />
        <main class="main-content">
            <router-view />
        </main>
    </div>
</template>

<style scoped>
.app-layout {
    display: flex;
    min-height: 100vh;
}

.main-content {
    flex: 1;
    padding: var(--space-xl);
    margin-left: 260px;
    background: var(--color-bg-primary);
}

@media (max-width: 768px) {
    .main-content {
        margin-left: 0;
        padding: var(--space-lg);
    }
}
</style>
