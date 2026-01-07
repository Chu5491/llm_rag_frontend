import type {
    ChatMessage,
    ChatResponse,
    OllamaModelsResponse,
} from "../types/ollama.js";

// API 상태 확인 (Backend + Ollama)
export async function checkApiStatus(): Promise<boolean> {
    try {
        const res = await fetch("/api/v1/ollama/status");
        return res.ok;
    } catch (err) {
        return false;
    }
}

// 설치된 Ollama 모델 목록 조회
export async function getOllamaModels(): Promise<OllamaModelsResponse> {
    const res = await fetch("/api/v1/ollama/models");
    if (!res.ok) {
        throw new Error("Ollama 모델 목록 조회에 실패했습니다.");
    }
    return res.json();
}

// 채팅 메시지 전송 (동기)
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
