import {ref} from "vue";
import type {DashboardStats} from "../../types/dashboard.js";

export const useProjectCharts = () => {
    const projectCompositionOptions = ref({});
    const projectArtifactOptions = ref({});
    const projectFeatureOptions = ref({});

    const updateProjectCharts = (stats: any) => {
        // 초기화
        projectCompositionOptions.value = {};
        projectArtifactOptions.value = {};
        projectFeatureOptions.value = {};

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

        // 색상 팔레트 (Refined for Cohesion)
        const typeColors: Record<string, string> = {
            "PC Web": "#3B82F6", // Blue 500
            "Mobile Web": "#6366F1", // Indigo 500
            "Mobile App": "#0EA5E9", // Sky 500
            Tablet: "#F59E0B", // Amber 500
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
                name: "피그마 - 연동",
                y: totalConnected,
                color: "#10B981", // Emerald 500 (Matches 'Active/Success')
            },
            {
                name: "피그마 - 미연동",
                y: totalNotConnected,
                color: "#94A3B8", // Slate 400 (Matches 'Inactive')
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
                    color: "#3B82F6", // Blue 500 (Matches 'Generated')
                },
            ],
            credits: {enabled: false},
        };

        // 3. 주요 기능 워드 클라우드 (Word Cloud)
        if (stats.project_features && stats.project_features.length > 0) {
            const featureCounts = stats.project_features.reduce(
                (acc: Record<string, number>, curr: string) => {
                    acc[curr] = (acc[curr] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>
            );

            const featureData = Object.entries(featureCounts)
                .map(([name, weight]) => ({
                    name,
                    weight,
                }))
                .sort((a: any, b: any) => b.weight - a.weight); // 빈도수 내림차순 정렬

            projectFeatureOptions.value = {
                chart: {
                    type: "wordcloud",
                    backgroundColor: "transparent",
                    style: {fontFamily: "Inter, sans-serif"},
                },
                title: {
                    text: "프로젝트 주요 기능 키워드",
                    align: "left",
                    style: {fontSize: "16px", fontWeight: "600"},
                },
                series: [
                    {
                        type: "wordcloud",
                        data: featureData,
                        name: "Occurrences",
                        colors: [
                            "#3B82F6", // Blue 500
                            "#10B981", // Emerald 500
                            "#6366F1", // Indigo 500
                            "#F59E0B", // Amber 500
                            "#0EA5E9", // Sky 500
                            "#8B5CF6", // Violet 500
                        ],
                        minFontSize: 12,
                        maxFontSize: 24, // 너무 크지 않게 조절
                        rotation: {
                            from: 0,
                            to: 0, // 가로 정렬만 허용 (가독성 위해)
                            orientations: 1,
                        },
                    },
                ],
                tooltip: {
                    headerFormat:
                        '<span style="font-size: 10px">{point.key}</span><br/>',
                    pointFormat: "<b>{point.weight}</b> projects",
                },
                credits: {enabled: false},
            };
        }
    };

    return {
        projectCompositionOptions,
        projectArtifactOptions,
        projectFeatureOptions,
        updateProjectCharts,
    };
};
