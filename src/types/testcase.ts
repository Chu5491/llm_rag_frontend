// 생성된 TC 항목 구조 (TestcaseBase)
export interface TestcaseBase {
    module: string;
    title: string;
    preconditions?: string | null;
    steps: string[];
    expected_result: string;
    priority?: string | null;
    status: string; // generated, active, inactive
}

export interface TestcaseCreate extends TestcaseBase {
    project_id: number;
    history_id?: number | null;
    testcase_id_tag?: string | null;
}

export interface TestcaseUpdate {
    module?: string;
    title?: string;
    preconditions?: string | null;
    steps?: string[];
    expected_result?: string;
    priority?: string | null;
    status?: string;
}

export interface TestcaseResponse extends TestcaseBase {
    id: number;
    project_id: number;
    history_id?: number | null;
    testcase_id_tag?: string | null;
    created_at: string; // ISO datetime string
    updated_at: string; // ISO datetime string
}

// 목록 조회 파라미터
export interface TestcaseListParams {
    project_id: number;
    skip?: number;
    limit?: number;
    status?: string;
}
