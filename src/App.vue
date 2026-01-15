<script setup lang="ts">
import {computed, onMounted} from "vue";
import {useRoute} from "vue-router";
import {useAuthStore} from "./stores/auth.js";
import DefaultLayout from "./layouts/DefaultLayout.vue";
import EmptyLayout from "./layouts/EmptyLayout.vue";
import BaseAlert from "./components/BaseAlert.vue";

const route = useRoute();
const authStore = useAuthStore();

// 앱 초기화 시 로그인 상태 복구
onMounted(() => {
    authStore.initialize();
});
const layout = computed(() => {
    return route.meta.layout === "empty" ? EmptyLayout : DefaultLayout;
});
</script>

<template>
    <component :is="layout">
        <RouterView />
        <BaseAlert />
    </component>
</template>
