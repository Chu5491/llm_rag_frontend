<script setup lang="ts">
import {computed} from "vue";
import {useRoute} from "vue-router";
import DefaultLayout from "./layouts/DefaultLayout.vue";
import EmptyLayout from "./layouts/EmptyLayout.vue";
import BaseAlert from "./components/BaseAlert.vue";

const route = useRoute();
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
