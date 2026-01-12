<script setup lang="ts">
defineProps<{
    message?: string;
}>();
</script>

<template>
    <div class="loading-container">
        <div class="loading-spinner"></div>
        <p v-if="message" class="loading-text">
            {{ message }}
        </p>
    </div>
</template>
