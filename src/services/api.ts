export async function checkApiStatus(): Promise<boolean> {
    try {
        const res = await fetch("/api/v1/ollama/status");
        return res.ok;
    } catch (err) {
        return false;
    }
}

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

export async function getOllamaModels() {
    const res = await fetch("/api/v1/ollama/models");
    if (!res.ok) {
        throw new Error("Ollama 모델 목록 조회에 실패했습니다.");
    }
    return res.json();
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatResponse {
    success: boolean;
    output: any;
    raw: {
        model: string;
        created_at: string;
        message: ChatMessage;
        done: boolean;
        done_reason: string;
        total_duration: number;
        load_duration: number;
        prompt_eval_count: number;
        prompt_eval_duration: number;
        eval_count: number;
        eval_duration: number;
    };
}

export async function sendChatMessage(messages: ChatMessage[], model = "exaone3.5:2.4b"): Promise<ChatResponse> {
    const response = await fetch("/api/v1/ollama/chat", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messages,
            model
        })
    });
    
    if (!response.ok) {
        throw new Error('채팅 메시지 전송에 실패했습니다.');
    }
    
    return response.json();
}
