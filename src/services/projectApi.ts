import { apiClient } from "./apiClient.js";
import type {
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
} from "../types/project.js";

// 프로젝트 생성 (FormData 사용)
export async function createProject(
    data: ProjectCreate
): Promise<ProjectResponse> {
    const formData = new FormData();

    // 1. 기본 필드 설정
    formData.append("name", data.name);
    formData.append("service_type", data.service_type);
    if (data.description) {
        formData.append("description", data.description);
    }

    // 2. Artifacts 처리 (파일 -> FormData, 메타데이터 -> JSON)
    const processedArtifacts = data.artifacts.map((artifact) => {
        // 파일이 있는 경우
        if (artifact.file) {
            // 파일을 FormData에 추가
            formData.append("files", artifact.file);
            // 백엔드 매핑을 위해 name을 파일명으로 교체하여 반환
            return {
                ...artifact,
                name: artifact.file.name,
                file: undefined, // JSON 변환 시 제외
            };
        }
        // 파일이 없는 경우 그대로 사용
        return artifact;
    });

    formData.append("artifacts_json", JSON.stringify(processedArtifacts));

    // 3. External Systems 처리
    formData.append(
        "external_systems_json",
        JSON.stringify(data.external_systems)
    );

    // 4. API 전송
    // apiClient는 FormData를 자동으로 감지하고 Content-Type을 설정하지 않습니다 (브라우저가 설정).
    return apiClient.post<ProjectResponse>("/projects/", formData);
}

// 프로젝트 목록 조회
export async function fetchProjects(
    skip = 0,
    limit = 100
): Promise<ProjectResponse[]> {
    const params = { skip, limit };
    return apiClient.get<ProjectResponse[]>("/projects/", { params });
}

// 프로젝트 상세 조회
export async function fetchProjectDetail(
    projectId: number
): Promise<ProjectResponse> {
    return apiClient.get<ProjectResponse>(`/projects/${projectId}`);
}

// 프로젝트 수정
export async function updateProject(
    projectId: number,
    data: ProjectUpdate
): Promise<ProjectResponse> {
    return apiClient.put<ProjectResponse>(`/projects/${projectId}`, data);
}

// 프로젝트 삭제
export async function deleteProject(projectId: number): Promise<void> {
    return apiClient.delete<void>(`/projects/${projectId}`);
}
