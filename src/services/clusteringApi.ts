import {apiClient} from "./apiClient.js";
import {ClusteringRequest, ClusteringResponse} from "../types/clustering.js";

export async function runClustering(
    data: ClusteringRequest
): Promise<ClusteringResponse> {
    // Query params for GET or Body for POST?
    // User said: @router.post("/clustering")
    // Request body fields: project_id, history_id, module, eps, min_samples
    // But usually simple scalar fields in FastAPI are query params unless defined as Pydantic model body.
    // Looking at:
    // def clustering_testcases(
    //     project_id: int,
    //     ...
    //     db: Session = Depends(get_vector_db),
    // )
    // In FastAPI, if NOT using Pydantic model, these are query parameters!
    // However, the user said `@router.post`.
    // If it is POST, and arguments are standalone, FastAPI expects them as Query Parameters unless `Body(...)` is used.
    // OR it might have a Pydantic model I don't see.
    // Given the signature `def clustering_testcases(project_id: int, ...)` without a Pydantic model, verify if they are Body or Query.
    // SAFE BET: Try to send as Query Params for now based on signature style, OR check if I can assume JSON body.
    // Actually, usually POST implies body. Let's try sending as JSON body first if it fails we can switch.
    // Wait, if I send JSON body but FastAPI expects Query, it will 422.
    // Let's try to construct query string for params just in case, or inspect previous patterns.
    // But `projectApi` used FormData. `userApi` used FormData.
    // Let's assume standard JSON body or Query.
    // Let's try Query params since the signature looks like function arguments.

    // Constructing query params
    const params = new URLSearchParams();
    params.append("project_id", data.project_id.toString());
    if (data.history_id)
        params.append("history_id", data.history_id.toString());
    if (data.module) params.append("module", data.module);
    if (data.eps) params.append("eps", data.eps.toString());
    if (data.min_samples)
        params.append("min_samples", data.min_samples.toString());

    // return apiClient.post<ClusteringResponse>(`/clustering?${params.toString()}`);
    // But `post` usually takes body.
    // If they are query params, I should pass them in URL and body as empty or null.

    return apiClient.post<ClusteringResponse>(
        `/testcase/clustering?${params.toString()}`
    );
}
