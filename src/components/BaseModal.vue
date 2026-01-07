<script setup lang="ts">
defineProps<{
    isOpen: boolean;
    title?: string;
    subTitle?: string;
    maxWidth?: string;
}>();

const emit = defineEmits(["close"]);
</script>

<template>
    <Teleport to="body">
        <div
            v-if="isOpen"
            class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            <!-- Backdrop -->
            <div
                class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                @click="emit('close')"
            ></div>

            <!-- Modal Content -->
            <div
                class="relative w-full flex flex-col rounded-xl bg-white shadow-2xl overflow-hidden max-h-[85vh]"
                :class="maxWidth || 'max-w-2xl'"
            >
                <!-- Header -->
                <div
                    class="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0"
                >
                    <div>
                        <h3 class="text-lg font-bold text-gray-900">
                            {{ title }}
                        </h3>
                        <p v-if="subTitle" class="text-xs text-gray-500 mt-0.5">
                            {{ subTitle }}
                        </p>
                    </div>
                    <button
                        @click="emit('close')"
                        class="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                        <span class="material-icons-outlined text-xl"
                            >close</span
                        >
                    </button>
                </div>

                <!-- Body (Scrollable) -->
                <div class="flex-1 overflow-y-auto p-6 bg-white">
                    <slot></slot>
                </div>

                <!-- Footer (Optional) -->
                <div
                    v-if="$slots.footer"
                    class="border-t border-gray-100 p-4 bg-gray-50/50 shrink-0"
                >
                    <slot name="footer"></slot>
                </div>
            </div>
        </div>
    </Teleport>
</template>
