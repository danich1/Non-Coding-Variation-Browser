// JAVASCRIPT IS PICKY ABOUT CASES BEFORE WARNED
// CASE SENSITIVE

//set the globals
var dimensions = {"width":800,"height":150,"left":40,"bottom":40,"right":60,"top":40};
var old_mouse_x = 0;
var max_graphs = 10;
var available_regions = {};
var cell_labels = {};
var active_regions = 0;
var saved_regions = [];
var active_track_ordering = {};
var master_track = [];
var colormap = d3.scale.category20();
var ld_color_map = function(ld_value){
    if (ld_value < 0)
    {
      //purple
      return "#6600cc";
    }
    else if (ld_value < 0.5)
    {
      //blue color
      return "#000066";
    }
    else if(ld_value < 1 && ld_value>=0.5)
    {
      //green
      return "#00e600";
    }
    else
    {
      //top ld
      return "#e60000";
    }
};
var current_regions = [];

function clearAll()
{
    $("#SNP_Browser").find("svg").children().remove();
    $("#CHIP_SEQ_Browser").find("svg").children().remove();
    chip_spinner.spin(document.getElementById("CHIP_SEQ_Browser"));
    snp_spinner.spin(document.getElementById("SNP_Browser"));

}

function reset()
{
    //reset the data
    //reset the scale
    xlinearscale_all = d3.scale.linear()
                          .domain([saved_regions[active_regions]["start"],saved_regions[active_regions]["end"]])
                          .range([0,dimensions.width - dimensions.left - dimensions.right]);
    current_regions[active_regions]["start"] = saved_regions[active_regions]["start"];
    current_regions[active_regions]["end"] = saved_regions[active_regions]["end"];
    update_snp_seq(available_regions[active_regions]["snps"],saved_regions[active_regions]["start"],saved_regions[active_regions]["end"],true);
    active_track_ordering[active_regions].forEach(function(track_label,i)
    {
      if(i < max_graphs)
      {
        if (track_label.indexOf("+") != -1)
        {
          var merged_data = track_label.split("+")
                                       .map(function(d)
                                       {
                                        return available_regions[active_regions]["chip"][d];
                                       }).reduce(function(prev,next)
                                       {
                                          return prev.concat(next);
                                       });
          update_chip_seq(merged_data,saved_regions[active_regions]["start"],saved_regions[active_regions]["end"],(dimensions.top + (i * dimensions.height)),available_regions[active_regions]["title"][track_label],track_label,true);
        }
        else
        {
          update_chip_seq(available_regions[active_regions]["chip"][track_label],saved_regions[active_regions]["start"],saved_regions[active_regions]["end"],(dimensions.top + (i * dimensions.height)),available_regions[active_regions]["title"][track_label],track_label,true);
        }
      }
    });
}

function highlight_locus(d)
{
    console.log(d);
    svg_chip_seq.append("line")
                .attr("x1",xlinearscale_all(d.pos)+dimensions.left)
                .attr("y1",0)
                .attr("x2",xlinearscale_all(d.pos)+dimensions.left)
                .attr("y2",1000)
                .attr("stroke","black")
                .attr("stroke-dasharray","5, 5")
                .attr("id","highlight");
}
function plot_legend()
{
  svg_graph_legend.selectAll("g").remove();
  var sub_legend = svg_graph_legend.append("g")
                                   .attr("transform", "translate(10,20)");

  sub_legend.selectAll("text")
            .data(Object.keys(cell_labels[active_regions]["chip"])).enter()
            .append("text")
            .attr("x",25)
            .attr("y",function(d){return cell_labels[active_regions]["chip"][d] * 30 + 20})
            .text(function(d){return d});

  sub_legend.append("text")
            .attr("x",0)
            .attr("y", 0)
            .text("Cell Types");

  sub_legend.selectAll("rect")
            .data(Object.keys(cell_labels[active_regions]["chip"])).enter()
            .append("rect")
            .attr("fill",function(d){return colormap(cell_labels[active_regions]["chip"][d])})
            .attr("x",0)
            .attr("height",20)
            .attr("y",function(d){return cell_labels[active_regions]["chip"][d] * 30 + 5})
            .attr("width",20);

  var sub_legend = svg_graph_legend.append("g")
                      .attr("transform","translate(100,20)");

  sub_legend.selectAll("text")
            .data([1,0.5,0]).enter()
            .append("text")
            .attr("x",75)
            .attr("y",function(d,i){return i * 30 + 20})
            .text(function(d){return (d==0) ? "0" : d;});

  sub_legend.append("text")
          .attr("x",50)
          .attr("y",0)
          .text("R2");

  sub_legend.selectAll("rect")
            .data([1,0.5,0]).enter()
            .append("rect")
            .attr("fill",function(d){return ld_color_map(d)})
            .attr("x",50)
            .attr("height",20)
            .attr("y",function(d,i){return i * 30 + 5})
            .attr("width",20);

}
function hide_plot(plot)
{
  var hide = $(plot).val();
  var num_active = $.makeArray($("input[name='hide']").map(function(i,d){return d.checked ? 0 : 1;})).reduce(function(prev,next){return prev+next;});
  if(plot.checked)
  {
    //calibration hack
    if (num_active == 0)
    {
      alert("Must Have at Least One Graph Shown!");
      plot.checked = false;
    }
    else
    {
      var index = active_track_ordering[active_regions].indexOf(hide);
      active_track_ordering[active_regions].splice(index,1);
      active_track_ordering[active_regions].splice(max_graphs,0,hide);
      $("li[name=\'" + hide.replace(/\+/g, '\\+') + "\']").remove();
      //update the list
      $("<li class=\"ui-state-default list-group-item track-merge\" name=\""+hide+"\">" + available_regions[active_regions]["title"][hide]["target"] + " <input type=\"checkbox\" name=\"master\" value=\"" + hide + "\" onchange=\"update_lists(this)\"> Master" + "<input type=\"checkbox\" name=\"hide\" value=\"" + hide + "\" onchange=\"hide_plot(this)\" checked> Hide" + "</li>").insertAfter($("li[name=\'"+active_track_ordering[active_regions][max_graphs-1].replace(/\+/g, '\\+')+"\']"));
      //do things
      $("#"+hide.replace(/\+/g, '\\+')).remove();
    }
  }
  else
  {
    //calibration hack
    num_active = num_active - 1;
    //replot
    if (num_active == max_graphs)
    {
      alert("Too Many Graphs Active! Please Hide one of Them!");
      plot.checked = true;
    }
    else
    {
      //index is def off I know it !!
      var index = active_track_ordering[active_regions].indexOf(hide);
      active_track_ordering[active_regions].splice(index,1);
      active_track_ordering[active_regions].splice(max_graphs-1,0,hide);
      $("li[name=\'" + hide.replace(/\+/g, '\\+') + "\']").remove();
      //create the list item
      $("<li class=\"ui-state-default list-group-item track-merge\" name=\""+hide+"\">" + available_regions[active_regions]["title"][hide]["target"] + " <input type=\"checkbox\" name=\"master\" value=\"" + hide + "\" onchange=\"update_lists(this)\"> Master" + "<input type=\"checkbox\" name=\"hide\" value=\"" + hide + "\" onchange=\"hide_plot(this)\"> Hide" + "</li>").insertBefore($("li[name=\'"+active_track_ordering[active_regions][max_graphs].replace(/\+/g, '\\+')+"\']"));
      //plot
      if (active_track_ordering[active_regions].indexOf("+") != -1)
      {
            var merged_data = active_track_ordering[active_regions][max_graphs-1].split("+")
                                   .map(function(d)
                                   {
                                    return available_regions[active_regions]["chip"][d];
                                   }).reduce(function(prev,next)
                                   {
                                      return prev.concat(next);
                                   })
                                   .filter(function(d)
                                    {
                                      return d.start >= current_regions[active_regions]["start"] && d.end <= current_regions[active_regions]["end"];
                                    }); 
            var merged_title = active_track_ordering[active_regions][max_graphs-1].split("+")
                                      .map(function(d)
                                      {
                                        return available_regions[active_regions]["title"][d]; 
                                      });
            update_chip_seq(merged_data,current_regions[active_regions]["start"], current_regions[active_regions]["end"],(dimensions.top + ((max_graphs-1) * dimensions.height)),merged_title,active_track_ordering[active_regions][max_graphs-1],false);
      }
      else
      {
        update_chip_seq(available_regions[active_regions]["chip"][active_track_ordering[active_regions][max_graphs-1]],current_regions[active_regions]["start"], current_regions[active_regions]["end"],(dimensions.top + ((max_graphs-1) * dimensions.height)),available_regions[active_regions]["title"][active_track_ordering[active_regions][max_graphs-1]],active_track_ordering[active_regions][max_graphs-1],false);
      }
    }
  }

}

function setup_functionality()
{
    $(".track-merge").droppable(
        {
            drop: function(event,ui)
            {
                drop = true;
                //var track_list = $.makeArray($("#Track_List").children().map(function(i,d){return $(d).attr('name');}));
                var first = $(this).attr('name');
                var second = $(ui.helper).attr('name');
                //calibrate the positioning of the charts
                var track_indicies = Object.keys(available_regions[active_regions]["chip"]).filter(function (d){return first.contains(d) || second.contains(d);});
                var first_index = active_track_ordering[active_regions].indexOf(first);
                var second_index = active_track_ordering[active_regions].indexOf(second);
                var combined_label = (first_index < second_index) ? (first + "+" + second) : (second + "+" + first);
                var combined_target = (first_index < second_index) ? (available_regions[active_regions]["title"][first]["target"] + "+" + available_regions[active_regions]["title"][second]["target"]) : (available_regions[active_regions]["title"][second]["target"] + "+" + available_regions[active_regions]["title"][first]["target"])
                active_track_ordering[active_regions][first_index] = combined_label;
                active_track_ordering[active_regions].splice(second_index,1);

                var merged_data = Object.keys(available_regions[active_regions]["chip"]).filter(function (d)
                   {
                    return first.contains(d) || second.contains(d);
                   })
                   .map(function(d)
                   {
                    return available_regions[active_regions]["chip"][d];
                   }).reduce(function(prev,next)
                   {
                      return prev.concat(next);
                   })
                   .filter(function(d)
                    {
                      return d.start >= current_regions[active_regions]["start"] && d.end <= current_regions[active_regions]["end"];
                    });

                  //remove the items from the li listing
                  $("li[name=\'"+((first_index < second_index) ? first.replace(/\+/g, '\\+') : second.replace(/\+/g, '\\+'))+"\']").remove();
                  //replace the li(s) with a new li that contains a combination of both tracks
                  $("li[name=\'"+((first_index < second_index) ? second.replace(/\+/g, '\\+') : first.replace(/\+/g, '\\+'))+"\']").html(combined_target + " <input type=\"checkbox\" name=\"master\" value=\"" + combined_label + "\" onchange=update_lists(this)> Master" + "<input type=\"checkbox\" name=\"hide\" value=\"" + combined_label + "\" onchange=\"hide_plot(this)\"> Hide <input type=\"button\" name=\"" + combined_label + "\" value=\"Split\" onclick=\"split(this)\">");
                  //update the name in order to calibrate the naming scheme
                  $("li[name=\'"+((first_index < second_index) ? second.replace(/\+/g, '\\+') : first.replace(/\+/g, '\\+'))+"\']").attr("name", combined_label).addClass("merged");
                   
                   active_track_ordering[active_regions].forEach(function(d,i)
                   {
                         $("#"+d.replace(/\+/g,"\\+")).attr("transform", "translate(" + dimensions.left + "," + (dimensions.top + (i * dimensions.height)) + ")");
                   });
                   var merged_title = (first_index < second_index) ? [available_regions[active_regions]["title"][first],available_regions[active_regions]["title"][second]] : [available_regions[active_regions]["title"][second],available_regions[active_regions]["title"][first]];
                   d3.select("#"+first.replace(/\+/g, '\\+')).remove();
                   d3.select("#"+second.replace(/\+/g, '\\+')).remove();
                   update_chip_seq(merged_data,current_regions[active_regions]["start"],current_regions[active_regions]["end"],(dimensions.top + (active_track_ordering[active_regions].indexOf(combined_label) * dimensions.height)),merged_title,combined_label,false);
            },
        }
        );
          $("#Track_List").sortable(
        {
            connectWith:".connectedList",
            placeholder: "ui-state-highlight",
            update: function(event, ui)
            {
                if(drop != undefined && !drop)
                {
                    var track_list = $.makeArray($("#Track_List").children().map(function(i,d){return $(d).attr('name');}));
                    var probe = $(ui.item).attr('name');
                    var new_index = track_list.indexOf(probe);
                    var old_index = active_track_ordering[active_regions].indexOf(probe);
                    //remove the value
                    active_track_ordering[active_regions].splice(old_index,1);

                    //re-insert the value into the array
                    active_track_ordering[active_regions].splice(new_index,0,probe);

                    //change the plot to mimic the values
                    active_track_ordering[active_regions].forEach(function(track_label,i)
                    {
                      if (i < max_graphs)
                      {
                        $("#"+track_label.replace(/\+/g, '\\+')).attr("transform","translate(" + dimensions.left + "," + (dimensions.top + (i * dimensions.height)) + ")");
                      }
                    });
                }
                drop = false;
            },
            dropOnEmpty: true
        });
      drop=false;
}

function split(combined_track)
{
    var name = $(combined_track).attr("name");
    var track_index = active_track_ordering[active_regions].indexOf(name);
    var len = name.split("+").length;
    //push everything else down to incorporate new graphs
    //same as above get index
    active_track_ordering[active_regions].forEach(function(d,i)
    {
      if(i > track_index)
      {
        $("#"+d).attr("transform", "translate(" + dimensions.left + "," + (dimensions.top + ((i+len-1) * dimensions.height)) + ")");
       }
    });
    active_track_ordering[active_regions].splice(track_index,1);
    //remove and update
    $("li[name=\'" + name + "\']").remove();
    name.split("+").forEach(function (d,i)
    {
      if((track_index + i) < max_graphs)
      {
        active_track_ordering[active_regions].splice(track_index + i,0,d);
        $("<li class=\"ui-state-default list-group-item track-merge\" name=\"" + d + "\">" + available_regions[active_regions]["title"][d]["target"] + " <input type=\"checkbox\" name=\"master\" value=\"" + d + "\" onchange=\"update_lists(this)\"> Master" + "<input type=\"checkbox\" name=\"hide\" value=\"" + d + "\" onchange=\"hide_plot(this)\"> Hide" + "</li>").insertBefore($("li[name=\'" + active_track_ordering[active_regions][track_index + i + 1] + "\']"));
        update_chip_seq(available_regions[active_regions]["chip"][d].filter(function(d)
          {
            return d.start >= current_regions[active_regions]["start"] && d.end <= current_regions[active_regions]["end"];
          }),current_regions[active_regions]["start"],current_regions[active_regions]["end"],(dimensions.top + ((track_index+i) * dimensions.height)),available_regions[active_regions]["title"][d],d,false);
      }
      else
      {
        active_track_ordering[active_regions].splice(active_track_ordering[active_regions].length,0,d);
        $("#Track_List").append("<li class=\"ui-state-default list-group-item track-merge\" name=\"" + d + "\">" + available_regions[active_regions]["title"][d]["target"] + " <input type=\"checkbox\" name=\"master\" value=\"" + d + "\" onchange=\"update_lists(this)\"> Master" + "<input type=\"checkbox\" name=\"hide\" value=\"" + d + "\" onchange=\"hide_plot(this)\" checked> Hide" + "</li>");
      }
    });
    setup_functionality();

    //remove g and update graphs
    d3.select("#"+name.replace(/\+/g, '\\+')).remove();

}

function toggle_items()
{
  plot_legend();
    $("#Track_List").children().remove();
    //Jquery to insert list elements only took a few lines
    var track_items = master_track.map(function(d,i){
      if (d.contains("+"))
      {
        return "<li class=\"ui-state-default list-group-item track-merge\" name=\"" + d + "\">" + available_regions[active_regions]["title"][d]["target"] + " <input type=\"checkbox\" name=\"master\" value=\"" + d + "\" onchange=update_lists(this) checked> Master" + "<input type=\"checkbox\" name=\"hide\" value=\"" + d + "\" onchange=\"hide_plot(this)\"> Hide <input type=\"button\" name=\"" + d + "\" value=\"Split\" onclick=\"split(this)\">" + "</li>";
      }
        return "<li class=\"ui-state-default list-group-item track-merge\" name=\"" + d + "\">" + available_regions[active_regions]["title"][d]["target"] + " <input type=\"checkbox\" name=\"master\" value=\"" + d + "\" onchange=update_lists(this) checked> Master" + "<input type=\"checkbox\" name=\"hide\" value=\"" + d + "\" onchange=\"hide_plot(this)\"> Hide" + "</li>";
    })
    track_items = track_items.concat(active_track_ordering[active_regions].filter(function(d){
        return master_track.indexOf(d) == -1;
    }).map(function(d,i){
      if(master_track.length + i < max_graphs)
      {
        if (d.contains("+"))
          {
            return "<li class=\"ui-state-default list-group-item track-merge\" name=\"" + d + "\">" + available_regions[active_regions]["title"][d]["target"] + " <input type=\"checkbox\" name=\"master\" value=\"" + d + "\" onchange=update_lists(this) checked> Master" + "<input type=\"checkbox\" name=\"hide\" value=\"" + d + "\" onchange=\"hide_plot(this)\"> Hide <input type=\"button\" name=\"" + d + "\" value=\"Split\" onclick=\"split(this)\">" + "</li>";
          }
        return "<li class=\"ui-state-default list-group-item track-merge\" name=\"" + d + "\">" + available_regions[active_regions]["title"][d]["target"] + " <input type=\"checkbox\" name=\"master\" value=\"" + d + "\" onchange=update_lists(this)> Master" + "<input type=\"checkbox\" name=\"hide\" value=\"" + d + "\" onchange=\"hide_plot(this)\"> Hide" + "</li>";
      }
      else
      {
        return "<li class=\"ui-state-default list-group-item track-merge\" name=\"" + d + "\">" + available_regions[active_regions]["title"][d]["target"] + " <input type=\"checkbox\" name=\"master\" value=\"" + d + "\" onchange=update_lists(this)> Master" + "<input type=\"checkbox\" name=\"hide\" value=\"" + d + "\" onchange=\"hide_plot(this)\" checked> Hide" + "</li>";
      }
    }));

    //fingers crossed that this reorders the data with master track as major option
    active_track_ordering[active_regions] = master_track.concat(active_track_ordering[active_regions].filter(function(d)
    {
        return master_track.indexOf(d) == -1;
    }));

    $("#Track_List").append(track_items);
    setup_functionality();

}

function update_lists(d)
{
    //if true then want to add to the master list
    var probe = $(d).val();
    if (d.checked)
    {
      if(master_track.length < max_graphs)
      {
        master_track.push(probe);
      }
      else
      {
        alert("Hit maximum number of graphs for master track");
      }
    }
    else
    {
        //remove
        master_track.splice(master_track.indexOf(probe),1);
    }
}

//submit the ajax calls.
function set_up(regions,phenotype)
{
    //set up spinners
    var chip_opts = {
      lines: 13 // The number of lines to draw
    , length: 28 // The length of each line
    , width: 14 // The line thickness
    , radius: 42 // The radius of the inner circle
    , scale: 1 // Scales overall size of the spinner
    , corners: 1 // Corner roundness (0..1)
    , color: '#000' // #rgb or #rrggbb or array of colors
    , opacity: 0.25 // Opacity of the lines
    , rotate: 0 // The rotation offset
    , direction: 1 // 1: clockwise, -1: counterclockwise
    , speed: 1 // Rounds per second
    , trail: 60 // Afterglow percentage
    , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
    , zIndex: 2e9 // The z-index (defaults to 2000000000)
    , className: 'spinner' // The CSS class to assign to the spinner
    , top: '50%' // Top position relative to parent
    , left: '50%' // Left position relative to parent
    , shadow: false // Whether to render a shadow
    , hwaccel: false // Whether to use hardware acceleration
    , position: 'absolute' // Element positioning
    };
    var snp_opts = chip_opts;
    var chip_target = document.getElementById('CHIP_SEQ_Browser');
    chip_spinner = new Spinner(chip_opts).spin(chip_target);
    var snp_target = document.getElementById('SNP_Browser');
    snp_opts.top = '10%';
    snp_opts.length = 14;
    //console.log(chip_opts);
    snp_spinner = new Spinner(snp_opts).spin(snp_target);

    regions.forEach(function(d,i)
    {
        saved_regions[i] = {"start":Number(d.start),"end":Number(d.end)};
        current_regions[i] = {"start":Number(d.start),"end":Number(d.end)};
        available_regions[i] = {};
        cell_labels[i] = {};
        if(i == 0)
        {
          //make generic
          xlinearscale_all = d3.scale.linear()
                              .domain([d.start,d.end])
                              .range([0,dimensions.width - dimensions.left - dimensions.right]);
        }
        $('#sidebar_region').append('<button class="btn btn-lg btn-loading" id="region_' + i + '"><span class="glyphicon glyphicon-refresh glyphicon-refresh-animate"></span> ' +d.chr + ':' + d.start + '-' + d.end +'</button>');
        $('#region_' + i).click(function()
        {
            if(!$(this).attr("class").contains("btn-loading"))
            {
                var id = $(this)[0].id;
                var index = Number(id.substring(id.indexOf("_")+1,id.length));
                console.log(available_regions[index]);
                active_regions=index;
                if($(".btn-active").length > 0)
                {
                    $(".btn-active").removeClass(".btn-active").addClass("btn-ready");
                }
                $(this).removeClass("btn-ready").addClass("btn-active");

                //clear everything
                clearAll();
                //change the listing of available tracks
                toggle_items();

                start_snp = 0
                end_snp = d3.max(available_regions[active_regions]["snps"],function(d){return d.log_score});

                xlinearscale_all = d3.scale.linear()
                                     .domain([saved_regions[active_regions]["start"],saved_regions[active_regions]["end"]])
                                     .range([0,dimensions.width - dimensions.left - dimensions.right]);

                ylinearscale_snp = d3.scale.linear()
                                     .domain([start_snp,end_snp])
                                     .range([dimensions.height - dimensions.top - dimensions.bottom,5]);

                snp_spinner.stop();
                update_snp_seq(available_regions[active_regions]["snps"],saved_regions[active_regions]["start"],saved_regions[active_regions]["end"],false);
                chip_spinner.stop();
                active_track_ordering[active_regions].forEach(function(track_label,i){
                  if (i < max_graphs)
                  {
                      //function update_chip_seq(data,start_region,end_region,translate_height,graph_title,update_graphs)
                      update_chip_seq(available_regions[active_regions]["chip"][track_label],saved_regions[active_regions]["start"],saved_regions[active_regions]["end"],(dimensions.top + (i * dimensions.height)),available_regions[active_regions]["title"][track_label],track_label,false);
                  }
                });
            }
        });
        setup_functionality();
        $.ajax({
                method:"POST",
                headers: {
                    "X-CSRFToken":Cookies.get('csrftoken'),
                },
                url:"grab_snp_data",
                data:{"start":d.start,"end":d.end,"chr":d.chr,"pheno_id":phenotype[i]},
                success:function(snp_result)
                {
                    available_regions[i]["snps"] = snp_result["snps"];
                    available_regions[i]["ld"] = snp_result["ld"];
                    if (i == 0)
                    {
                      start_snp = 0
                      end_snp = d3.max(available_regions[active_regions]["snps"],function(d){return d.log_score});

                      ylinearscale_snp = d3.scale.linear()
                                          .domain([start_snp,end_snp])
                                          .range([dimensions.height - dimensions.top - dimensions.bottom,5]);

                      current_regions[active_regions]["start"] = d.start;
                      current_regions[active_regions]["end"] = d.end;
                      //plot the graph here.
                      snp_spinner.stop();
                      update_snp_seq(available_regions[i]["snps"],d.start,d.end,false);
                    }
                }
              });
        $.ajax({
                  method:"POST",
                  headers: {
                      "X-CSRFToken":Cookies.get('csrftoken'),
                  },
                  url:"grab_chip_seq",
                  data:{"start":d.start,"end":d.end,"chr":d.chr},
                  success:function(result)
                  {
                      console.log(result);
                      cell_labels[i]["chip"] = result["cell_labels"]
                      available_regions[i]["chip"] = result["tracks"];
                      available_regions[i]["title"] = result["title"];
                      active_track_ordering[i] = Object.keys(result["tracks"]);
                      $('#region_' + i).removeClass("btn-loading").addClass("btn-ready");
                      $('#region_' + i).find("span").removeClass("glyphicon-refresh").removeClass("glyphicon-refresh-animate").addClass("glyphicon-ok");
                      if (i == 0)
                      {
                          $('#region_' + i).removeClass("btn-ready").addClass("btn-active");
                          chip_spinner.stop();
                          active_track_ordering[active_regions].forEach(function(track_label,i)
                          {
                            if (i < max_graphs)
                            {
                              update_chip_seq(available_regions[active_regions]["chip"][track_label],d.start,d.end,(dimensions.top + (i * dimensions.height)),available_regions[active_regions]["title"][track_label],track_label,false);
                            }
                          });
                          toggle_items();
                      }
                  }
                });
    });
     //set the global d3 variables
    svg_chip_seq = d3.select("#CHIP_SEQ_Browser")
                    .append("svg")
                    .attr("height", dimensions.height * max_graphs)
                    .attr("width", dimensions.width);

    svg_graph_legend = d3.select("#plot_legend")
                         .append("svg")
                         .attr("height",200)
                         .attr("width",380);

    svg_snp_seq = d3.select("#SNP_Browser")
                 .append("svg")
                 .attr("height", dimensions.height)
                 .attr("width", dimensions.width)
                 .on("mousedown",function()
                  {
                     old_mouse_x = xlinearscale_all.invert(d3.mouse(this)[0]);
                  })
                 .on("mouseup",function()
                      {
                      new_coordinates_x = xlinearscale_all.invert(d3.mouse(this)[0]);
                      if(new_coordinates_x > old_mouse_x)
                      {
                        console.log(old_mouse_x);
                        console.log(new_coordinates_x);

                        xlinearscale_all = d3.scale.linear()
                                              .domain([old_mouse_x,new_coordinates_x])
                                              .range([0,dimensions.width - dimensions.left - dimensions.right]);

                        var new_snp_data = available_regions[active_regions]["snps"].filter(function(d)
                        {
                             return d.pos >= old_mouse_x && d.pos <= new_coordinates_x;
                        });
                        update_snp_seq(new_snp_data,old_mouse_x,new_coordinates_x,true);

                        active_track_ordering[active_regions].forEach(function(track_label,i)
                        {
                          if (i < max_graphs)
                          {
                            if (track_label.indexOf("+") != -1)
                            {
                              var merged_data = track_label.split("+")
                                                           .map(function(d)
                                                           {
                                                            return available_regions[active_regions]["chip"][d];
                                                           }).reduce(function(prev,next)
                                                           {
                                                              return prev.concat(next);
                                                           });
                              var new_chip_data = merged_data.filter(function(d)
                              {
                                  return d.start >= old_mouse_x && d.end <= new_coordinates_x;
                              });
                              update_chip_seq(new_chip_data,old_mouse_x,new_coordinates_x,(dimensions.top + (i * dimensions.height)),available_regions[active_regions]["title"][track_label],track_label,true);
                            }
                            else
                            {
                              var new_chip_data = available_regions[active_regions]["chip"][track_label].filter(function(d)
                              {
                                  return d.start >= old_mouse_x && d.end <= new_coordinates_x;
                              });
                              update_chip_seq(new_chip_data,old_mouse_x,new_coordinates_x,(dimensions.top + (i * dimensions.height)),available_regions[active_regions]["title"][track_label],track_label,true);
                            }
                          }
                        });
                        current_regions[active_regions]["start"] = old_mouse_x;
                        current_regions[active_regions]["end"] = new_coordinates_x;
                      }
                    });
}

function update_snp_seq(data,start_region,end_region,update_graphs)
{
  if(update_graphs)
  {
      var new_graph = svg_snp_seq.select("g")
                                  .selectAll("circle")
                                  .data(data);

      new_graph.exit().remove();
      new_graph.enter().append("circle");
      new_graph.transition()
                 .duration(7000)
                 .delay(200)
                 .attr("r",4)
                 .attr("cx",function(d){return xlinearscale_all(d.pos)})
                 .attr("cy",function(d){return ylinearscale_snp(d.log_score)})
                 .attr("data-toggle", "tooltip")
                 .attr("data-placement","top")
                 .attr("class", "snp")
                 .attr("fill",function(d){return (d["id"] in available_regions[active_regions]["ld"]) ?  ld_color_map(available_regions[active_regions]["ld"][d["id"]]) : ld_color_map(0)});

      new_graph.on("mouseover",highlight_locus)
               .on("mouseout",function(d)
               {
                    d3.selectAll("#highlight").remove();
               });
    
      var xAxis = d3.svg.axis()
                    .scale(xlinearscale_all)
                    .tickValues([start_region,end_region])
                    .tickFormat(d3.format(".2s"))
                    .orient("bottom");

      d3.selectAll(".x_axis")
          .transition()
          .duration(7000)
          .delay(200)
          .call(xAxis);
  }
  else
  {
     var svg_snp_g = svg_snp_seq.append("g")
                                .attr("transform","translate(" + dimensions.left + "," + dimensions.top + ")");

     var xAxis = d3.svg.axis()
                  .scale(xlinearscale_all)
                  .tickValues([start_region,end_region])
                  .tickFormat(d3.format(".2s"))
                  .orient("bottom");

    var yAxis = d3.svg.axis()
                   .scale(ylinearscale_snp)
                   .tickValues([start_snp,end_snp])
                   .orient("left");

    var circle = svg_snp_g.selectAll("circle")
               .data(available_regions[active_regions]["snps"]).enter()
               .append("circle");

    circle.attr("cx",function(d){return xlinearscale_all(d.pos)})
               .attr("cy",function(d){return ylinearscale_snp(d.log_score)})
               .attr("r",4)
               .attr("data-toggle", "tooltip")
               .attr("data-placement","top")
               .attr("class", "snp")
               .attr("fill",function(d){return (d["id"] in available_regions[active_regions]["ld"]) ?  ld_color_map(available_regions[active_regions]["ld"][d["id"]]) : ld_color_map(0)})
               .on("mouseover",highlight_locus)
               .on("mouseout",function(d)
               {
                    d3.selectAll("#highlight").remove();
               });

    svg_snp_g.append("g")
               .attr("transform","translate(0," + (dimensions.height - dimensions.bottom - dimensions.top) + ")")
               .attr("fill","none")
               .attr("stroke","black")
               .attr("shape-rendering","crispEdges")
               .attr("font-family","sans-serif")
               .attr("font-szie","11px")
               .attr("class","x_axis")
               .call(xAxis);

    svg_snp_g.append("g")
               .attr("fill","none")
               .attr("stroke","black")
               .attr("shape-rendering","crispEdges")
               .attr("font-family","sans-serif")
               .attr("font-szie","11px")
               .call(yAxis);
  }

  $(".snp").tipsy({
        html: true,
        title: function() {
        var d = this.__data__;
         return "<p> ID: " + d.id + "<br>Score: " + d.log_score.toFixed(3) + "<br>Pos: " + d.pos + "</p>";
        }
        //delayOut: 70000
      });
}

function update_chip_seq(data,start_region,end_region,translate_height,graph_title,accession,update_graphs)
{
  chip_start_point = 0;
  chip_end_point = Math.round(d3.max(data,function(d){return d.peak;}));
  //chip_end_point = 100;
  ylinearscale_chip = d3.scale.linear()
                        .domain([chip_start_point,chip_end_point])
                        .range([dimensions.height-dimensions.bottom-dimensions.top,10]);

  var new_title = "";
  if (graph_title.length > 1)
  {
    new_title = graph_title.reduce(function(prev,next)
                {
                  return prev["target"]+"+"+next["target"];
                });
  }
  else
  {
   new_title = (graph_title["replicate"] > 0) ? ("Target:" + graph_title["target"] + "|Lab:" + graph_title["lab"] + "|Replicate:" + graph_title["replicate"]) : ("Target:" + graph_title["target"] + "|Lab:" + graph_title["lab"]);
  }

  if(update_graphs)
  {
    var new_graph = svg_chip_seq.select("#"+accession.replace(/\+/g, '\\+'))
                                .selectAll("rect")
                                .data(data);

    //exit and remove
      new_graph.exit()
              .remove();

      //update existing elements
      new_graph.transition()
          .duration(7000)
          .delay(200)
          .attr("x",function(d){return xlinearscale_all(d.start)})
          .attr("width",function(d){return xlinearscale_all(d.end)-xlinearscale_all(d.start)})
          .attr("y", function(d){return (ylinearscale_chip(d.peak) < 10) ? 10 : ylinearscale_chip(d.peak)})
          .attr("height",function(d){return (ylinearscale_chip(d.peak) < 10) ? ylinearscale_chip(chip_start_point)-10 : ylinearscale_chip(chip_start_point) - ylinearscale_chip(d.peak)})
          .attr("fill","none")
          .attr("stroke",function(d){return d.id != undefined ? colormap(cell_labels[active_regions]["chip"][d.id.substr(d.id.indexOf("_")+1,d.id.length)]) : colormap(cell_labels[active_regions]["chip"][graph_title.substr(graph_title.indexOf("_")+1,graph_title.length)])});

      //enter new elements
      new_graph.enter().append("rect").style("opacity",0)
          .transition()
          .duration(9000)
          .delay(500)
          .attr("x",function(d){return xlinearscale_all(d.start)})
          .attr("width",function(d){return xlinearscale_all(d.end)-xlinearscale_all(d.start)})
          .attr("y", function(d){return (ylinearscale_chip(d.peak) < 10) ? 10 : ylinearscale_chip(d.peak)})
          .attr("height",function(d){return (ylinearscale_chip(d.peak) < 10) ? ylinearscale_chip(chip_start_point)-10 : ylinearscale_chip(chip_start_point) - ylinearscale_chip(d.peak)})
          .attr("fill","none")
          .attr("stroke",function(d){return d.id != undefined ? colormap(cell_labels[active_regions]["chip"][d.id.substr(d.id.indexOf("_")+1,d.id.length)]) : colormap(cell_labels[active_regions]["chip"][graph_title.substr(graph_title.indexOf("_")+1,graph_title.length)])})
          .style("opacity",1);

    var xAxis = d3.svg.axis()
                  .scale(xlinearscale_all)
                  .tickValues([start_region,end_region])
                  .tickFormat(d3.format(".2s"))
                  .orient("bottom");

    d3.selectAll(".x_axis")
        .transition()
        .duration(7000)
        .delay(200)
        .call(xAxis);
  }
  else
  {
    
    var new_graph= svg_chip_seq.append("g")
                                .attr("id",accession)
                                .attr("transform", "translate(" + dimensions.left + "," + translate_height + ")");

      new_graph.append("text")
            .attr("x",dimensions.width/4)
            .attr("y",0)
            .text(new_title);

      new_graph.selectAll("rect")
            .data(data)
            .enter().append("rect")
            .attr("x",function(d){return xlinearscale_all(d.start)})
            .attr("width",function(d){return xlinearscale_all(d.end)-xlinearscale_all(d.start)})
            .attr("y", function(d){return (ylinearscale_chip(d.peak) < 10) ? 10 : ylinearscale_chip(d.peak)})
            .attr("height",function(d){return (ylinearscale_chip(d.peak) < 10) ? ylinearscale_chip(chip_start_point)-10 : ylinearscale_chip(chip_start_point) - ylinearscale_chip(d.peak)})
            .attr("fill","none")
            .attr("stroke",function(d){return d.id != undefined ? colormap(cell_labels[active_regions]["chip"][d.id.substr(d.id.indexOf("_")+1,d.id.length)]) : colormap(cell_labels[active_regions]["chip"][graph_title.substr(graph_title.indexOf("_")+1,graph_title.length)])});


        var xAxis = d3.svg.axis()
                          .scale(xlinearscale_all)
                          .tickValues([start_region,end_region])
                          .tickFormat(d3.format(".2s"))
                          .orient("bottom");

        var yAxis = d3.svg.axis()
                          .scale(ylinearscale_chip)
                          .tickValues([chip_start_point,chip_end_point])
                          .tickFormat(d3.format(".2s"))
                          .orient("left");

        new_graph.append("g")
            .attr("transform","translate(0," + (dimensions.height - dimensions.top - dimensions.bottom) + ")")
            .attr("fill","none")
            .attr("stroke","black")
            .attr("shape-rendering","crispEdges")
            .attr("font-family","sans-serif")
            .attr("font-szie","11px")
            .attr("class","x_axis")
            .call(xAxis);

        new_graph.append("g")
            .attr("fill","none")
            .attr("stroke","black")
            .attr("shape-rendering","crispEdges")
            .attr("font-family","sans-serif")
            .attr("font-szie","11px")
            .attr("class","y_axis")
            .call(yAxis);
  }
}