// --- 1. Database/Domain Entities (Reading) ---

export type ProjectItemStatus =
    | "idle"
    | "processing"
    | "completed"
    | "partial_success"
    | "error";

// 산출물 타입 (DB 저장용 - English)
export const ARTIFACT_TYPES = {
    REQUIREMENTS: "requirements",
    SCREEN_DESIGN: "screen_design",
    API_SPEC: "api_spec",
    MANUAL: "manual",
    ETC: "etc",
} as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[keyof typeof ARTIFACT_TYPES];

// UI 매핑 (English Key -> Korean Label)
export const ARTIFACT_LABELS: Record<ArtifactType, string> = {
    [ARTIFACT_TYPES.REQUIREMENTS]: "요구사항명세서",
    [ARTIFACT_TYPES.SCREEN_DESIGN]: "화면설계서",
    [ARTIFACT_TYPES.API_SPEC]: "API 명세서",
    [ARTIFACT_TYPES.MANUAL]: "메뉴얼",
    [ARTIFACT_TYPES.ETC]: "기타 자료",
};

// UI 아이콘 매핑
export const ARTIFACT_ICONS: Record<ArtifactType, string> = {
    [ARTIFACT_TYPES.REQUIREMENTS]: "assignment",
    [ARTIFACT_TYPES.SCREEN_DESIGN]: "web_asset",
    [ARTIFACT_TYPES.API_SPEC]: "api",
    [ARTIFACT_TYPES.MANUAL]: "menu_book",
    [ARTIFACT_TYPES.ETC]: "folder_open",
};

export interface ProjectArtifact {
    id: number;
    project_id: number;
    artifact_type: string; // '요구사항정의서', '화면설계서' 등
    name: string; // 사용자 정의 산출물 명
    file_name: string | null;
    extension: string | null; // .pdf, .docx
    has_file: boolean;
    file_path: string | null;
    created_at: string; // TIMESTAMPTZ -> string
    status?: ProjectItemStatus;
    last_error?: string | null;
}

export interface ProjectExternalSystem {
    id: number;
    project_id: number;
    system_type: string; // 'jira', 'figma'
    url: string | null;
    enabled: boolean;
    // pat는 보안상 DB 저장 안 함 -> Response에도 없음
    created_at: string;
    status?: ProjectItemStatus;
    last_error?: string | null;
}

export interface ProjectBase {
    name: string;
    service_type: string;
    description?: string;
}

// --- 2. Creation / UI (Writing) ---

export interface ArtifactCreate {
    artifact_type: string;
    name: string;
    has_file: boolean;
    // 프론트엔드 전용 필드 (파일 업로드 등)
    id?: number; // UI only
    file?: File; // UI only
    selected?: boolean; // UI only
}

export interface ExternalSystemCreate {
    system_type: "jira" | "figma";
    url?: string;
    enabled: boolean;
    // UI Only or Transmitted securely
    pat?: string;
    label?: string; // UI Only
    description?: string; // UI Only
    status?: "idle" | "connected" | "error"; // UI Only
}

export interface ProjectCreate extends ProjectBase {
    artifacts: ArtifactCreate[];
    external_systems: ExternalSystemCreate[];
}

// --- 3. API Response ---

export interface ProjectResponse extends ProjectBase {
    id: number;
    created_at: string;
    updated_at: string;
    artifacts: ProjectArtifact[];
    external_systems: ProjectExternalSystem[];
    tc_count: number;
}

export type ProjectUpdate = Partial<ProjectBase>;

// UI 호환성을 위한 Type Alias (기존 코드 호환)
export type ArtifactItem = ArtifactCreate;
export type ExternalSystemItem = ExternalSystemCreate;
