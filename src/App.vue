<script setup>
import Sidebar from "./components/Sidebar.vue";
</script>

<template>
    <div class="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div class="flex-1">
            <RouterView />
        </div>
    </div>
</template>
