import * as d3 from 'd3';

// Constants for chart dimensions and margins
const MARGIN = { top: 20, right: 20, bottom: 30, left: 40 };
const CHART_WIDTH = 400;
const CHART_HEIGHT = 400;
const INNER_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const INNER_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

// Utility functions
const formatDate = d3.timeFormat("%Y-%m-%d");
const parseDate = d3.timeParse("%Y-%m-%d");

// Loading state handling functions
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

// Error handling wrapper for data loading
async function loadData() {
    try {
        const response = await fetch("./data/smss.csv");
        const csvData = await response.text();

        const data = d3.csvParse(csvData, d => ({
            track_name: d.track_name,
            artist_name: d['artist(s)_name'],
            released_date: parseDate(d.released_year + '-' + d.released_month + '-' + d.released_day),
            streams: +d.streams,
            duration_ms: +d.duration_ms,
            genre: d.genre || 'Unknown',
            danceability: +d['danceability_%'],
            valence: +d['valence_%'],
            energy: +d['energy_%'],
            acousticness: +d['acousticness_%'],
            instrumentalness: +d['instrumentalness_%'],
            liveness: +d['liveness_%'],
            speechiness: +d['speechiness_%']
        }));

        return data;
    } catch (error) {
        console.error("Error loading data:", error);
        return [];
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

                const chartId = container.id;
                if (charts[chartId] && typeof charts[chartId].resize === 'function') {
                    charts[chartId].resize(width, height);
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

        if (!data || data.length === 0) {
            throw new Error("No data available");
        }

        // Initialize all charts
        const charts = {
            lineChart: createLineChart(data),
            barChart: createBarChart(data),
            pieChart: createPieChart(data),
            scatterPlot: createScatterPlot(data),
            heatmap: createHeatmap(data),
            bubbleChart: createBubbleChart(data),
            spiderChart: createSpiderChart(data),
            radarChart: createRadarChart(data)
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

// Function to setup filters with dynamic dropdown population
function setupFilters(data, charts) {
    // Get references to dropdown elements
    const genreSelect = document.getElementById('genre');
    const artistSelect = document.getElementById('artist');
    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');

    // Clear existing options first (to prevent duplicates on multiple calls)
    genreSelect.innerHTML = '';
    artistSelect.innerHTML = '';

    // Create unique, sorted genre options with counts
    const genreCounts = data.reduce((acc, d) => {
        acc[d.genre] = (acc[d.genre] || 0) + 1;
        return acc;
    }, {});

    const genres = Object.keys(genreCounts).sort((a, b) =>
        genreCounts[b] - genreCounts[a] // Sort by descending count
    );

    // Create unique, sorted artist options with counts
    const artistCounts = data.reduce((acc, d) => {
        acc[d.artist_name] = (acc[d.artist_name] || 0) + 1;
        return acc;
    }, {});

    const artists = Object.keys(artistCounts).sort((a, b) =>
        artistCounts[b] - artistCounts[a] // Sort by descending count
    );

    // Add default "All" options first
    const addDefaultOption = (select, defaultText) => {
        const defaultOption = document.createElement('option');
        defaultOption.value = defaultText;
        defaultOption.textContent = defaultText;
        select.appendChild(defaultOption);
    };

    addDefaultOption(genreSelect, 'All Genres');
    addDefaultOption(artistSelect, 'All Artists');

    // Populate genre dropdown with options and track counts
    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = `${genre} (${genreCounts[genre]})`;
        genreSelect.appendChild(option);
    });

    // Populate artist dropdown with options and track counts
    artists.forEach(artist => {
        const option = document.createElement('option');
        option.value = artist;
        option.textContent = `${artist} (${artistCounts[artist]})`;
        artistSelect.appendChild(option);
    });

    const dates = data.map(d => d.released_date).sort(d3.ascending);
    startDate.value = formatDate(dates[0]);
    endDate.value = formatDate(dates[dates.length - 1]);

    // Filtering logic
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

// Implement the new chart functions
function createBubbleChart(data) {
    const svg = d3.select("#bubble-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const x = d3.scaleLinear().range([0, INNER_WIDTH]);
    const y = d3.scaleLinear().range([INNER_HEIGHT, 0]);
    const size = d3.scaleLinear().range([4, 40]);
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    function updateChart(filteredData) {
        const artistData = d3.rollup(filteredData,
            v => ({
                totalStreams: d3.sum(v, d => d.streams),
                avgDanceability: d3.mean(v, d => d.danceability),
                songCount: v.length
            }),
            d => d.artist_name
        );

        const bubbleData = Array.from(artistData, ([name, values]) => ({
            name,
            ...values
        })).sort((a, b) => b.totalStreams - a.totalStreams).slice(0, 20);

        x.domain([0, d3.max(bubbleData, d => d.avgDanceability)]);
        y.domain([0, d3.max(bubbleData, d => d.totalStreams)]);
        size.domain([0, d3.max(bubbleData, d => d.songCount)]);

        const bubbles = svg.selectAll(".bubble")
            .data(bubbleData, d => d.name);

        bubbles.exit().remove();

        bubbles.enter()
            .append("circle")
            .attr("class", "bubble")
            .merge(bubbles)
            .transition()
            .duration(1000)
            .attr("cx", d => x(d.avgDanceability))
            .attr("cy", d => y(d.totalStreams))
            .attr("r", d => size(d.songCount))
            .attr("fill", d => color(d.name))
            .attr("opacity", 0.7);

        svg.selectAll(".bubble-label")
            .data(bubbleData, d => d.name)
            .join("text")
            .attr("class", "bubble-label")
            .attr("x", d => x(d.avgDanceability))
            .attr("y", d => y(d.totalStreams))
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(d => d.name)
            .style("font-size", "10px")
            .style("fill", "white");

        svg.selectAll(".axis").remove();

        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${INNER_HEIGHT})`)
            .call(d3.axisBottom(x).ticks(5));

        svg.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y).ticks(5));

        svg.append("text")
            .attr("class", "axis-label")
            .attr("x", INNER_WIDTH / 2)
            .attr("y", INNER_HEIGHT + MARGIN.bottom - 10)
            .style("text-anchor", "middle")
            .text("Average Danceability");

        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -INNER_HEIGHT / 2)
            .attr("y", -MARGIN.left + 20)
            .style("text-anchor", "middle")
            .text("Total Streams");
    }

    updateChart(data);

    return {
        update: updateChart
    };
}

function createSpiderChart(data) {
    const svg = d3.select("#spider-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${CHART_WIDTH/2},${CHART_HEIGHT/2})`);

    const features = ["danceability", "valence", "energy", "acousticness", "instrumentalness", "liveness", "speechiness"];
    const radialScale = d3.scaleLinear().domain([0, 100]).range([0, INNER_WIDTH/2]);
    const angleSlice = Math.PI * 2 / features.length;

    function getPathCoordinates(dataPoint){
        return features.map((feature, i) => {
            const angle = angleSlice * i;
            return {
                x: radialScale(dataPoint[feature]) * Math.cos(angle - Math.PI/2),
                y: radialScale(dataPoint[feature]) * Math.sin(angle - Math.PI/2)
            };
        });
    }

    function updateChart(filteredData) {
        const averageData = features.reduce((acc, feature) => {
            acc[feature] = d3.mean(filteredData, d => d[feature]);
            return acc;
        }, {});

        svg.selectAll("*").remove();

        // Draw circular grid
        const circles = [20, 40, 60, 80, 100];
        svg.selectAll(".circular-grid")
            .data(circles)
            .enter()
            .append("circle")
            .attr("class", "circular-grid")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", d => radialScale(d))
            .attr("fill", "none")
            .attr("stroke", "gray")
            .attr("stroke-dasharray", "4 4");

        // Draw axis
        features.forEach((feature, i) => {
            const angle = angleSlice * i - Math.PI/2;
            const lineCoords = {
                x2: radialScale(100) * Math.cos(angle),
                y2: radialScale(100) * Math.sin(angle)
            };

            svg.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", lineCoords.x2)
                .attr("y2", lineCoords.y2)
                .attr("stroke", "gray");

            svg.append("text")
                .attr("x", lineCoords.x2 * 1.1)
                .attr("y", lineCoords.y2 * 1.1)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .text(feature);
        });

        // Draw spider chart
        const lineGenerator = d3.line()
            .x(d => d.x)
            .y(d => d.y);

        const coordinates = getPathCoordinates(averageData);

        svg.append("path")
            .datum(coordinates)
            .attr("d", lineGenerator)
            .attr("stroke-width", 3)
            .attr("stroke", "rgba(34, 197, 94, 0.7)")
            .attr("fill", "rgba(34, 197, 94, 0.2)")
            .attr("stroke-linejoin", "round");
    }

    updateChart(data);

    return {
        update: updateChart
    };
}

function createRadarChart(data) {
    const svg = d3.select("#radar-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${CHART_WIDTH/2},${CHART_HEIGHT/2})`);

    const features = ["danceability", "valence", "energy", "acousticness", "instrumentalness", "liveness", "speechiness"];

    const radialScale = d3.scaleLinear().domain([0, 100]).range([0, INNER_WIDTH/2]);
    const angleSlice = Math.PI * 2 / features.length;
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    function getPathCoordinates(dataPoint){
        return features.map((feature, i) => {
            const angle = angleSlice * i;
            return {
                x: radialScale(dataPoint[feature]) * Math.cos(angle - Math.PI/2),
                y: radialScale(dataPoint[feature]) * Math.sin(angle - Math.PI/2)
            };
        });
    }

    function updateChart(filteredData) {
        const genreData = d3.group(filteredData, d => d.genre);
        const topGenres = Array.from(genreData, ([genre, songs]) => ({
            genre,
            totalStreams: d3.sum(songs, s => s.streams)
        }))
        .sort((a, b) => b.totalStreams - a.totalStreams)
        .slice(0, 5)
        .map(d => d.genre);

        const averageData = topGenres.map(genre => {
            const genreSongs = genreData.get(genre);
            return {
                genre,
                ...features.reduce((acc, feature) => {
                    acc[feature] = d3.mean(genreSongs, d => d[feature]);
                    return acc;
                }, {})
            };
        });

        svg.selectAll("*").remove();

        // Draw circular grid
        const circles = [20, 40, 60, 80, 100];
        svg.selectAll(".circular-grid")
            .data(circles)
            .enter()
            .append("circle")
            .attr("class", "circular-grid")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", d => radialScale(d))
            .attr("fill", "none")
            .attr("stroke", "gray")
            .attr("stroke-dasharray", "4 4");

        // Draw axis
        features.forEach((feature, i) => {
            const angle = angleSlice * i - Math.PI/2;
            const lineCoords = {
                x2: radialScale(100) * Math.cos(angle),
                y2: radialScale(100) * Math.sin(angle)
            };

            svg.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", lineCoords.x2)
                .attr("y2", lineCoords.y2)
                .attr("stroke", "gray");

            svg.append("text")
                .attr("x", lineCoords.x2 * 1.1)
                .attr("y", lineCoords.y2 * 1.1)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .text(feature);
        });

        // Draw radar chart for each genre
        const lineGenerator = d3.line()
            .x(d => d.x)
            .y(d => d.y);

        averageData.forEach((genreData, i) => {
            const coordinates = getPathCoordinates(genreData);

            svg.append("path")
                .datum(coordinates)
                .attr("d", lineGenerator)
                .attr("stroke-width", 2)
                .attr("stroke", color(i))
                .attr("fill", color(i))
                .attr("fill-opacity", 0.1)
                .attr("stroke-linejoin", "round");
        });

        // Add legend
        const legend = svg.selectAll(".legend")
            .data(averageData)
            .enter()
            .append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(${INNER_WIDTH/2 + 20}, ${-INNER_HEIGHT/2 + 20 + i * 20})`);

        legend.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", (d, i) => color(i));

        legend.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .text(d => d.genre)
            .style("font-size", "12px")
            .attr("alignment-baseline", "middle");
    }

    updateChart(data);

    return {
        update: updateChart
    };
}

// Update existing chart functions to use the new data structure
function createLineChart(data) {
    const svg = d3.select("#line-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const x = d3.scaleTime().range([0, INNER_WIDTH]);
    const y = d3.scaleLinear().range([INNER_HEIGHT, 0]);

    function updateChart(filteredData) {
        const streamsByDate = d3.rollup(filteredData,
            v => d3.sum(v, d => d.streams),
            d => d3.timeYear(d.released_date)
        );

        const lineData = Array.from(streamsByDate, ([date, streams]) => ({date, streams}))
            .sort((a, b) => a.date - b.date);

        x.domain(d3.extent(lineData, d => d.date));
        y.domain([0, d3.max(lineData, d => d.streams)]);

        svg.selectAll("*").remove();

        svg.append("g")
            .attr("transform", `translate(0,${INNER_HEIGHT})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y));

        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.streams));

        svg.append("path")
            .datum(lineData)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", line);
    }

    updateChart(data);

    return {
        update: updateChart
    };
}

function createBarChart(data) {
    const svg = d3.select("#bar-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const x = d3.scaleBand().range([0, INNER_WIDTH]).padding(0.1);
    const y = d3.scaleLinear().range([INNER_HEIGHT, 0]);

    function updateChart(filteredData) {
        const artistStreams = d3.rollup(filteredData,
            v => d3.sum(v, d => d.streams),
            d => d.artist_name
        );

        const barData = Array.from(artistStreams, ([artist, streams]) => ({artist, streams}))
            .sort((a, b) => b.streams - a.streams)
            .slice(0, 10);

        x.domain(barData.map(d => d.artist));
        y.domain([0, d3.max(barData, d => d.streams)]);

        svg.selectAll("*").remove();

        svg.append("g")
            .attr("transform", `translate(0,${INNER_HEIGHT})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .call(d3.axisLeft(y));

        svg.selectAll(".bar")
            .data(barData)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.artist))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d.streams))
            .attr("height", d => INNER_HEIGHT - y(d.streams))
            .attr("fill", "#22C55E");

        // Add labels
        svg.append("text")
            .attr("transform", `translate(${INNER_WIDTH/2}, ${INNER_HEIGHT + MARGIN.bottom - 5})`)
            .style("text-anchor", "middle")
            .text("Artists");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - MARGIN.left)
            .attr("x", 0 - (INNER_HEIGHT / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Total Streams");
    }

    updateChart(data);

    return {
        update: updateChart
    };
}

function createPieChart(data) {
    const svg = d3.select("#pie-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${CHART_WIDTH/2},${CHART_HEIGHT/2})`);

    const radius = Math.min(INNER_WIDTH, INNER_HEIGHT) / 2;
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    function updateChart(filteredData) {
        const genreCounts = d3.rollup(filteredData,
            v => v.length,
            d => d.genre
        );

        const pieData = Array.from(genreCounts, ([genre, count]) => ({genre, count}))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);  // Top 5 genres

        const pie = d3.pie()
            .value(d => d.count)
            .sort(null);

        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);

        svg.selectAll("*").remove();

        const arcs = svg.selectAll("arc")
            .data(pie(pieData))
            .enter()
            .append("g")
            .attr("class", "arc");

        arcs.append("path")
            .attr("d", arc)
            .attr("fill", (d, i) => color(i));

        // Add labels
        arcs.append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .text(d => d.data.genre)
            .style("font-size", "12px")
            .style("fill", "white");

        // Add legend
        const legend = svg.selectAll(".legend")
            .data(pieData)
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(${radius + 20}, ${-radius + 20 + i * 20})`);

        legend.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", (d, i) => color(i));

        legend.append("text")
            .attr("x", 20)
            .attr("y", 9)
            .text(d => `${d.genre} (${d.count})`)
            .style("font-size", "12px");
    }

    updateChart(data);

    return {
        update: updateChart
    };
}

function createScatterPlot(data) {
    const svg = d3.select("#scatter-plot")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const x = d3.scaleLinear().range([0, INNER_WIDTH]);
    const y = d3.scaleLinear().range([INNER_HEIGHT, 0]);

    function updateChart(filteredData) {
        x.domain([0, d3.max(filteredData, d => d.duration_ms / 60000)]);  // Convert to minutes
        y.domain([0, d3.max(filteredData, d => d.streams)]);

        svg.selectAll("*").remove();

        svg.append("g")
            .attr("transform", `translate(0,${INNER_HEIGHT})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y));

        svg.selectAll(".dot")
            .data(filteredData)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.duration_ms / 60000))
            .attr("cy", d => y(d.streams))
            .attr("r", 3)
            .style("fill", "#22C55E")
            .style("opacity", 0.7);

        // Add labels
        svg.append("text")
            .attr("transform", `translate(${INNER_WIDTH/2}, ${INNER_HEIGHT + MARGIN.bottom - 5})`)
            .style("text-anchor", "middle")
            .text("Song Duration (minutes)");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - MARGIN.left)
            .attr("x", 0 - (INNER_HEIGHT / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Total Streams");
    }

    updateChart(data);

    return {
        update: updateChart
    };
}

function createHeatmap(data) {
    const svg = d3.select("#heatmap")
        .append("svg")
        .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const x = d3.scaleBand().range([0, INNER_WIDTH]).padding(0.05);
    const y = d3.scaleBand().range([INNER_HEIGHT, 0]).padding(0.05);
    const color = d3.scaleSequential(d3.interpolateGreens);

    function updateChart(filteredData) {
        const heatmapData = d3.rollup(filteredData,
            v => d3.sum(v, d => d.streams),
            d => d.genre,
            d => d.released_date.getMonth()
        );

        const genres = Array.from(heatmapData.keys());
        x.domain(months);
        y.domain(genres);

        const allValues = Array.from(heatmapData.values(), m => Array.from(m.values())).flat();
        color.domain([0, d3.max(allValues)]);

        svg.selectAll("*").remove();

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${INNER_HEIGHT})`)
            .call(d3.axisBottom(x));

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(y));

        // Create the heatmap cells
        genres.forEach(genre => {
            const genreData = heatmapData.get(genre);
            svg.selectAll(`.cell-${genre}`)
                .data(months)
                .enter().append("rect")
                .attr("class", `cell-${genre}`)
                .attr("x", d => x(d))
                .attr("y", y(genre))
                .attr("width", x.bandwidth())
                .attr("height", y.bandwidth())
                .style("fill", d => {
                    const monthIndex = months.indexOf(d);
                    return color(genreData.get(monthIndex) || 0);
                });
        });

        // Add labels
        svg.append("text")
            .attr("transform", `translate(${INNER_WIDTH/2}, ${INNER_HEIGHT + MARGIN.bottom - 5})`)
            .style("text-anchor", "middle")
            .text("Month");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - MARGIN.left)
            .attr("x", 0 - (INNER_HEIGHT / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Genre");
    }

    updateChart(data);

    return {
        update: updateChart
    };
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});