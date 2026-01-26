import {ref} from "vue";
import type {DashboardStats} from "../../types/dashboard.js";

export const useProjectCharts = () => {
    const projectCompositionOptions = ref({});
    const projectArtifactOptions = ref({});

    const updateProjectCharts = (stats: DashboardStats) => {
        // 초기화
        projectCompositionOptions.value = {};
        projectArtifactOptions.value = {};

        if (!stats.projects_stats || stats.projects_stats.length === 0) return;

        // 1. 프로젝트 구성 (독립된 2중 도넛)
        // - Inner: 서비스 타입 분포
        // - Outer: 전체 피그마 연동 현황 (서비스 타입과 무관)
        const serviceTypes: Record<string, number> = {};
        let totalConnected = 0;
        let totalNotConnected = 0;

        stats.projects_stats.forEach((curr: any) => {
            // Service Type Count
            serviceTypes[curr.service_type] =
                (serviceTypes[curr.service_type] || 0) + 1;

            // Figma Status Count
            if (curr.figma_connected) {
                totalConnected++;
            } else {
                totalNotConnected++;
            }
        });

        // 색상 팔레트 (Tailwind Colors)
        const typeColors: Record<string, string> = {
            "PC Web": "#6366F1", // Indigo 500
            "Mobile Web": "#3B82F6", // Blue 500
            "Mobile App": "#EC4899", // Pink 500
            Tablet: "#8B5CF6", // Violet 500
            Default: "#9CA3AF", // Gray 400
        };

        // Inner Data (Service Types)
        const innerData = Object.entries(serviceTypes).map(([name, y]) => ({
            name,
            y,
            color: typeColors[name] || typeColors["Default"],
        }));

        // Outer Data (Figma Status)
        const outerData = [
            {
                name: "연동",
                y: totalConnected,
                color: "#059669", // Emerald Dark
            },
            {
                name: "미연동",
                y: totalNotConnected,
                color: "#E5E7EB", // Gray Light
            },
        ].filter((d) => d.y > 0);

        projectCompositionOptions.value = {
            chart: {
                type: "pie",
                backgroundColor: "transparent",
                style: {fontFamily: "Inter, sans-serif"},
                spacing: [10, 10, 10, 10], // 여백 확보
            },
            title: {
                text: "프로젝트 타입 및 피그마 연동",
                align: "left",
                style: {fontSize: "16px", fontWeight: "600"},
            },
            credits: {enabled: false},
            plotOptions: {
                pie: {
                    shadow: false,
                    center: ["50%", "50%"],
                    dataLabels: {enabled: true},
                    borderWidth: 2,
                    borderColor: "#ffffff",
                },
            },
            series: [
                {
                    name: "Service Type",
                    data: innerData,
                    size: "60%", // 50% -> 60% (내부 원 살짝 키움)
                    tooltip: {
                        pointFormat:
                            "<b>프로젝트 타입 : {point.name}</b><br>{point.y} 개 ({point.percentage:.1f}%)",
                    },
                    dataLabels: {
                        formatter: function (this: any) {
                            // 데이터가 너무 작으면 숨김 (예: 1개 이하)
                            return this.y > 0 ? this.point.name : null;
                        },
                        color: "#ffffff",
                        distance: -40,
                        style: {
                            textOutline: "none",
                            fontWeight: "500",
                            fontSize: "11px",
                        },
                    },
                },
                {
                    name: "Figma Status",
                    data: outerData,
                    size: "85%", // 80% -> 85% (외부 링)
                    innerSize: "65%", // 내부 구멍 크기
                    tooltip: {
                        pointFormat:
                            "<b>피그마 : {point.name}</b><br>{point.y} 개 ({point.percentage:.1f}%)",
                    },
                    dataLabels: {
                        formatter: function (this: any) {
                            return `<b>${this.point.name}</b>`;
                        },
                        distance: 15, // 라벨 거리 조절 (잘림 방지)
                        filter: {
                            property: "y",
                            operator: ">",
                            value: 0,
                        },
                        style: {
                            fontWeight: "normal",
                            color: "#374151",
                            fontSize: "11px",
                        },
                    },
                },
            ],
        };

        // 2. 아티팩트 보유 현황 (Column Chart)
        const artifactCounts = stats.projects_stats.reduce(
            (acc: Record<string, number>, curr: any) => {
                if (curr.artifact_stats) {
                    Object.entries(curr.artifact_stats).forEach(
                        ([key, value]) => {
                            acc[key] = (acc[key] || 0) + (value as number);
                        }
                    );
                }
                return acc;
            },
            {} as Record<string, number>
        );

        const categories = Object.keys(artifactCounts);
        const data = Object.values(artifactCounts);

        projectArtifactOptions.value = {
            chart: {
                type: "column",
                backgroundColor: "transparent",
                style: {fontFamily: "Inter, sans-serif"},
            },
            title: {
                text: "아티팩트 보유 현황",
                align: "left",
                style: {fontSize: "16px", fontWeight: "600"},
            },
            xAxis: {
                categories: categories,
                crosshair: true,
                accessibility: {description: "Artifact Types"},
            },
            yAxis: {
                min: 0,
                title: {text: "Count"},
            },
            tooltip: {valueSuffix: " 개"},
            plotOptions: {
                column: {pointPadding: 0.2, borderWidth: 0, borderRadius: 4},
            },
            series: [
                {
                    name: "Artifacts",
                    data: data,
                    color: "#8B5CF6", // Violet
                },
            ],
            credits: {enabled: false},
        };
    };

    return {
        projectCompositionOptions,
        projectArtifactOptions,
        updateProjectCharts,
    };
};
