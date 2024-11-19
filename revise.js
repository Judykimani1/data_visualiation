// First, ensure you have this HTML structure
`
<!DOCTYPE html>
<html>
<head>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        .chart-container {
            margin: 20px;
            height: 400px;
        }
        .tooltip {
            position: absolute;
            background: white;
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="filters">
        <select id="genre"></select>
        <select id="artist"></select>
        <input type="date" id="start-date">
        <input type="date" id="end-date">
        <button id="reset-filters">Reset Filters</button>
    </div>
    <div id="line-chart" class="chart-container"></div>
    <div id="bar-chart" class="chart-container"></div>
    <div id="pie-chart" class="chart-container"></div>
    <div id="scatter-plot" class="chart-container"></div>
    <div id="heatmap" class="chart-container"></div>
</body>
</html>
`

// Modified createLineChart function with working updates
function createLineChart(data) {
    // Clear existing content
    d3.select("#line-chart").html("");

    const svg = d3.select("#line-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.released_date)))
        .range([0, INNER_WIDTH]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.streams)])
        .range([INNER_HEIGHT, 0]);

    // Add axes with classes
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${INNER_HEIGHT})`)
        .call(d3.axisBottom(x).ticks(5))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // Add line with class
    const line = d3.line()
        .x(d => x(new Date(d.released_date)))
        .y(d => y(d.streams))
        .curve(d3.curveMonotoneX);

    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "#22C55E")
        .attr("stroke-width", 2)
        .attr("d", line);

    return {
        update: function(filteredData) {
            const t = d3.transition().duration(750);

            // Update scales
            x.domain(d3.extent(filteredData, d => new Date(d.released_date)));
            y.domain([0, d3.max(filteredData, d => d.streams)]);

            // Update line
            svg.select(".line")
                .datum(filteredData)
                .transition(t)
                .attr("d", line);

            // Update axes
            svg.select(".x-axis")
                .transition(t)
                .call(d3.axisBottom(x).ticks(5));

            svg.select(".y-axis")
                .transition(t)
                .call(d3.axisLeft(y));
        }
    };
}

// Modified loadData function with better error handling
async function loadData() {
    try {
        const response = await fetch("./data/smss.csv");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        const data = d3.csvParse(text);

        if (!data || data.length === 0) {
            throw new Error("No data loaded");
        }

        // Process data
        return data.map(d => ({
            track_name: d.track_name,
            artist_name: d.artist_name,
            released_date: parseDate(d.released_date),
            streams: +d.streams,
            duration_ms: +d.duration_ms,
            genre: d.genre || 'Unknown',
            duration_min: (+d.duration_ms / 60000).toFixed(2)
        }));
    } catch (error) {
        console.error("Error loading data:", error);
        // Use sample data as fallback
        return SAMPLE_DATA.map(d => ({
            ...d,
            released_date: parseDate(d.released_date)
        }));
    }
}

// Modified initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        const data = await loadData();
        if (!data || data.length === 0) {
            throw new Error("No data available");
        }

        const charts = {
            lineChart: createLineChart(data),
            barChart: createBarChart(data),
            pieChart: createPieChart(data),
            scatterPlot: createScatterPlot(data),
            heatmap: createHeatmap(data)
        };

        setupFilters(data, charts);
        makeChartsResponsive(charts);
        hideLoading();
    } catch (error) {
        console.error("Dashboard initialization failed:", error);
        document.querySelectorAll('.chart-container').forEach(container => {
            container.innerHTML = `
                <div class="text-red-500 text-center">
                    <p>Error loading dashboard</p>
                    <p class="text-sm">${error.message}</p>
                </div>
            `;
        });
    }
});