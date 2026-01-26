import {ref} from "vue";
import {useChartFactory} from "./useChartFactory.js";
import type {
    DashboardStats,
    TrendItem,
    StatusCountItem,
} from "../../types/dashboard.js";

export const useTrendCharts = () => {
    const {createChartOptions} = useChartFactory();

    const generationTrendOptions = ref({});
    const usabilityTrendOptions = ref({});
    const generationStatusOptions = ref({});

    const updateTrendCharts = (stats: DashboardStats) => {
        // 초기화 (데이터 없을 경우 빈 차트로 리셋)
        generationTrendOptions.value = {};
        usabilityTrendOptions.value = {};
        generationStatusOptions.value = {};

        // 1. TC 생성 추이 (Line Chart)
        if (stats.tc_generation_trend && stats.tc_generation_trend.length > 0) {
            const dates = [
                ...new Set(
                    stats.tc_generation_trend.map((d: TrendItem) => d.date)
                ),
            ].sort();
            const labels = [
                ...new Set(
                    stats.tc_generation_trend.map((t: TrendItem) => t.label)
                ),
            ];

            const seriesData = labels.map((label: any) => {
                const data = dates.map((date: any) => {
                    const item = stats.tc_generation_trend?.find(
                        (t: TrendItem) => t.date === date && t.label === label
                    );
                    return item ? item.count : 0;
                });

                let color = "#6B7280";
                if (label === "success") color = "#10B981";
                if (label === "running") color = "#3B82F6";
                if (label === "failed") color = "#EF4444";
                if (label === "cancelled") color = "#9CA3AF";

                return {name: label, data: data, color: color};
            });

            generationTrendOptions.value = createChartOptions(
                "line",
                "일별 TC 생성 추이 (최근 30일)",
                dates,
                seriesData
            );
        }

        // 2. TC 사용성 추이 (Column + Spline)
        if (stats.tc_usability_trend && stats.tc_usability_trend.length > 0) {
            const dates = [
                ...new Set(
                    stats.tc_usability_trend.map((d: TrendItem) => d.date)
                ),
            ].sort();
            const labels = [
                ...new Set(
                    stats.tc_usability_trend.map((t: TrendItem) => t.label)
                ),
            ].sort((a: any, b: any) => {
                if (a === "total") return -1;
                if (b === "total") return 1;
                return 0;
            });

            const series = labels.map((label: any) => {
                const data = dates.map((date: any) => {
                    const items = stats.tc_usability_trend?.filter(
                        (t: TrendItem) => t.date === date && t.label === label
                    );
                    return items
                        ? items.reduce(
                              (sum: number, item: TrendItem) =>
                                  sum + item.count,
                              0
                          )
                        : 0;
                });

                if (label === "total") {
                    return {
                        name: "전체 (Total)",
                        type: "spline",
                        data: data,
                        color: "#111827",
                        dashStyle: "ShortDot",
                        marker: {
                            lineWidth: 2,
                            lineColor: "#111827",
                            fillColor: "white",
                        },
                        zIndex: 2,
                    };
                }

                let color = "#9CA3AF";
                if (label === "active") color = "#10B981";
                if (label === "generated") color = "#3B82F6";
                if (label === "inactive") color = "#94A3B8";

                return {
                    name: label,
                    type: "column",
                    data: data,
                    color: color,
                    stacking: "normal",
                    zIndex: 1,
                };
            });

            usabilityTrendOptions.value = createChartOptions(
                "column",
                "주간 TC 상태 변화 (최근 4주)",
                dates,
                series,
                []
            );
        }

        // 3. 상태 분포 (Pie Chart)
        if (
            stats.tc_usability_status_counts &&
            stats.tc_usability_status_counts.length > 0
        ) {
            const pieData = stats.tc_usability_status_counts.map(
                (item: StatusCountItem) => ({
                    name: item.label,
                    y: item.count,
                })
            );

            generationStatusOptions.value = createChartOptions(
                "pie",
                "TC 상태 분포",
                [],
                [{name: "Test Cases", colorByPoint: true, data: pieData}]
            );
        }
    };

    return {
        generationTrendOptions,
        usabilityTrendOptions,
        generationStatusOptions,
        updateTrendCharts,
    };
};
