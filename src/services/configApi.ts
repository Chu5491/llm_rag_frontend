import { apiClient } from "./apiClient.js";
import type {AppConfigResponse} from "../types/config.js";

// 전역 환경설정 조회
export async function getAppConfig(): Promise<AppConfigResponse> {
    return apiClient.get<AppConfigResponse>("/config/");
}

// 전역 환경설정 업데이트
export async function updateAppConfig(
    config: Partial<AppConfigResponse>
): Promise<AppConfigResponse> {
    return apiClient.patch<AppConfigResponse>("/config/", config);
}
