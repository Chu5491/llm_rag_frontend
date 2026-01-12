<script setup>
import DefaultLayout from "./layouts/DefaultLayout.vue";
import BaseAlert from "./components/BaseAlert.vue";
</script>

<template>
    <DefaultLayout>
        <RouterView />
        <BaseAlert />
    </DefaultLayout>
</template>
