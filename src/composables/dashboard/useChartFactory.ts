export const useChartFactory = () => {
    const createChartOptions = (
        type: string,
        title: string,
        categories: string[],
        series: any[],
        colors: string[] = ["#2563EB", "#10B981", "#F59E0B", "#EF4444"]
    ) => {
        return {
            chart: {
                type,
                backgroundColor: "transparent",
                style: {fontFamily: "Inter, sans-serif"},
                spacingTop: 30,
            },
            title: {
                text: title,
                align: "left",
                style: {fontSize: "16px", fontWeight: "600", color: "#111827"},
                margin: 30,
            },
            xAxis: {
                categories,
                crosshair: true,
                labels: {style: {color: "#6B7280"}},
            },
            yAxis: {
                min: 0,
                title: {text: null},
                labels: {style: {color: "#6B7280"}},
                gridLineColor: "#F3F4F6",
            },
            tooltip: {
                shared: true,
                useHTML: true,
                borderRadius: 8,
                borderColor: "#E5E7EB",
                shadow: true,
            },
            plotOptions: {
                column: {borderRadius: 6, pointPadding: 0.2},
                series: {animation: {duration: 1000}},
                pie: {
                    innerSize: "60%",
                    dataLabels: {
                        enabled: true,
                        format: "<b>{point.name}</b>: {point.percentage:.1f} %",
                    },
                    showInLegend: true,
                },
            },
            colors,
            series,
            credits: {enabled: false},
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
        };
    };

    return {createChartOptions};
};
