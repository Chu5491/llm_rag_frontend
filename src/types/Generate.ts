// 생성 상태 Enum
export type GenerationStatus = "running" | "success" | "failed" | "cancelled";

// 생성 내역 항목
export interface GenerationItem {
    id: number;
    project_id: number;
    user_id?: number | null; // Added
    title: string;
    source_type: string;
    status: GenerationStatus;
    summary: string;
    total_batches: number;
    current_batch: number;
    progress: number;
    started_at: string;
    finished_at: string | null;
    duration: string;
    model_name: string;
}

// 생성 내역 상세 (logs 포함)
export interface HistoryDetailResponse extends GenerationItem {
    logs?: string;
    result_data?: any;
}

// 자동 생성 요청 Payload
export interface StartGenerationRequest {
    title: string;
    project_id: number;
    user_id?: number; // Added
    model: string;
    language: string;
    tcPrefix: string;
    artifact_ids?: number[];
    feature_ids?: number[];
    external_system_ids?: number[];
}
// 생성 시작 응답
export interface StartGenerationResponse {
    id: number;
    status: string;
    message?: string;
}
