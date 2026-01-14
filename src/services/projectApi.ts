import {apiClient} from "./apiClient.js";
import type {
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    FeatureCreate,
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
                file_name: artifact.file.name,
                source_type: artifact.source_type,
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
    const params = {skip, limit};
    return apiClient.get<ProjectResponse[]>("/projects/", {params});
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
    data: ProjectUpdate & {
        artifacts?: any[];
        external_systems?: any[];
        features?: FeatureCreate[];
    }
): Promise<ProjectResponse> {
    const formData = new FormData();

    // 1. 기본 필드 (Backend: name, service_type, description)
    if (data.name) formData.append("name", data.name);
    if (data.service_type) formData.append("service_type", data.service_type);
    // description이 빈 문자열일 수도 있으므로 undefined 체크
    if (data.description !== undefined) {
        formData.append("description", data.description);
    }

    // 2. Features (기능 분류)
    // Note: 전달받은 백엔드 스펙에는 없으나, 프론트엔드 기능 유지를 위해 전송 (백엔드에서 무시 가능)
    if (data.features) {
        formData.append("features_json", JSON.stringify(data.features));
    }

    // 3. Artifacts (새로 추가된 파일 및 메타데이터)
    // Backend: artifacts_json (str), files (List[UploadFile])
    if (data.artifacts) {
        const processedArtifacts = data.artifacts.map((artifact) => {
            if (artifact.file) {
                // files 키로 파일 전송 (FastAPI List[UploadFile] 매핑)
                formData.append("files", artifact.file);
                // JSON 메타데이터에서는 파일 객체 제외 및 name 설정
                return {
                    ...artifact,
                    id: undefined,
                    name: artifact.file.name,
                    file_name: artifact.file.name,
                    source_type: artifact.source_type,
                    file: undefined,
                };
            }
            return artifact;
        });
        formData.append("artifacts_json", JSON.stringify(processedArtifacts));
    }

    // 4. External Systems (외부 시스템 설정)
    // Backend: external_systems_json (str)
    if (data.external_systems) {
        const processedExternalSystems = data.external_systems.map((sys) => {
            return sys;
        });
        formData.append(
            "external_systems_json",
            JSON.stringify(processedExternalSystems)
        );
    }

    // 5. API 전송
    return apiClient.put<ProjectResponse>(`/projects/${projectId}`, formData);
}

// 프로젝트 삭제
export async function deleteProject(projectId: number): Promise<void> {
    return apiClient.delete<void>(`/projects/${projectId}`);
}
