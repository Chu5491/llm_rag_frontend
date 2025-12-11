export type TestCase = {
    testcase_id: string | number;
    title?: string;
    priority?: string;
    expected_result?: string;
    preconditions?: string;
    steps?: string[];
};
