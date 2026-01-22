// 날짜 포맷팅 (YYYY. MM. DD. HH:mm)
export const formatDateTime = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    } catch (e) {
        console.error("Date formatting error:", e);
        return dateStr;
    }
};

// 날짜 (YYYY. MM. DD)
export const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(date);
    } catch (e) {
        return dateStr;
    }
};
