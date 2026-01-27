export interface TrendItem {
    date: string;
    count: number;
    label: string;
}

export interface StatusCountItem {
    label: string;
    count: number;
}

export interface ModelStatItem {
    model_name: string;
    usage_count: number;
    avg_duration: number;
    avg_generated_count: number;
}

export interface ProjectStatItem {
    project_id: number;
    name: string;
    service_type: string;
    artifact_stats: Record<string, number>;
    figma_status: string;
    figma_connected: boolean;
}

export interface DashboardStats {
    total_project_count: number;
    target_history_count: number;
    target_testcase_count: number;
    project_id: number | null;
    project_features?: string[]; // 프로젝트 주요 기능 키워드
    // 차트용 데이터 (Optional - 초기 로딩 시 없을 수 있음)
    tc_usability_trend?: TrendItem[];
    tc_generation_trend?: TrendItem[];
    tc_generation_status_counts?: StatusCountItem[];
    tc_usability_status_counts?: StatusCountItem[];
    tc_model_stats?: ModelStatItem[];
    projects_stats?: ProjectStatItem[];
}
