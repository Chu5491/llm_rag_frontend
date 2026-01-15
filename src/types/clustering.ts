export interface ClusteringRequest {
    project_id: number;
    history_id?: number;
    module?: string;
    eps?: number;
    min_samples?: number;
}

export interface ClusterGroup {
    id: number; // or string if generated uuid
    label: number; // cluster label (-1 for noise)
    testcases: any[]; // Define TestCase type strictly if available, currently 'any' or shared TestCase type
    representative_tc?: any; // To be determined by backend response structure
}

// Based on the user's python return type:
// {
//     "summary": {
//         "total_tcs": len(tcs),
//         "groups_count": len(result["groups"]),
//         "noise_count": len(result["noise"]),
//     },
//     "groups": result["groups"],
//     "noise": result["noise"],
// }

export interface ClusteringSummary {
    total_tcs: number;
    groups_count: number;
    noise_count: number;
}

export interface ClusteringResponse {
    summary: ClusteringSummary;
    groups: any;
    noise: any[];
    msg?: string;
}
