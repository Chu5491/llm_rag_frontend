import type {
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
} from "../types/project.js";

// ----------------------------------------------------------------------
// 프로젝트(Projects) API
// ----------------------------------------------------------------------

// 프로젝트 생성
export async function createProject(
    data: ProjectCreate
): Promise<ProjectResponse> {
    const res = await fetch("/api/v1/projects/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        throw new Error("프로젝트 생성에 실패했습니다.");
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
    projectId: string
): Promise<ProjectResponse> {
    const res = await fetch(`/api/v1/projects/${projectId}`);
    if (!res.ok) {
        throw new Error("프로젝트 상세 조회에 실패했습니다.");
    }
    return res.json();
}

// 프로젝트 수정
export async function updateProject(
    projectId: string,
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
export async function deleteProject(projectId: string): Promise<void> {
    const res = await fetch(`/api/v1/projects/${projectId}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        throw new Error("프로젝트 삭제에 실패했습니다.");
    }
}
