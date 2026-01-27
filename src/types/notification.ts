export interface NotificationBase {
    type: string; // "INFO" | "SUCCESS" | "ERROR" | "PROJECT_CREATE"
    title: string;
    message: string;
    link?: string | null;
}

export interface NotificationResponse extends NotificationBase {
    id: number;
    recipient_id: number;
    sender_id?: number | null;
    is_read: boolean;
    created_at: string; // ISO datetime string
}
