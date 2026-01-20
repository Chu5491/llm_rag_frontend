import {apiClient} from "./apiClient.js";
import type {
    TestcaseResponse,
    TestcaseUpdate,
    TestcaseListParams,
    TestcaseCreate,
} from "../types/testcase.js";

export * from "../types/testcase.js";

// 테스트케이스 목록 조회
export async function getTestCaseList(
    params: TestcaseListParams
): Promise<TestcaseResponse[]> {
    const queryParams: Record<string, string | number> = {
        project_id: params.project_id,
        skip: params.skip || 0,
        limit: params.limit !== undefined ? params.limit : 0,
    };

    if (params.status) queryParams.status = params.status;
    if (params.history_id) queryParams.history_id = params.history_id;
    if (params.priority) queryParams.priority = params.priority;
    if (params.module) queryParams.module = params.module;

    return apiClient.get<TestcaseResponse[]>("/testcases", {
        params: queryParams,
    });
}

// 테스트케이스 상세 조회
export async function getTestCaseDetail(
    testcaseId: number
): Promise<TestcaseResponse> {
    return apiClient.get<TestcaseResponse>(`/testcases/${testcaseId}`);
}

// 테스트케이스 생성
export async function createTestCase(
    data: TestcaseCreate
): Promise<TestcaseResponse> {
    return apiClient.post<TestcaseResponse>("/testcases/create", data);
}

// 테스트케이스 수정
export async function updateTestCase(
    testcaseId: number,
    data: TestcaseUpdate
): Promise<TestcaseResponse> {
    return apiClient.patch<TestcaseResponse>(`/testcases/${testcaseId}`, data);
}

// 테스트케이스 삭제
export async function deleteTestCase(testcaseId: number): Promise<void> {
    return apiClient.delete<void>(`/testcases/${testcaseId}`);
}

// AI 테스트케이스 병합
export async function mergeTestCases(
    testcaseIds: number[]
): Promise<TestcaseCreate> {
    return apiClient.post<TestcaseCreate>("/testcases/merge", {
        testcase_ids: testcaseIds,
    });
}
