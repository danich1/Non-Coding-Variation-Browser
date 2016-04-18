var data_ds = [
    {"x":1,"y":100},
    {"x":2,"y":90},
    {"x":3,"y":100},
    {"x":4,"y":90},
    {"x":5,"y":80},
    {"x":6,"y":0},
    {"x":9,"y":0},
    {"x":10,"y":100},
    {"x":11,"y":90},
    {"x":12,"y":80},
    {"x":13,"y":90},
    {"x":14,"y":100}
    ];

var data = [
  {
    "name": "apples",
    "values": [
      { "x": 0, "y":  91},
      { "x": 1, "y": 100}
    ]
  },
  {
    "name": "oranges",
    "values": [
      { "x": 0, "y":  9},
      { "x": 1, "y": 49}
    ]
  }
];

function start()
{
    var dimensions = {"width":800,"height":150,"left":40,"bottom":40,"right":40,"top":40};

    var xlinearscale = d3.scale.linear()
                        .domain([0,20])
                        .range([0,dimensions.width - dimensions.left - dimensions.right]);

    var ylinearscale = d3.scale.linear()
                        .domain([0,100])
                        .range([dimensions.height - dimensions.top - dimensions.bottom,0]);

    var xAxis = d3.svg.axis()
        .scale(xlinearscale)
         .tickValues([0,20])
        .tickFormat(d3.format("1s"))
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(ylinearscale)
         .tickValues([0,100])
          .tickFormat(d3.format("1s"))
        .orient("left");

    var area = d3.svg.area()
                    .x(function(d) { console.log(d.x);return xlinearscale(d.x); })
                    .y0(dimensions.height-dimensions.top-dimensions.bottom)
                    .y1(function(d) { return ylinearscale(d.y); });

    var stack = d3.layout.stack()
                    .offset("zero")
                    .values(function(d){return d.values});

    var browser =  d3.select("body")
                     .append("svg")
                     .attr("height", dimensions.height)
                     .attr("width", dimensions.width);


    browser.selectAll("path")
          .data(stack(data))
          .enter().append("path")
          .attr("class", "area")
          .style("fill", function(d,i) { console.log(i);if (i==1) {return "yellow";} return "blue";})
          .style("opacity","0.9")
          .attr("d", function(d) { console.log(d);return area(d.values); });

   /* browser.append("path")
          .datum(data)
          .attr("class", "area")
          .attr("class", "double")
          .style("fill", "blue")
          .style("opacity", "0.4")
          .attr("d", area);*/

    browser.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + (dimensions.height - dimensions.top - dimensions.bottom) + ")")
          .call(xAxis);

    browser.append("g")
          .attr("class", "y axis")
          .attr("transform", "translate(0," + dimensions.top + ")")
          .call(yAxis)


}