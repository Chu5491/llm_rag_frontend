import {apiClient} from "./apiClient.js";
import type {NotificationResponse} from "../types/notification.js";
import {User} from "../types/user.js";

// 내 알림 목록 조회
export async function fetchMyNotifications(
    userId: number,
    skip = 0,
    limit = 50
): Promise<NotificationResponse[]> {
    const params = {user_id: userId, skip, limit};
    return apiClient.get<NotificationResponse[]>("/notifications", {params});
}

// 안 읽은 알림 개수 조회
export async function fetchUnreadCount(): Promise<number> {
    return apiClient.get<number>("/notifications/unread-count", {
        params: {polling: true},
    });
}

// 알림 단건 읽음 처리
export async function markNotificationRead(
    notificationId: number
): Promise<NotificationResponse> {
    return apiClient.post<NotificationResponse>(
        `/notifications/${notificationId}/read`
    );
}

// 알림 삭제
export async function deleteNotification(
    notificationId: number,
    current_user: User
): Promise<void> {
    return apiClient.delete<void>(`/notifications/${notificationId}`);
}

// 내 알림 전체 읽음 처리
export async function markAllNotificationsRead(): Promise<{
    message: string;
    updated_count: number;
}> {
    return apiClient.post<{message: string; updated_count: number}>(
        "/notifications/read-all"
    );
}
