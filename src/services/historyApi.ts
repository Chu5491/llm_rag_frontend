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
    const res = await fetch(endpoint, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({model}),
    });
    if (!res.ok) throw new Error("generate API failed");
    return res.json();
}

// Figma 연동 정보 및 상태 확인
export async function checkFigmaPersist(
    url?: string,
    pat?: string
): Promise<any> {
    const res = await fetch("/api/v1/figma/info", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            url,
            pat,
        }),
    });

    if (!res.ok) {
        let message = "Figma 연동 체크에 실패했습니다.";

        try {
            const data = await res.json();
            if (data && data.detail) {
                message =
                    typeof data.detail === "string"
                        ? data.detail
                        : JSON.stringify(data.detail);
            }
        } catch {
            // json 파싱 실패하면 기본 메시지 그대로 사용
        }

        throw new Error(message);
    }

    return res.json();
}

// 히스토리 목록 조회
export async function fetchHistories(
    projectId?: number
): Promise<GenerationItem[]> {
    const url = projectId
        ? `/api/v1/history?project_id=${projectId}`
        : "/api/v1/history";
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error("히스토리 조회에 실패했습니다.");
    }
    return res.json();
}

// 히스토리 상세 조회
export async function fetchHistoryDetail(
    id: number
): Promise<HistoryDetailResponse> {
    const res = await fetch(`/api/v1/history/${id}?polling=true`);
    if (!res.ok) {
        throw new Error("히스토리 상세 정보 조회에 실패했습니다.");
    }
    return res.json();
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
    const response = await fetch(`/api/v1/rag/generate/all`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(
            error.message || "자동 생성 시작 중 오류가 발생했습니다."
        );
    }
    return response.json();
};

// 작업 중단
export async function cancelGeneration(historyId: number): Promise<any> {
    const res = await fetch(`/api/v1/history/cancel/${historyId}`, {
        method: "POST",
    });
    if (!res.ok) {
        throw new Error("작업 중단에 실패했습니다.");
    }
    return res.json();
}

// 작업 재시도
export async function retryGeneration(historyId: number): Promise<any> {
    const res = await fetch(`/api/v1/history/${historyId}/retry`, {
        method: "POST",
    });
    if (!res.ok) {
        throw new Error("재시도에 실패했습니다.");
    }
    return res.json();
}
