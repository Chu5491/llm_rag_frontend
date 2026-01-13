import { apiClient } from "./apiClient.js";
import type {
    ChatMessage,
    ChatResponse,
    OllamaModelsResponse,
} from "../types/ollama.js";

// API 상태 확인 (Backend + Ollama)
export async function checkApiStatus(): Promise<boolean> {
    try {
        await apiClient.get("/ollama/status");
        return true;
    } catch (err) {
        return false;
    }
}

// 설치된 Ollama 모델 목록 조회
export async function getOllamaModels(): Promise<OllamaModelsResponse> {
    return apiClient.get<OllamaModelsResponse>("/ollama/models");
}

// 채팅 메시지 전송 (동기)
export async function sendChatMessage(
    messages: ChatMessage[]
): Promise<ChatResponse> {
    return apiClient.post<ChatResponse>("/ollama/chat", { messages });
}
