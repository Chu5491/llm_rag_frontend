export interface ArtifactItem {
    artifact_type: string; // "요구사항정의서" | "화면설계서" | "이외"
    name: string;
    has_file: boolean;
    // 프론트엔드 전용 필드 (선택)
    id?: number; // UI 목록 관리용 임시 ID
    selected?: boolean; // UI 선택 상태
    file?: File; // 업로드할 파일 객체
}

export interface ExternalSystemItem {
    system_type: "jira" | "figma";
    url?: string;
    enabled: boolean;
    // pat는 보안상 서버로 전송할 때만 사용하거나 별도 관리,
    // 일단 UI 상태 관리를 위해 여기 포함시킬지 고민되지만 Pydantic엔 제외됨.
    // UI에서만 쓰는 필드로 추가
    pat?: string;
    label?: string; // UI 표시용
    description?: string; // UI 표시용
    status?: "idle" | "connected" | "error"; // UI 상태용
}

export interface ProjectBase {
    name: string;
    description?: string;
}

export interface ProjectCreate extends ProjectBase {
    artifacts: ArtifactItem[];
    external_systems: ExternalSystemItem[];
}

export interface ProjectResponse extends ProjectBase {
    id: string; // UUID
    created_at: string; // datetime string
    updated_at: string; // datetime string
    artifacts: ArtifactItem[];
    external_systems: ExternalSystemItem[];
    tc_count: number;
}

// ProjectBase의 모든 필드를 optional로 만듭니다.
export type ProjectUpdate = Partial<ProjectBase>;
