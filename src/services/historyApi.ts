import { apiClient } from "./apiClient.js";
import type {
    GenerationItem,
    HistoryDetailResponse,
    StartGenerationRequest,
    StartGenerationResponse,
} from "../types/Generate.js";

// RAG 기반 TC 생성 (개별 파일/Figma)
export async function generateTestCases(
    endpoint: "/api/v1/rag/generate/file" | "/api/v1/rag/generate/figma",
    model = "exaone3.5:2.4b"
) {
    // endpoint에서 BASE_URL(/api/v1) 부분 제거
    const path = endpoint.replace("/api/v1", "");
    return apiClient.post(path, { model });
}

// Figma 연동 정보 및 상태 확인
export async function checkFigmaPersist(
    url?: string,
    pat?: string
): Promise<any> {
    return apiClient.post("/figma/info", { url, pat });
}

// 히스토리 목록 조회
export async function fetchHistories(
    projectId?: number
): Promise<GenerationItem[]> {
    const params: Record<string, any> = {};
    if (projectId) {
        params.project_id = projectId;
    }
    return apiClient.get<GenerationItem[]>("/history", { params });
}

// 히스토리 상세 조회
export async function fetchHistoryDetail(
    id: number
): Promise<HistoryDetailResponse> {
    return apiClient.get<HistoryDetailResponse>(`/history/${id}`, {
        params: { polling: true },
    });
}

// 진행중인 항목 상태 주기적 조회 (Polling)
export function pollRunningItems(
    itemIds: number[],
    onUpdate: (details: HistoryDetailResponse[]) => void,
    interval = 3000
): () => void {
    let isPolling = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const uniqueIds = [...new Set(itemIds)]; // Remove duplicates
    const poll = async () => {
        if (!isPolling) return;
        try {
            const details = await Promise.all(
                uniqueIds.map((id) => fetchHistoryDetail(id))
            );
            onUpdate(details);
        } catch (error) {
            console.error("Error polling items:", error);
        }
        if (isPolling) {
            timeoutId = setTimeout(poll, interval);
        }
    };
    // Start polling
    poll();
    // Return a function to stop polling
    return () => {
        isPolling = false;

        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };
}

// 테스트케이스 생성 시작 (통합)
export const startGeneration = async (
    data: StartGenerationRequest
): Promise<StartGenerationResponse> => {
    return apiClient.post<StartGenerationResponse>("/rag/generate/all", data, {
        credentials: "include",
    });
};

// 작업 중단
export async function cancelGeneration(historyId: number): Promise<any> {
    return apiClient.post(`/history/cancel/${historyId}`);
}

// 작업 재시도
export async function retryGeneration(historyId: number): Promise<any> {
    return apiClient.post(`/history/${historyId}/retry`);
}
