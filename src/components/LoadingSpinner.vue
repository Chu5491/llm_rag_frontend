<script setup lang="ts">
defineProps<{
    message?: string;
    reverse?: boolean;
}>();
</script>

<template>
    <div class="loading-container">
        <div
            :class="reverse ? 'loading-spinner-reverse' : 'loading-spinner'"
        ></div>
        <p v-if="message" class="loading-text">
            {{ message }}
        </p>
    </div>
</template>
