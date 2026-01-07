// 앱 전역 설정 (DB Response)
export interface AppConfigResponse {
    id: number;
    embedding_model: string | null; // 기본 임베딩 모델 명
    llm_model: string | null; // 기본 LLM 모델 명
    rag_tc_count: number | null; // 배치당 최대 TC 생성 개수
    rag_batch_size: number | null; // RAG 처리 문서 배치 크기
    rag_tc_id_prefix: string | null; // 테스트케이스 ID 접두어
    figma_enabled: boolean | null; // Figma 연동 여부
    created_at: string;
    updated_at: string;
}
