<script setup lang="ts">
defineProps<{
    active: boolean;
    order: "asc" | "desc";
}>();
</script>

<template>
    <span class="inline-flex flex-col ml-1 h-4 w-2.5 align-middle relative">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-2.5 w-2.5 absolute -top-0.5"
            :class="
                active && order === 'asc' ? 'text-indigo-600' : 'text-gray-300'
            "
            fill="currentColor"
            viewBox="0 0 20 20"
        >
            <path
                fill-rule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clip-rule="evenodd"
            />
        </svg>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-2.5 w-2.5 absolute -bottom-0.5"
            :class="
                active && order === 'desc' ? 'text-indigo-600' : 'text-gray-300'
            "
            fill="currentColor"
            viewBox="0 0 20 20"
        >
            <path
                fill-rule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clip-rule="evenodd"
            />
        </svg>
    </span>
</template>
