import * as d3 from 'd3';

// Constants for chart dimensions and margins
const MARGIN = { top: 40, right: 30, bottom: 60, left: 60 };
const CHART_WIDTH = 600;
const CHART_HEIGHT = 400;
const INNER_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const INNER_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

// Utility functions

const formatDate = d3.timeFormat("%Y-%m-%d");
const parseDate = d3.timeParse("%Y-%m-%d");

// Loading state handling functions - Define these BEFORE they're used
function showLoading() {
    document.querySelectorAll('.chart-container').forEach(container => {
        container.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        `;
    });
}

function hideLoading() {
    document.querySelectorAll('.chart-container').forEach(container => {
        const loader = container.querySelector('div');
        if (loader) {
            loader.remove();
        }
    });
}

// Sample dataset structure
const SAMPLE_DATA = [
    {
        "track_name": "Shape of You",
        "artist_name": "Ed Sheeran",
        "released_date": "2017-01-06",
        "streams": 3270283771,
        "duration_ms": 233713,
        "genre": "pop"
    },
    {
        "track_name": "Blinding Lights",
        "artist_name": "The Weeknd",
        "released_date": "2019-11-29",
        "streams": 3024354847,
        "duration_ms": 200040,
        "genre": "pop"
    }
];

// Error handling wrapper for data loading
async function loadData() {
    try {
        // First try loading from local CSV
        let data = await d3.csv("./data/smss.csv").catch(() => null);

        // If local CSV fails, try loading from GitHub
        if (!data) {
            console.log("Local CSV not found, trying GitHub source...");
            data = await d3.csv("https://github.com/Judykimani1/data_visualization/blob/master/data/smss.csv");
        }

        // If both fail, use sample data
        if (!data || data.length === 0) {
            console.log("Using sample data as fallback");
            data = SAMPLE_DATA;
        }

        // Process data
        return data.map(d => ({
            track_name: d.track_name,
            artist_name: d.artist_name,
            released_date: parseDate(d.released_date) || new Date(d.released_date),
            streams: +d.streams,
            duration_ms: +d.duration_ms,
            genre: d.genre || 'Unknown',
            duration_min: (+d.duration_ms / 60000).toFixed(2)
        }));
    } catch (error) {
        console.error("Error loading data:", error);
        return SAMPLE_DATA.map(d => ({
            ...d,
            released_date: parseDate(d.released_date) || new Date(d.released_date),
            duration_min: (+d.duration_ms / 60000).toFixed(2)
        }));
    }
}

// Utility function for debouncing resize events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function makeChartsResponsive(charts) {
    function updateChartDimensions() {
        const chartContainers = document.querySelectorAll('.chart-container');
        chartContainers.forEach(container => {
            const width = container.clientWidth;
            const height = Math.min(width * 0.6, 400);

            const svg = container.querySelector('svg');
            if (svg) {
                svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);

                //use charts parameter to update specific chart layouts
                const chartKeys = Object.keys(charts);
                if (chartKeys[0]) {
                    charts[chartKeys[0]].resize(width, height);
                }
            }
        });
    }

    window.addEventListener('resize', debounce(updateChartDimensions, 250));
    updateChartDimensions();
}

// Initialize dashboard
async function initDashboard() {
    try {
        showLoading();
        const data = await loadData();

        if (!data) {
            throw new Error("No data available");
        }

        // Initialize all charts
        const charts = {
            lineChart: createLineChart(data),
            barChart: createBarChart(data),
            pieChart: createPieChart(data),
            scatterPlot: createScatterPlot(data),
            heatmap: createHeatmap(data)
        };

        // Set up filter listeners
        setupFilters(data, charts);

        // Make charts responsive
        makeChartsResponsive(charts);

        hideLoading();
    } catch (error) {
        console.error("Dashboard initialization failed:", error);
        hideLoading();
        document.querySelectorAll('.chart-container').forEach(container => {
            container.innerHTML = '<p class="text-red-500">Error initializing dashboard. Please try again later.</p>';
        });
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

function createLineChart(data) {
    const svg = d3.select("#line-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.released_year, 0)))
        .range([0, INNER_WIDTH]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.streams)])
        .range([INNER_HEIGHT, 0]);

    // Add line
    const line = d3.line()
        .x(d => x(new Date(d.released_year, 0)))
        .y(d => y(d.streams))
        .curve(d3.curveMonotoneX);

    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "#22C55E")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Add axes
    svg.append("g")
        .attr("transform", `translate(0,${INNER_HEIGHT})`)
        .call(d3.axisBottom(x).ticks(5))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g")
        .call(d3.axisLeft(y));

    // Add titles
    svg.append("text")
        .attr("x", INNER_WIDTH / 2)
        .attr("y", -MARGIN.top / 2)
        .attr("text-anchor", "middle")
        .text("Streaming Trends Over Time")
        .attr("class", "text-lg font-semibold");

    // Add tooltips
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("padding", "10px")
        .style("border-radius", "5px");

    // Add interactive dots
    svg.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(new Date(d.released_year, 0)))
        .attr("cy", d => y(d.streams))
        .attr("r", 5)
        .style("opacity", 0)
        .on("mouseover", function(event, d) {
            d3.select(this).style("opacity", 1);
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Year: ${d.released_year}<br/>Streams: ${d3.format(",")(d.streams)}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).style("opacity", 0);
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    return {
        update: function(filteredData) {
            // Update the visualization with filtered data
            const t = d3.transition().duration(750);

            // Update scales
            x.domain(d3.extent(filteredData, d => new Date(d.released_year, 0)));
            y.domain([0, d3.max(filteredData, d => d.streams)]);

            // Update line
            svg.select(".line")
                .transition(t)
                .attr("d", line(filteredData));

            // Update axes
            svg.select(".x-axis").transition(t).call(d3.axisBottom(x));
            svg.select(".y-axis").transition(t).call(d3.axisLeft(y));
        }
    };
}

function createBarChart(data) {

    // Grouped data by artist
    const artistData = d3.rollup(data,
        v => d3.sum(v, d => d.streams),
        d => d.artist_name
    );

    const sortedArtists = Array.from(artistData.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const svg = d3.select("#bar-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const x = d3.scaleBand()
        .domain(sortedArtists.map(d => d[0]))
        .range([0, INNER_WIDTH])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(sortedArtists, d => d[1])])
        .range([INNER_HEIGHT, 0]);

    // Add bars
    svg.selectAll(".bar")
        .data(sortedArtists)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[0]))
        .attr("y", d => y(d[1]))
        .attr("width", x.bandwidth())
        .attr("height", d => INNER_HEIGHT - y(d[1]))
        .attr("fill", "#22C55E");

    // Add axes
    svg.append("g")
        .attr("transform", `translate(0,${INNER_HEIGHT})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g")
        .call(d3.axisLeft(y));

    return {
        update: function(filteredData) {
            // implement the update logic
            const artistData = d3.rollup(filteredData,
                v => d3.sum(v, d => d.streams),
                d => d.artist_name
            );

            const sortedArtists = Array.from(artistData.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

                // Update scales
                x.domain(sortedArtists.map(d => d[0]));
                y.domain([0, d3.max(sortedArtists, d => d[1])]);

                // Update bars
                const bars = svg.selectAll(".bar")
                    .data(sortedArtists);

                bars.exit().remove();

                bars.enter()
                    .append("rect")
                    .attr("class", "bar")
                    .merge(bars)
                    .attr("x", d => x(d[0]))
                    .attr("y", d => y(d[1]))
                    .attr("width", x.bandwidth())
                    .attr("height", d => INNER_HEIGHT - y(d[1]))
                    .attr("fill", "#22C55E");
        }
    };
}

function createPieChart(data) {
    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2;

    const genreData = d3.rollup(data,
        v => v.length,
        d => d.genre || 'Unknown'
    );

    const pieData = Array.from(genreData.entries());

    const svg = d3.select("#pie-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${width/2},${height/2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie()
        .value(d => d[1])
        .sort(null);

    const arc = d3.arc()
        .innerRadius(radius * 0.3)
        .outerRadius(radius * 0.8);

    const outerArc = d3.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9);

    // Add the arcs
    const paths = svg.selectAll('path')
        .data(pie(pieData))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data[0]))
        .attr('stroke', 'white')
        .style('stroke-width', '2px');

    // Add labels
    const labels = svg.selectAll('text')
        .data(pie(pieData))
        .enter()
        .append('text')
        .attr('transform', d => {
            const pos = outerArc.centroid(d);
            return `translate(${pos})`;
        })
        .style('text-anchor', 'middle')
        .text(d => d.data[0]);

    return {
        update: function(filteredData) {
            // implement the update logic
            const updateGenreData = d3.rollup(filteredData,
                v => v.length,
                d => d.genre || 'Unknown'
            );

            const updatePieData = Array.from(updateGenreData.entries());

            //update paths
            paths.data(pie(updatePieData))
                .transition()
                .duration(750)
                .attr('d', arc);

            //update labels
            labels.data(pie(updatePieData))
                .transition()
                .duration(750)
                .attr('transform', d => {
                    const pos = outerArc.centroid(d);
                    return `translate(${pos})`;
                })
                .text(d => d.data[0]);
        }
    };
}

function createScatterPlot(data) {
    const svg = d3.select("#scatter-plot")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.length)])
        .range([0, INNER_WIDTH]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.streams)])
        .range([INNER_HEIGHT, 0]);

    // Add dots
    svg.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.length))
        .attr("cy", d => y(d.streams))
        .attr("r", 4)
        .style("fill", "#22C55E")
        .style("opacity", 0.6);

    // Add axes
    svg.append("g")
        .attr("transform", `translate(0,${INNER_HEIGHT})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .call(d3.axisLeft(y));

    return {
        update: function(filteredData) {
            // update scales
            x.domain([0, d3.max(filteredData, d => d.length)]);
            y.domain([0, d3.max(filteredData, d => d.streams)]);

            // update dots
            const dots = svg.selectAll(".dot")
                .data(filteredData);

            dots.exit().remove();

            dots.enter()
                .append("circle")
                .attr("class", "dot")
                .merge(dots)
                .transition()
                .duration(750)
                .attr("cx", d => x(d.length))
                .attr("cy", d => y(d.streams))
                .attr("r", 4)
                .style("fill", "#22C55E")
                .style("opacity", 0.6);
        }
    };
}

function createHeatmap(data) {
    // Group data by month and genre
    const months = d3.range(12);
    const genres = Array.from(new Set(data.map(d => d.genre)));

    // Create heatmap data structure
    const heatmapData = [];
    genres.forEach(genre => {
        months.forEach(month => {
            const streams = data
                .filter(d => d.genre === genre && new Date(d.released_date).getMonth() === month)
                .reduce((sum, d) => sum + d.streams, 0);
            heatmapData.push({
                genre,
                month,
                streams
            });
        });
    });

    const svg = d3.select("#heatmap")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const x = d3.scaleBand()
        .domain(months)
        .range([0, INNER_WIDTH])
        .padding(0.1);

    const y = d3.scaleBand()
        .domain(genres)
        .range([0, INNER_HEIGHT])
        .padding(0.1);

    const color = d3.scaleSequential()
        .domain([0, d3.max(heatmapData, d => d.streams)])
        .interpolator(d3.interpolateGreens);

    // Add cells
    svg.selectAll("rect")
        .data(heatmapData)
        .enter()
        .append("rect")
        .attr("x", d => x(d.month))
        .attr("y", d => y(d.genre))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => color(d.streams));

    // Add axes
    svg.append("g")
        .attr("transform", `translate(0,${INNER_HEIGHT})`)
        .call(d3.axisBottom(x)
            .tickFormat(m => d3.timeFormat("%b")(new Date(2024, m))));

    svg.append("g")
        .call(d3.axisLeft(y));

    return {
        update: function(filteredData) {
            // implement update logic
            const updatedHeatmapData = [];
            genres.forEach(genre => {
                months.forEach(month => {
                    const streams = filteredData
                        .filter(d => d.genre === genre && new Date(d.released_date).getMonth() === month)
                        .reduce((sum, d) => sum + d.streams, 0);
                    updatedHeatmapData.push({
                        genre,
                        month,
                        streams
                    });
                });
            });

            //update color scale
            color.domain([0, d3.max(updatedHeatmapData, d => d.streams)]);

            // update cells
            svg.selectAll("rect")
                .data(updatedHeatmapData)
                .transition()
                .duration(750)
                .style("fill", d => color(d.streams));
            }
        }
    };


function setupFilters(data, charts) {
    // Genre filter
    const genreSelect = document.getElementById('genre');
    const genres = ['All Genres', ...new Set(data.map(d => d.genre))].sort();
    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreSelect.appendChild(option);
    });

    // Artist filter
    const artistSelect = document.getElementById('artist');
    const artists = ['All Artists', ...new Set(data.map(d => d.artist_name))].sort();
    artists.forEach(artist => {
        const option = document.createElement('option');
        option.value = artist;
        option.textContent = artist;
        artistSelect.appendChild(option);
    });

    // Date range inputs
    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');
    const dates = data.map(d => d.released_date).sort(d3.ascending);
    startDate.value = formatDate(dates[0]);
    endDate.value = formatDate(dates[dates.length - 1]);

    // Filter change handler
    function handleFilterChange() {
        const selectedGenre = genreSelect.value;
        const selectedArtist = artistSelect.value;
        const startDateVal = parseDate(startDate.value);
        const endDateVal = parseDate(endDate.value);

        const filteredData = data.filter(d => {
            const genreMatch = selectedGenre === 'All Genres' || d.genre === selectedGenre;
            const artistMatch = selectedArtist === 'All Artists' || d.artist_name === selectedArtist;
            const dateMatch = d.released_date >= startDateVal && d.released_date <= endDateVal;
            return genreMatch && artistMatch && dateMatch;
        });

        // Update all charts with filtered data
        Object.values(charts).forEach(chart => chart.update(filteredData));
    }

    // Add event listeners
    genreSelect.addEventListener('change', handleFilterChange);
    artistSelect.addEventListener('change', handleFilterChange);
    startDate.addEventListener('change', handleFilterChange);
    endDate.addEventListener('change', handleFilterChange);

    // Reset filters button
    document.getElementById('reset-filters').addEventListener('click', () => {
        genreSelect.value = 'All Genres';
        artistSelect.value = 'All Artists';
        startDate.value = formatDate(dates[0]);
        endDate.value = formatDate(dates[dates.length - 1]);
        handleFilterChange();
    });
}