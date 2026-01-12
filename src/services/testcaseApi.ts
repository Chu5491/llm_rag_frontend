import type {
    TestcaseResponse,
    TestcaseUpdate,
    TestcaseListParams,
} from "../types/testcase.js";

export * from "../types/testcase.js";

// 테스트케이스 목록 조회
export async function getTestCaseList(
    params: TestcaseListParams
): Promise<TestcaseResponse[]> {
    const query = new URLSearchParams({
        project_id: params.project_id.toString(),
        skip: (params.skip || 0).toString(),
        limit: (params.limit !== undefined ? params.limit : 0).toString(), // Default to 0 (all) if undefined, or explicit value
    });

    if (params.status) query.append("status", params.status);
    if (params.history_id)
        query.append("history_id", params.history_id.toString());
    if (params.priority) query.append("priority", params.priority);
    if (params.module) query.append("module", params.module);

    const res = await fetch(`/api/v1/testcases?${query.toString()}`);
    if (!res.ok) {
        throw new Error("테스트케이스 목록 조회에 실패했습니다.");
    }
    return res.json();
}

// 테스트케이스 상세 조회
export async function getTestCaseDetail(
    testcaseId: number
): Promise<TestcaseResponse> {
    const res = await fetch(`/api/v1/testcases/${testcaseId}`);
    if (!res.ok) {
        throw new Error("테스트케이스 상세 조회에 실패했습니다.");
    }
    return res.json();
}

// 테스트케이스 수정
export async function updateTestCase(
    testcaseId: number,
    data: TestcaseUpdate
): Promise<TestcaseResponse> {
    const res = await fetch(`/api/v1/testcases/${testcaseId}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        throw new Error("테스트케이스 수정에 실패했습니다.");
    }
    return res.json();
}

// 테스트케이스 삭제
export async function deleteTestCase(testcaseId: number): Promise<void> {
    const res = await fetch(`/api/v1/testcases/${testcaseId}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        throw new Error("테스트케이스 삭제에 실패했습니다.");
    }
}
