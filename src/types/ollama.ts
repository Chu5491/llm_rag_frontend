// Ollama 채팅 메시지 구조 (role: user, assistant, system)
export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

// Ollama API의 원본 상세 통계 정보
export interface OllamaRawStats {
    model: string;
    created_at: string;
    message: ChatMessage;
    done: boolean;
    done_reason: string;
    total_duration: number;
    load_duration: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

// Ollama 채팅 응답 통합 구조 (T는 output의 타입)
export interface ChatResponse<T = any> {
    success: boolean;
    output: T;
    raw: OllamaRawStats;
}

// Ollama에 설치된 각 모델의 상세 정보
export interface OllamaModel {
    name: string;
    digest: string;
    size: number;
    modified_at?: string;
    details?: {
        format: string;
        family: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
}

// Ollama 모델 목록 응답 구조
export interface OllamaModelsResponse {
    models: OllamaModel[];
}
