// 생성된 TC 항목 구조 (TestcaseBase)
export interface TestcaseBase {
    module: string;
    title: string;
    preconditions?: string | null;
    steps: TestcaseStep[]; // steps 구조 변경 string[] -> TestcaseStep[]
    expected_result: string;
    priority?: string | null;
    status: string; // generated, active, inactive
}

export interface TestcaseStep {
    action: string;
    expected: string;
}

export interface TestcaseCreate extends TestcaseBase {
    project_id: number;
    history_id?: number | null;
    testcase_id_tag?: string | null;
    embedding?: [number] | null;
}

export interface TestcaseUpdate {
    module?: string;
    title?: string;
    preconditions?: string | null;
    steps?: TestcaseStep[];
    expected_result?: string;
    priority?: string | null;
    status?: string;
}

export interface TestcaseResponse extends TestcaseBase {
    id: number;
    project_id: number;
    history_id?: number | null;
    testcase_id_tag?: string | "";
    created_at: string; // ISO datetime string
    updated_at: string; // ISO datetime string
    comments: TestCaseCommentResponse[];
    edit_history: TestCaseEditHistoryResponse[];
}

export interface TestCaseCommentBase {
    content: string;
}

export interface TestCaseCommentCreate extends TestCaseCommentBase {
    testcase_id: number;
    user_id?: number | null;
}

export interface TestCaseCommentResponse extends TestCaseCommentBase {
    id: number;
    testcase_id: number;
    user_id?: number | null;
    created_at: string;
}

export interface TestCaseEditHistoryResponse {
    id: number;
    testcase_id: number;
    user_id?: number | null;
    updated_at: string;
}

// 목록 조회 파라미터
export interface TestcaseListParams {
    project_id: number;
    skip?: number;
    limit?: number;
    status?: string;
    history_id?: number | null;
    priority?: string;
    module?: string;
}
