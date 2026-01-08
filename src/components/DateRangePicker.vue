<script setup lang="ts">
import {ref, computed, onMounted, watch} from "vue";

const props = defineProps<{
    modelValue: {start: string; end: string};
}>();

const emit = defineEmits(["update:modelValue"]);

// 커스텀 모드(달력 표시) 여부
const isCustomMode = ref(false);

// 날짜 포맷 (YYYY-MM-DD)
const toDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

// 날짜 범위 Helpers
const getTodayRange = () => {
    const today = new Date();
    return {start: toDateString(today), end: toDateString(today)};
};

const getLast7DaysRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    return {start: toDateString(start), end: toDateString(end)};
};

const getLast30DaysRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    return {start: toDateString(start), end: toDateString(end)};
};

// 프리셋 클릭 핸들러
const selectPreset = (range: {start: string; end: string} | null) => {
    if (range) {
        emit("update:modelValue", range);
        isCustomMode.value = false;
    } else {
        // 전체(All)
        emit("update:modelValue", {start: "", end: ""});
        isCustomMode.value = false;
    }
};

// 현재 달력 기준 연/월
const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth());

// 요일 헤더
const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// 달력 데이터 생성
const calendarDays = computed(() => {
    const year = currentYear.value;
    const month = currentMonth.value;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
    const lastDateOfPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // 이전 달 날짜 채우기
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        days.push({
            date: new Date(year, month - 1, lastDateOfPrevMonth - i),
            isCurrentMonth: false,
        });
    }

    // 현재 달 날짜 채우기
    for (let i = 1; i <= lastDateOfMonth; i++) {
        days.push({
            date: new Date(year, month, i),
            isCurrentMonth: true,
        });
    }

    // 다음 달 날짜 채우기 (42칸 맞추기)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
        days.push({
            date: new Date(year, month + 1, i),
            isCurrentMonth: false,
        });
    }

    return days;
});

// 날짜 포맷 (Local function reused)
const formatDate = toDateString;

// 날짜 선택 핸들러
const handleDateClick = (date: Date) => {
    const dateStr = formatDate(date);
    const {start, end} = props.modelValue;

    if (!start || (start && end)) {
        // 시작일 선택 (새로운 범위 시작)
        emit("update:modelValue", {start: dateStr, end: ""});
    } else {
        // 종료일 선택
        if (new Date(dateStr) < new Date(start)) {
            // 종료일이 시작일보다 앞서면 순서 바꿈
            emit("update:modelValue", {start: dateStr, end: start});
        } else {
            emit("update:modelValue", {start, end: dateStr});
        }
    }
};

// 스타일 클래스 계산
const getDayClass = (day: {date: Date; isCurrentMonth: boolean}) => {
    const dateStr = formatDate(day.date);
    const {start, end} = props.modelValue;
    const isSelected = dateStr === start || dateStr === end;
    const isInRange = start && end && dateStr > start && dateStr < end;

    let classes =
        "w-8 h-8 flex items-center justify-center text-sm rounded-full transition-colors cursor-pointer ";

    if (!day.isCurrentMonth) {
        classes += "text-gray-300 ";
    } else {
        classes += "text-gray-700 hover:bg-gray-100 ";
    }

    if (isSelected) {
        classes +=
            "bg-indigo-600 text-white hover:bg-indigo-700 font-semibold ";
    } else if (isInRange) {
        classes += "bg-indigo-50 text-indigo-700 rounded-none ";
    }

    // 범위의 시작/끝 둥글게 처리 (선택적으로)
    if (start && end && dateStr === start) classes += " rounded-r-none";
    if (start && end && dateStr === end) classes += " rounded-l-none";

    return classes;
};

// 월 이동
const prevMonth = () => {
    if (currentMonth.value === 0) {
        currentMonth.value = 11;
        currentYear.value--;
    } else {
        currentMonth.value--;
    }
};

const nextMonth = () => {
    if (currentMonth.value === 11) {
        currentMonth.value = 0;
        currentYear.value++;
    } else {
        currentMonth.value++;
    }
};

// 현재 표시 중인 연월
const currentMonthLabel = computed(() => {
    return new Date(currentYear.value, currentMonth.value).toLocaleString(
        "default",
        {
            month: "long",
            year: "numeric",
        }
    );
});

// 마운트 시 커스텀 모드 감지
onMounted(() => {
    const {start, end} = props.modelValue;
    if (start && end) {
        const isToday =
            start === getTodayRange().start && end === getTodayRange().end;
        const is7Days =
            start === getLast7DaysRange().start &&
            end === getLast7DaysRange().end;
        const is30Days =
            start === getLast30DaysRange().start &&
            end === getLast30DaysRange().end;

        // 프리셋이 아니면 커스텀 모드 활성화
        if (!isToday && !is7Days && !is30Days) {
            isCustomMode.value = true;
        }
    }
});

// modelValue 변경 감지 (부모에서 리셋 시 커스텀 모드 해제)
watch(
    () => props.modelValue,
    (newValue) => {
        if (!newValue.start && !newValue.end) {
            isCustomMode.value = false;
        }
    },
    {deep: true}
);
</script>

<template>
    <div class="w-full">
        <!-- Presets -->
        <div class="grid grid-cols-5 gap-2 mb-2">
            <button
                @click="selectPreset(null)"
                class="py-1 text-xs border rounded transition-colors"
                :class="
                    !isCustomMode && !modelValue.start && !modelValue.end
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                "
            >
                전체
            </button>
            <button
                @click="selectPreset(getTodayRange())"
                class="py-1 text-xs border rounded transition-colors"
                :class="
                    !isCustomMode &&
                    modelValue.start === getTodayRange().start &&
                    modelValue.end === getTodayRange().end
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                "
            >
                오늘
            </button>
            <button
                @click="selectPreset(getLast7DaysRange())"
                class="py-1 text-xs border rounded transition-colors"
                :class="
                    !isCustomMode &&
                    modelValue.start === getLast7DaysRange().start &&
                    modelValue.end === getLast7DaysRange().end
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                "
            >
                7일
            </button>
            <button
                @click="selectPreset(getLast30DaysRange())"
                class="py-1 text-xs border rounded transition-colors"
                :class="
                    !isCustomMode &&
                    modelValue.start === getLast30DaysRange().start &&
                    modelValue.end === getLast30DaysRange().end
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                "
            >
                30일
            </button>
            <button
                @click="isCustomMode = true"
                class="py-1 text-xs border rounded transition-colors"
                :class="
                    isCustomMode
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                "
            >
                이외
            </button>
        </div>

        <!-- Calendar -->
        <div
            v-if="isCustomMode"
            class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm w-full max-w-xs"
        >
            <!-- Header -->
            <div class="flex items-center justify-between mb-4">
                <button
                    @click="prevMonth"
                    class="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                    <span class="material-icons-outlined text-lg"
                        >chevron_left</span
                    >
                </button>
                <span class="text-sm font-semibold text-gray-900">{{
                    currentMonthLabel
                }}</span>
                <button
                    @click="nextMonth"
                    class="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                    <span class="material-icons-outlined text-lg"
                        >chevron_right</span
                    >
                </button>
            </div>

            <!-- Calendar Grid -->
            <div class="grid grid-cols-7 gap-1 text-center">
                <!-- Week headers -->
                <div
                    v-for="day in daysOfWeek"
                    :key="day"
                    class="text-xs text-gray-400 font-medium py-1"
                >
                    {{ day }}
                </div>

                <!-- Days -->
                <button
                    v-for="(day, index) in calendarDays"
                    :key="index"
                    @click="handleDateClick(day.date)"
                    :class="getDayClass(day)"
                >
                    {{ day.date.getDate() }}
                </button>
            </div>

            <!-- Selection Info -->
            <div
                class="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500"
            >
                <span>{{ modelValue.start || "Start Date" }}</span>
                <span class="mx-1">-</span>
                <span>{{ modelValue.end || "End Date" }}</span>
            </div>
        </div>
    </div>
</template>
