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
    const res = await fetch("/api/v1/projects/", {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        // 에러 상세 메시지 파싱 시도
        let errorMessage = "프로젝트 생성에 실패했습니다.";
        try {
            const errorData = await res.json();
            if (errorData.detail) {
                errorMessage = errorData.detail;
            }
        } catch (e) {
            // ignore
        }
        throw new Error(errorMessage);
    }
    return res.json();
}

// 프로젝트 목록 조회
export async function fetchProjects(
    skip = 0,
    limit = 100
): Promise<ProjectResponse[]> {
    const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
    });
    const res = await fetch(`/api/v1/projects/?${params.toString()}`);
    if (!res.ok) {
        throw new Error("프로젝트 목록 조회에 실패했습니다.");
    }
    return res.json();
}

// 프로젝트 상세 조회
export async function fetchProjectDetail(
    projectId: number
): Promise<ProjectResponse> {
    const res = await fetch(`/api/v1/projects/${projectId}`);
    if (!res.ok) {
        throw new Error("프로젝트 상세 조회에 실패했습니다.");
    }
    return res.json();
}

// 프로젝트 수정
export async function updateProject(
    projectId: number,
    data: ProjectUpdate
): Promise<ProjectResponse> {
    const res = await fetch(`/api/v1/projects/${projectId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        throw new Error("프로젝트 수정에 실패했습니다.");
    }
    return res.json();
}

// 프로젝트 삭제
export async function deleteProject(projectId: number): Promise<void> {
    const res = await fetch(`/api/v1/projects/${projectId}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        throw new Error("프로젝트 삭제에 실패했습니다.");
    }
}
