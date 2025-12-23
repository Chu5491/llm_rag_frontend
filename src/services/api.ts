import type {AppConfigResponse} from "../types/config.js";
import type {
    ChatMessage,
    ChatResponse,
    OllamaModelsResponse,
} from "../types/ollama.js";
import type {
    GenerationItem,
    HistoryDetailResponse,
    StartGenerationRequest,
    StartGenerationResponse,
} from "../types/Generate.js";

// 백엔드 및 Ollama API 상태 확인
export async function checkApiStatus(): Promise<boolean> {
    try {
        const res = await fetch("/api/v1/ollama/status");
        return res.ok;
    } catch (err) {
        return false;
    }
}

// RAG 기반 테스트케이스 자동 생성 실행 (파일 또는 Figma 기반)
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

// Figma 연동 정보 및 현재 상태 확인
export async function checkFigmaPersist(): Promise<any> {
    const res = await fetch("/api/v1/figma/info");

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

// Ollama 서버에 설치된 모델 목록 조회
export async function getOllamaModels(): Promise<OllamaModelsResponse> {
    const res = await fetch("/api/v1/ollama/models");
    if (!res.ok) {
        throw new Error("Ollama 모델 목록 조회에 실패했습니다.");
    }
    return res.json();
}

// Ollama 모델에 채팅 메시지 전송 및 응답 수신
export async function sendChatMessage(
    messages: ChatMessage[]
): Promise<ChatResponse> {
    const response = await fetch("/api/v1/ollama/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messages,
        }),
    });

    if (!response.ok) {
        throw new Error("채팅 메시지 전송에 실패했습니다.");
    }

    return response.json();
}

// 서버에 저장된 전역 환경설정 정보 조회
export async function getAppConfig(): Promise<AppConfigResponse> {
    const res = await fetch("/api/v1/config/");
    if (!res.ok) {
        throw new Error("환경설정 정보를 불러오는 데 실패했습니다.");
    }
    return res.json();
}

// 서버 전역 환경설정 정보 업데이트 (PATCH)
// 히스토리 목록 조회
export async function fetchHistories(): Promise<GenerationItem[]> {
    const res = await fetch("/api/v1/history");
    if (!res.ok) {
        throw new Error("히스토리 조회에 실패했습니다.");
    }
    return res.json();
}

// 히스토리 상세 조회
export async function fetchHistoryDetail(
    id: number
): Promise<HistoryDetailResponse> {
    const res = await fetch(`/api/v1/history/${id}`);
    if (!res.ok) {
        throw new Error("히스토리 상세 정보 조회에 실패했습니다.");
    }
    return res.json();
}

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

// running 상태인 히스토리들의 상세 정보를 주기적으로 조회하여 콜백으로 전달합니다.
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

// RAG 생성 작업 중단
export async function cancelGeneration(historyId: number): Promise<any> {
    const res = await fetch(`/api/v1/rag/cancel/${historyId}`, {
        method: "POST",
    });
    if (!res.ok) {
        throw new Error("작업 중단에 실패했습니다.");
    }
    return res.json();
}
