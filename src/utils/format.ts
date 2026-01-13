/**
 * 날짜 포맷팅 (YYYY. MM. DD. 오전/오후 HH:MM)
 * @param dateString ISO 날짜 문자열
 * @returns 포맷팅된 날짜 문자열
 */
export const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    };
    return new Date(dateString).toLocaleDateString("ko-KR", options);
};

/**
 * 파일 크기 포맷팅 (Bytes -> KB, MB, GB)
 * @param bytes 파일 크기 (바이트 단위)
 * @returns 포맷팅된 파일 크기 문자열
 */
export const formatFileSize = (bytes: number | undefined | null): string => {
    if (bytes === undefined || bytes === null) return "";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
