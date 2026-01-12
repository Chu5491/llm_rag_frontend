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
