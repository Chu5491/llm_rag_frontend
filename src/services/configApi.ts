import type {AppConfigResponse} from "../types/config.js";

// 전역 환경설정 조회
export async function getAppConfig(): Promise<AppConfigResponse> {
    const res = await fetch("/api/v1/config/");
    if (!res.ok) {
        throw new Error("환경설정 정보를 불러오는 데 실패했습니다.");
    }
    return res.json();
}

// 전역 환경설정 업데이트
export async function updateAppConfig(
    config: Partial<AppConfigResponse>
): Promise<AppConfigResponse> {
    const res = await fetch("/api/v1/config/", {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(config),
    });
    if (!res.ok) {
        throw new Error("환경설정 저장에 실패했습니다.");
    }
    return res.json();
}
