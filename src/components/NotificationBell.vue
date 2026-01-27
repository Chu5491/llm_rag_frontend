<script setup lang="ts">
import {ref, onMounted, onUnmounted, watch} from "vue";
import {useRouter} from "vue-router";
import {useAuthStore} from "../stores/auth.js";
import {
    fetchMyNotifications,
    fetchUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
} from "../services/api.js";
import type {NotificationResponse} from "../types/notification.js";

const router = useRouter();
const authStore = useAuthStore();

// --- Notification State ---
const notifications = ref<NotificationResponse[]>([]);
const unreadCount = ref(0);
const showNotifications = ref(false);
const isLoadingNoti = ref(false);

const notiContainer = ref<HTMLElement | null>(null);
let pollInterval: ReturnType<typeof setInterval> | null = null;
const POLL_INTERVAL = 5000; // 5초

// --- Actions : Fetch & Control ---

const loadUnreadCount = async () => {
    if (!authStore.isAuthenticated) return;
    try {
        const count = await fetchUnreadCount();
        unreadCount.value = count;
    } catch (e) {
        console.error("Failed to load unread count", e);
    }
};

const loadNotifications = async (isBackground = false) => {
    if (!authStore.user?.id) return;

    if (!isBackground) isLoadingNoti.value = true;
    try {
        // 읽지 않은 알림 우선, 최근 순
        const data = await fetchMyNotifications(authStore.user.id, 0, 20);
        notifications.value = data;
    } catch (e) {
        console.error("Failed to load notifications", e);
    } finally {
        if (!isBackground) isLoadingNoti.value = false;
    }
};

const toggleNotifications = () => {
    showNotifications.value = !showNotifications.value;
    if (showNotifications.value) {
        loadNotifications();
        loadUnreadCount(); // Refresh count as well
    }
};

const handleClickOutside = (event: MouseEvent) => {
    if (
        notiContainer.value &&
        !notiContainer.value.contains(event.target as Node)
    ) {
        showNotifications.value = false;
    }
};

// --- Actions : User Interaction ---

const handleMarkRead = async (noti: NotificationResponse) => {
    if (noti.is_read) {
        if (noti.link) router.push(noti.link);
        return;
    }

    try {
        await markNotificationRead(noti.id);
        noti.is_read = true;
        if (unreadCount.value > 0) unreadCount.value--;
        if (noti.link) router.push(noti.link);
    } catch (e) {
        console.error("Failed to mark as read", e);
    }
};

const handleMarkAllRead = async () => {
    try {
        await markAllNotificationsRead();
        notifications.value.forEach((n) => (n.is_read = true));
        unreadCount.value = 0;
    } catch (e) {
        console.error("Failed to mark all as read", e);
    }
};

const handleDelete = async (noti: NotificationResponse, event: Event) => {
    event.stopPropagation(); // 부모 클릭 방지

    // 1. UI 즉시 반영 (Optimistic Update)
    notifications.value = notifications.value.filter((n) => n.id !== noti.id);
    const wasUnread = !noti.is_read;
    if (wasUnread && unreadCount.value > 0) {
        unreadCount.value--;
    }

    try {
        await deleteNotification(noti.id, authStore.user!);
    } catch (e) {
        console.error("Failed to delete notification", e);
        // 실패 시 롤백은 생략 (대부분 성공 가정)
    }
};

// --- Polling Logic ---

const startPolling = () => {
    stopPolling(); // 중복 방지
    loadUnreadCount(); // 즉시 실행

    pollInterval = setInterval(() => {
        if (authStore.isAuthenticated) {
            loadUnreadCount();
            if (showNotifications.value) {
                loadNotifications(true);
            }
        }
    }, POLL_INTERVAL);
};

const stopPolling = () => {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
};

// 인증 상태 감지하여 폴링 시작/중지
watch(
    () => authStore.isAuthenticated,
    (newValue) => {
        if (newValue) {
            startPolling();
        } else {
            stopPolling();
            unreadCount.value = 0;
            notifications.value = [];
        }
    },
    {immediate: true}
);

// --- Utilities ---
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60 * 1000) return "방금 전";
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}분 전`;
    if (diff < 24 * 60 * 60 * 1000)
        return `${Math.floor(diff / (60 * 60 * 1000))}시간 전`;
    return date.toLocaleDateString();
};

const getNotiIcon = (type: string) => {
    switch (type) {
        case "SUCCESS":
            return "check_circle";
        case "ERROR":
            return "error";
        case "PROJECT_CREATE":
            return "folder_special";
        default:
            return "info";
    }
};

const getNotiColor = (type: string) => {
    switch (type) {
        case "SUCCESS":
            return "text-green-500 bg-green-50";
        case "ERROR":
            return "text-red-500 bg-red-50";
        case "PROJECT_CREATE":
            return "text-indigo-500 bg-indigo-50";
        default:
            return "text-blue-500 bg-blue-50";
    }
};

// --- Lifecycle ---
onMounted(() => {
    document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
    stopPolling();
    document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
    <div class="relative text-left" ref="notiContainer">
        <!-- Notification Button -->
        <button
            @click="toggleNotifications"
            class="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors relative focus:outline-none"
        >
            <span class="sr-only">View notifications</span>
            <span class="material-symbols-outlined text-xl"
                >notifications_none</span
            >
            <!-- Badge -->
            <span
                v-if="unreadCount > 0"
                class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white"
            >
                {{ unreadCount > 99 ? "99+" : unreadCount }}
            </span>
        </button>

        <!-- Notification Dropdown -->
        <transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
        >
            <div
                v-if="showNotifications"
                class="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-100 ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden origin-top-right z-50"
            >
                <!-- Header -->
                <div
                    class="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50"
                >
                    <h3 class="text-sm font-semibold text-gray-900">알림</h3>
                    <button
                        v-if="unreadCount > 0"
                        @click="handleMarkAllRead"
                        class="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        모두 읽음
                    </button>
                </div>

                <!-- List -->
                <div class="max-h-96 overflow-y-auto">
                    <!-- Loading Spinner -->
                    <div
                        v-if="isLoadingNoti"
                        class="flex justify-center items-center py-8"
                    >
                        <div
                            class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"
                        ></div>
                    </div>

                    <!-- Notification Items -->
                    <div v-else-if="notifications.length > 0">
                        <div
                            v-for="noti in notifications"
                            :key="noti.id"
                            @click="handleMarkRead(noti)"
                            class="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors relative group"
                            :class="{
                                'bg-white': noti.is_read,
                                'bg-indigo-50/30': !noti.is_read,
                            }"
                        >
                            <div class="flex gap-3">
                                <div
                                    class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1"
                                    :class="getNotiColor(noti.type)"
                                >
                                    <span
                                        class="material-symbols-outlined text-lg"
                                    >
                                        {{ getNotiIcon(noti.type) }}
                                    </span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div
                                        class="flex justify-between items-start"
                                    >
                                        <p
                                            class="text-sm font-medium text-gray-900 truncate pr-2"
                                        >
                                            {{ noti.title }}
                                        </p>
                                        <span
                                            class="text-[10px] text-gray-400 whitespace-nowrap transition-opacity duration-200 group-hover:opacity-0"
                                        >
                                            {{ formatDate(noti.created_at) }}
                                        </span>
                                    </div>
                                    <p
                                        class="text-sm text-gray-600 mt-0.5 wrap-break-word line-clamp-2"
                                    >
                                        {{ noti.message }}
                                    </p>
                                </div>
                                <div
                                    v-if="!noti.is_read"
                                    class="shrink-0 self-center transition-opacity duration-200 group-hover:opacity-0"
                                >
                                    <div
                                        class="w-1.5 h-1.5 rounded-full bg-indigo-500"
                                    ></div>
                                </div>

                                <!-- 삭제 버튼 (Hover 시 표시) -->
                                <button
                                    class="absolute right-2 top-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    @click="(e: Event) => handleDelete(noti, e)"
                                    title="삭제"
                                >
                                    <span
                                        class="material-symbols-outlined text-base"
                                        >close</span
                                    >
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div v-else class="py-10 text-center text-gray-500">
                        <span
                            class="material-symbols-outlined text-4xl text-gray-300 mb-2"
                            >notifications_off</span
                        >
                        <p class="text-sm">새로운 알림이 없습니다.</p>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>
