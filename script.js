// Load the dataset
d3.csv("path/to/Spotify-Most-Streamed-Songs.csv").then(data => {
    // Process data
    data.forEach(d => {
        d.streams = +d.streams; // Convert streams to number
        d.released_year = +d.released_year; // Convert released year to number
        d.danceability = +d.danceability_ % / 100; / / Convert danceability percentage to a decimal
        d.energy = +d.energy_ % / 100; / / Convert energy percentage to a decimal
        d.acousticness = +d.acousticness_ % / 100; / / Convert acousticness percentage to a decimal
    });

    // Create visualizations
    createLineChart(data);
    createBarChart(data);
    createPieChart(data);
    createScatterPlot(data);
    createHeatmap(data);
});

// Function to create a Line Chart for Streaming Trends Over Time
function createLineChart(data) {
    const svg = d3.select("#line-chart").append("svg").attr("width", 600).attr("height", 400);

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => new Date(d.released_year, 0)))
        .range([0, 580]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.streams)])
        .range([380, 0]);

    const line = d3.line()
        .x(d => x(new Date(d.released_year, 0)))
        .y(d => y(d.streams));

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);

    svg.append("g").call(d3.axisBottom(x).ticks(5)).attr("transform", "translate(0,380)");
    svg.append("g").call(d3.axisLeft(y));
}

// Function to create a Bar Chart for Top Artists by Total Streams
function createBarChart(data) {
    const artistData = d3.rollup(data, v => d3.sum(v, d => d.streams), d => d.artist_name);
    const sortedArtists = Array.from(artistData.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const svg = d3.select("#bar-chart").append("svg").attr("width", 600).attr("height", 400);

    const x = d3.scaleBand()
        .domain(sortedArtists.map(d => d[0]))
        .range([0, 580])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(sortedArtists, d => d[1])])
        .range([380, 0]);

    svg.selectAll(".bar")
        .data(sortedArtists)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[0]))
        .attr("y", d => y(d[1]))
        .attr("width", x.bandwidth())
        .attr("height", d => 380 - y(d[1]))
        .attr("fill", "orange");

    svg.append("g").call(d3.axisBottom(x)).attr("transform", "translate(0,380)");
    svg.append("g").call(d3.axisLeft(y));
}

// Function to create a Pie Chart for Genre Distribution
function createPieChart(data) {
    const genreData = d3.rollup(data, v => v.length, d => d.genre); // Assuming genre is in your dataset

    const pieData = Array.from(genreData.entries());

    const width = 300;
    const height = 300;

    const radius = Math.min(width, height) / 2;

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie().value(d => d[1]);

    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const svg = d3.select("#pie-chart").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    svg.selectAll(".arc")
        .data(pie(pieData))
        .enter().append("path")
        .attr("class", "arc")
        .attr("d", arc)
        .style("fill", (d) => color(d.data[0]));

}

// Function to create a Scatter Plot for Song Length vs. Total Streams
function createScatterPlot(data) {
    const svg = d3.select("#scatter-plot").append("svg").attr("width", 600).attr("height", 400);

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => +d.length)]) // Assuming length is in your dataset
        .range([40, 580]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => +d.streams)])
        .range([380, 20]);

    svg.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", (d) => x(+d.length))
        .attr("cy", (d) => y(+d.streams))
        .attr("r", 5)
        .style("fill", "purple");

    svg.append("g").call(d3.axisBottom(x).ticks(5)).attr("transform", "translate(0,380)");
    svg.append("g").call(d3.axisLeft(y));
}

// Function to create a Heatmap for Monthly Streaming Activity by Genre
function createHeatmap(data) {
    // Prepare data for heatmap (this may require additional processing depending on your dataset structure)
    // Here we assume you have a monthly streaming count per genre

    // This is just a placeholder function; you will need to implement the heatmap logic based on your dataset.
    console.log('Heatmap function needs implementation based on specific data structure.');
}