// 생성된 TC 항목 구조
export type TestCase = {
    testcase_id: string | number; // TC 식별자
    title?: string; // 제목
    priority?: string; // 우선순위 (P1, P2 등)
    expected_result?: string; // 기대 결과
    preconditions?: string; // 사전 조건
    module?: string; // 기능 모듈 명
    steps?: string[]; // 테스트 스텝 단계
};
