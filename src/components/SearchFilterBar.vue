<script setup lang="ts">
import {ref} from "vue";
import type {ProjectResponse} from "../types/project.js";

// Props 정의
const props = defineProps<{
    searchQuery: string;
    searchPlaceholder?: string;
    projects: ProjectResponse[];
    selectedProjectId: number | string | null;
    isFilterActive?: boolean;
}>();

// Emits 정의
const emit = defineEmits<{
    (e: "update:searchQuery", value: string): void;
    (e: "update:selectedProjectId", value: number | string | null): void;
    (e: "reset"): void;
}>();

// 필터 팝업 상태
const isFilterOpen = ref(false);
</script>

<template>
    <div class="filter-bar-container">
        <!-- 1. 검색창 -->
        <div class="search-input-wrapper">
            <span class="search-icon">
                <span class="material-icons-outlined">search</span>
            </span>
            <input
                :value="searchQuery"
                @input="
                    emit(
                        'update:searchQuery',
                        ($event.target as HTMLInputElement).value
                    )
                "
                type="text"
                :placeholder="searchPlaceholder || 'Search...'"
                class="search-input"
            />
        </div>

        <!-- 2. 프로젝트 필터 (Optional Slot or Built-in) -->
        <div
            v-if="projects"
            class="project-select-wrapper flex items-center gap-2"
        >
            <select
                :value="selectedProjectId ?? ''"
                @change="
                    (() => {
                        const val = ($event.target as HTMLSelectElement).value;
                        emit(
                            'update:selectedProjectId',
                            val === 'all' ? 'all' : val === '' ? null : Number(val)
                        );
                    })()
                "
                class="project-select"
            >
                <slot name="project-options">
                    <option v-for="p in projects" :key="p.id" :value="p.id">
                        {{ p.name }}
                    </option>
                </slot>
            </select>

            <!-- History Slot (New) -->
            <slot name="history-selector"></slot>
        </div>

        <div v-if="projects" class="filter-divider"></div>

        <!-- 3. 필터 버튼 & 팝업 -->
        <div class="filter-button-wrapper">
            <button
                @click="isFilterOpen = !isFilterOpen"
                class="filter-button"
                :class="{'filter-button-active': isFilterOpen}"
            >
                <span class="material-icons-outlined text-gray-500"
                    >filter_list</span
                >
                <span class="text-sm font-medium">필터</span>
                <span
                    v-if="isFilterActive"
                    class="flex h-2 w-2 rounded-full bg-indigo-500"
                ></span>
            </button>

            <!-- 필터 팝업 -->
            <div v-if="isFilterOpen" class="filter-popup">
                <div class="filter-popup-header">
                    <h3 class="font-medium text-gray-900">Filters</h3>
                    <button @click="emit('reset')" class="filter-reset-btn">
                        Reset
                    </button>
                </div>

                <!-- 상세 필터 컨텐츠 (Slot) -->
                <div class="filter-content-area">
                    <slot name="filters"></slot>
                </div>
            </div>
        </div>

        <!-- 필터 팝업 외부 클릭 시 닫기 처리를 위한 투명 배경 (Optional) -->
        <div
            v-if="isFilterOpen"
            class="filter-overlay"
            @click="isFilterOpen = false"
        ></div>
    </div>
</template>
