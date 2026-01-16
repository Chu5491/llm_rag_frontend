import {TestcaseResponse} from "./testcase.js";

export interface ClusteringRequest {
    project_id: number;
    history_id?: number | null;
    module?: string;
    eps?: number;
    min_samples?: number;
}

export interface ClusterGroup {
    group_id: number;
    average_distance: number;
    items: any[]; // items contains TestcaseResponse & { distance_to_nearest: number }
}

export interface ClusteringSummary {
    total_tcs: number;
    groups_count: number;
    noise_count: number;
}

export interface ClusteringResponse {
    summary: ClusteringSummary;
    groups: ClusterGroup[];
    noise: any[];
}

export interface ClusterItem {
    id: string;
    testcase_id_tag: string;
    title: string;
    description: string;
    count: number;
    score: number;
    insight: string;
    testcases: TestcaseResponse[];
    selected: boolean;
}
