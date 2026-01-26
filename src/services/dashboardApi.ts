import {apiClient} from "./apiClient.js";
import type {AppConfigResponse} from "../types/config.js";
import type {DashboardStats} from "../types/dashboard.js";

/**
 * 대시보드 관련 API
 */
export const dashboardApi = {
    /**
     * 대시보드 통계 조회
     * @param projectId - (선택) 특정 프로젝트 ID. 없으면 전체 통계
     */
    getDashboardStats: async (projectId?: number): Promise<DashboardStats> => {
        return apiClient.get<DashboardStats>("/dashboard/stats", {
            params: projectId ? {project_id: projectId} : undefined,
        });
    },
};
