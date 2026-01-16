import {apiClient} from "./apiClient.js";
import {ClusteringRequest, ClusteringResponse} from "../types/clustering.js";

export async function runClustering(
    data: ClusteringRequest
): Promise<ClusteringResponse> {
    // 쿼리 파라미터 구성
    // 백엔드 엔드포인트가 Pydantic 모델 대신 개별 인자를 받는 경우 Query Parameter로 전달해야 함.
    const params = new URLSearchParams();
    params.append("project_id", data.project_id.toString());

    if (data.history_id) {
        params.append("history_id", data.history_id.toString());
    }

    if (data.module) {
        params.append("module", data.module);
    }

    if (data.eps !== undefined) {
        params.append("eps", data.eps.toString());
    }

    if (data.min_samples !== undefined) {
        params.append("min_samples", data.min_samples.toString());
    }

    // POST로 요청하되 파라미터는 URL Query String으로 전달
    // (백엔드 구현에 따라 Body로 변경 가능)
    return apiClient.post<ClusteringResponse>(
        `/testcases/clustering?${params.toString()}`
    );
}
