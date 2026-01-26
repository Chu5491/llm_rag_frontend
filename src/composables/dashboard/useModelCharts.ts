import {ref} from "vue";
import type {DashboardStats, ModelStatItem} from "../../types/dashboard.js";

export const useModelCharts = () => {
    const modelStatsOptions = ref({});

    const updateModelCharts = (stats: DashboardStats) => {
        modelStatsOptions.value = {};

        if (!stats.tc_model_stats || stats.tc_model_stats.length === 0) return;

        const originModels = stats.tc_model_stats.map(
            (m: ModelStatItem) => m.model_name
        );
        const usageData = stats.tc_model_stats.map(
            (m: ModelStatItem) => m.usage_count
        );
        const prodData = stats.tc_model_stats.map(
            (m: ModelStatItem) => m.avg_generated_count
        );
        const speedData = stats.tc_model_stats.map(
            (m: ModelStatItem) => m.avg_duration
        ); // min 단위 가정

        modelStatsOptions.value = {
            chart: {
                type: "bar",
                backgroundColor: "transparent",
                style: {fontFamily: "Inter, sans-serif"},
                height: 480,
            },
            title: {
                text: "모델별 종합 성능 분석",
                align: "left",
                style: {fontSize: "16px", fontWeight: "600", color: "#111827"},
            },
            subtitle: {
                text: "사용 횟수, 평균 생성 수, 평균 소요 시간(분) 비교",
                align: "left",
                style: {color: "#6B7280"},
            },
            xAxis: {
                categories: originModels,
                title: {text: null},
                gridLineWidth: 1,
                lineWidth: 0,
                gridLineColor: "#F3F4F6",
                labels: {style: {color: "#6B7280", fontSize: "13px"}},
            },
            yAxis: {
                min: 0,
                title: {text: null},
                labels: {overflow: "justify", style: {color: "#9CA3AF"}},
                gridLineWidth: 0,
            },
            tooltip: {
                shared: true,
                valueSuffix: "",
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    dataLabels: {
                        enabled: true,
                        style: {textOutline: "none", color: "#4B5563"},
                    },
                    groupPadding: 0.1,
                },
            },
            legend: {
                enabled: true,
                align: "right",
                verticalAlign: "top",
                layout: "vertical",
                y: -15,
                floating: true,
                itemStyle: {color: "#4B5563", fontWeight: "500"},
                margin: 15,
            },
            credits: {enabled: false},
            series: [
                {
                    name: "사용 횟수 (Usage)",
                    data: usageData,
                    color: "#10B981", // Emerald
                    tooltip: {valueSuffix: " 회"},
                },
                {
                    name: "평균 생성 수 (Count)",
                    data: prodData,
                    color: "#3B82F6", // Blue
                    tooltip: {valueSuffix: " 개"},
                },
                {
                    name: "평균 소요 시간 (분)",
                    data: speedData,
                    color: "#EF4444", // Red
                    tooltip: {valueSuffix: " min"},
                },
            ],
        };
    };

    return {
        modelStatsOptions,
        updateModelCharts,
    };
};
