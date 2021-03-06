import Ember from 'ember';
import d3 from 'npm:d3';
import slug from '../utils/slug';

export default Ember.Component.extend({

  /**
   * Members
   */

  tagName: '',
  sector: null,
  valueMap: null,
  municipality: null,
  mungedNested: [],

  chartPaddingPercentage: .1,

  chartOptions: {
    w: 500,
    h: 500,
    levels: 2,
    roundStrokes: true,
  },

  init() {
    this._super(...arguments);

    this.calculateChartDimensions();

    Ember.$(window).resize(() => {
      this.calculateChartDimensions(true);
    });
  },

  calculateChartDimensions(render = false) {
    const chartOptions = this.get('chartOptions');
    const size = (window.innerWidth > 600) ? 500 : (window.innerWidth > 480) ? 330 : 290;

    chartOptions.w = size;
    chartOptions.h = size + 10;

    this.set('chartOptions', chartOptions);

    if (render)  {
      const chartTitle = slug(this.get('municipality')).normalize();

      this.radarChart(`#${chartTitle}`, chartOptions);
    }
  },


  /**
   * Methods
   */

  didRender() {
    const chartOptions = this.get('chartOptions');
    const data = Ember.copy(this.get('data'), true);

    const allAxis = Array.from(new Set(data.map(d => d.criterion)));

    const nestedData = d3.nest()
                         .key(d => d.municipal)
                         .entries(data);

    nestedData.forEach(muni => {
      const muniColor = muni.values[0].color;

      muni.values = allAxis.map(axis => {
        let filtered = muni.values.filter(x => x.criterion === axis);

        if (filtered.length === 0) {
          return {
            criterion: axis,
            totalConsumption: 0,
            color: muniColor,
          };
        }
        else {
          return filtered[0];
        }
      });
    });

    let mungedNested = nestedData.map(obj => {
      return obj.values.map(obj => {
        return {
          axis: obj.criterion, 
          value: obj.totalConsumption,
          color: obj.color,
        };
      });
    });

    if (this.get('sector') === 'residential') {
      mungedNested = mungedNested.map(muni => muni.filter(row => row.axis !== 'total'));
    }

    let values = mungedNested.map(town => town.map(data => parseInt(data.value)))
                             .reduce((town, towns) => towns.concat(town));

    const maxValue = Math.max.apply(Math, values);
    chartOptions.maxValue = maxValue + (maxValue * this.get('chartPaddingPercentage'));

    const chartTitle = slug(this.get('municipality')).normalize();

    this.set('mungedNested', mungedNested);
    this.radarChart(`#${chartTitle}`, chartOptions);
  },


  radarChart(id, options) {
    /////////////////////////////////////////////////////////
    /////////////// The Radar Chart Function ////////////////
    /////////////// Written by Nadieh Bremer ////////////////
    ////////////////// VisualCinnamon.com ///////////////////
    /////////// Inspired by the code of alangrafu ///////////
    /////////////////////////////////////////////////////////

    const data = this.get('mungedNested');
      
    var cfg = {
      w: 600,                //Width of the circle
      h: 600,                //Height of the circle
      margin: {top: 0, right: 0, bottom: 0, left: 0}, //The margins of the SVG
      levels: 3,                //How many levels or inner circles should there be drawn
      maxValue: 0,             //What is the value that the biggest circle will represent
      labelFactor: 1.25,     //How much farther than the radius of the outer circle should the labels be placed
      wrapWidth: 60,         //The number of pixels after which a label needs to be given a new line
      opacityArea: 0.25,     //The opacity of the area of the blob
      dotRadius: 4,             //The size of the colored circles of each blog
      opacityCircles: 0.1,     //The opacity of the circles of each blob
      strokeWidth: 2,         //The width of the stroke around each blob
      roundStrokes: true,    //If true the area and stroke will follow a round path (cardinal-closed)
    };

    const valueMap = this.get('valueMap');
      
      //Put all of the options into a variable called cfg
      if('undefined' !== typeof options){
        for(var i in options){
          if('undefined' !== typeof options[i]){ cfg[i] = options[i]; }
        }//for i
      }//if
      
      //If the supplied maxValue is smaller than the actual one, replace by the max in the data
      var maxValue = Math.max(cfg.maxValue, d3.max(data, function(i){return d3.max(i.map(function(o){return o.value;}))}));

      const allAxis = data.map(d => d.map(i => i.axis))
                          .reduce((a, b) => a.concat(b));
          
      var uniqueAxis = Array.from((new Set(allAxis))),    //Names of each axis
          total = uniqueAxis.length,                    //The number of different axes
          radius = Math.min(cfg.w/3.1, cfg.h/3.1),     //Radius of the outermost circle
          Format = d3.format(','),                 //Percentage formatting
          angleSlice = Math.PI * 2 / total;        //The width in radians of each "slice"
      

      //Scale for the radius
      var rScale = d3.scaleLinear()
          .range([0, radius])
          .domain([0, maxValue]);
          
      /////////////////////////////////////////////////////////
      //////////// Create the container SVG and g /////////////
      /////////////////////////////////////////////////////////

      //Remove whatever chart with the same id/class was present before
      d3.select(id).select("svg").remove();
      
      //Initiate the radar chart SVG
      var svg = d3.select(id).append("svg")
              .attr("width",  cfg.w + cfg.margin.left + cfg.margin.right)
              .attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom)
              .attr("class", "radar"+id);

      //Append a g element        
      var g = svg.append("g")
              .attr("transform", "translate(" + (cfg.w/2 + cfg.margin.left) + "," + (cfg.h/2 + cfg.margin.top) + ")");
      
      /////////////////////////////////////////////////////////
      ////////// Glow filter for some extra pizzazz ///////////
      /////////////////////////////////////////////////////////
      
      //Filter for the outside glow
      var filter = g.append('defs').append('filter').attr('id','glow');
          filter.append('feGaussianBlur').attr('stdDeviation','.1').attr('result','coloredBlur');
      var feMerge = filter.append('feMerge');
          feMerge.append('feMergeNode').attr('in','coloredBlur');
          feMerge.append('feMergeNode').attr('in','SourceGraphic');

      /////////////////////////////////////////////////////////
      /////////////// Draw the Circular grid //////////////////
      /////////////////////////////////////////////////////////
      
      //Wrapper for the grid & axes
      var axisGrid = g.append("g").attr("class", "axisWrapper");

      /////////////////////////////////////////////////////////
      //////////////////// Draw the axes //////////////////////
      /////////////////////////////////////////////////////////
      
      //Create the straight lines radiating outward from the center
      var axis = axisGrid.selectAll(".axis")
          .data(uniqueAxis)
          .enter()
          .append("g")
          .attr("class", "axis");

      //Append the lines
      axis.append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", function(d, i){ return rScale(maxValue) * Math.cos(angleSlice*i - Math.PI/2); })
          .attr("y2", function(d, i){ return rScale(maxValue) * Math.sin(angleSlice*i - Math.PI/2); })
          .attr("class", "line")
          .style("stroke", '#ddd')
          .style("stroke-width", "1px");

      //Append the labels at each axis
      axis.append("text")
          .attr("class", "legend")
          .style("font-size", "11px")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("x", function(d, i){ return rScale(maxValue * cfg.labelFactor) * Math.cos(angleSlice*i - Math.PI/2); })
          .attr("y", function(d, i){ return rScale(maxValue * cfg.labelFactor) * Math.sin(angleSlice*i - Math.PI/2); })
          .text(function(d){
            if (valueMap) {
              d = valueMap[d];
            }

            return d;
          })
          .call(wrap, cfg.wrapWidth);

      /////////////////////////////////////////////////////////
      ///////////// Draw the radar chart blobs ////////////////
      /////////////////////////////////////////////////////////
      
      //The radial line function
      var radarLine = d3.lineRadial()
          .radius(function(d) { return rScale(d.value); })
          .angle(function(d,i) {    return i*angleSlice; });
          
      if(cfg.roundStrokes) {
          radarLine.curve(d3.curveLinear);
      }
                  
      //Create a wrapper for the blobs    
      var blobWrapper = g.selectAll(".radarWrapper")
          .data(data)
          .enter().append("g")
          .attr("class", "radarWrapper");
              
      //Append the backgrounds    
      blobWrapper
          .append("path")
          .attr("class", "radarArea")
          .attr("d", function(d) { return radarLine(d); })
          .style("fill", function(d) { return d[0].color; })
          .style("fill-opacity", cfg.opacityArea)
          .on('mouseover', function (){
              //Dim all blobs
              d3.selectAll(".radarArea")
                  .transition().duration(200)
                  .style("fill-opacity", 0.1); 
              //Bring back the hovered over blob
              d3.select(this)
                  .transition().duration(200)
                  .style("fill-opacity", 0.7);    
          })
          .on('mouseout', function(){
              //Bring back all blobs
              d3.selectAll(".radarArea")
                  .transition().duration(200)
                  .style("fill-opacity", cfg.opacityArea);
          });
          
      //Create the outlines    
      blobWrapper.append("path")
          .attr("class", "radarStroke")
          .attr("d", function(d) { return radarLine(d); })
          .style("stroke-width", cfg.strokeWidth + "px")
          .style("stroke", function(d) { return d[0].color; })
          .style("fill", "none")
          .style("filter" , "url(#glow)");        
      
      //Append the circles
      blobWrapper.selectAll(".radarCircle")
          .data(function(d) { return d; })
          .enter().append("circle")
          .attr("class", "radarCircle")
          .attr("r", cfg.dotRadius)
          .attr("cx", function(d,i){ return rScale(d.value) * Math.cos(angleSlice*i - Math.PI/2); })
          .attr("cy", function(d,i){ return rScale(d.value) * Math.sin(angleSlice*i - Math.PI/2); })
          .style("fill", function(d) { return d.color; })
          .style("fill-opacity", 0.8);

      /////////////////////////////////////////////////////////
      //////// Append invisible circles for tooltip ///////////
      /////////////////////////////////////////////////////////
      
      //Wrapper for the invisible circles on top
      var blobCircleWrapper = g.selectAll(".radarCircleWrapper")
          .data(data)
          .enter().append("g")
          .attr("class", "radarCircleWrapper");
          
      //Append a set of invisible circles on top for the mouseover pop-up
      blobCircleWrapper.selectAll(".radarInvisibleCircle")
          .data(function(d) { return d; })
          .enter().append("circle")
          .attr("class", "radarInvisibleCircle")
          .attr("r", cfg.dotRadius*1.5)
          .attr("cx", function(d,i){ return rScale(d.value) * Math.cos(angleSlice*i - Math.PI/2); })
          .attr("cy", function(d,i){ return rScale(d.value) * Math.sin(angleSlice*i - Math.PI/2); })
          .style("fill", "none")
          .style("pointer-events", "all")
          .on("mouseover", function(d) {
              let newX =  parseFloat(d3.select(this).attr('cx')) - 10;
              let newY =  parseFloat(d3.select(this).attr('cy')) - 10;
                      
              tooltip
                  .attr('x', newX)
                  .attr('y', newY)
                  .text(Format(d.value))
                  .transition().duration(200)
                  .style('opacity', 1);
          })
          .on("mouseout", function(){
              tooltip.transition().duration(200)
                  .style("opacity", 0);
          });
          
      //Set up the small tooltip for when you hover over a circle
      var tooltip = g.append("text")
          .attr("class", "tooltip")
          .style("opacity", 0);
      
      /////////////////////////////////////////////////////////
      /////////////////// Helper Function /////////////////////
      /////////////////////////////////////////////////////////

      //Taken from http://bl.ocks.org/mbostock/7555321
      //Wraps SVG text    
      function wrap(text, width) {
        text.each(function() {
          var text = d3.select(this),
              words = text.text().split(/\s+/).reverse(),
              word,
              line = [],
              lineNumber = 0,
              lineHeight = 1.4, // ems
              y = text.attr("y"),
              x = text.attr("x"),
              dy = parseFloat(text.attr("dy")),
              tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
              
          while ((word = words.pop())) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
              line.pop();
              tspan.text(line.join(" "));
              line = [word];
              tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
          }
        });
      }//wrap    
  }

});

