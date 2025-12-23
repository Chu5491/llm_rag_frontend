export type GenerationStatus = "running" | "success" | "failed" | "cancelled";

export interface GenerationItem {
    id: number;
    project_id: number;
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

export interface HistoryDetailResponse extends GenerationItem {
    logs?: string;
    result_data?: any;
}

export interface StartGenerationRequest {
    title: string;
    project_id: number;
    model: string;
    language: string;
    tcPrefix: string;
}
export interface StartGenerationResponse {
    id: number;
    status: string;
    message?: string;
}
