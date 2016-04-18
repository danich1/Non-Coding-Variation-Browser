var chromosomes = [
    {"chromosome": "chr1", "size":249250621},
    {"chromosome": "chr2", "size":243199373},
    {"chromosome": "chr3", "size":198022430},
    {"chromosome": "chr4", "size":191154276},
    {"chromosome": "chr5", "size":180914260},
    {"chromosome": "chr6", "size":171115067},
    {"chromosome": "chr7", "size":159138663},
    {"chromosome": "chr8", "size":146364022},
    {"chromosome": "chr9", "size":141213431},
    {"chromosome": "chr10","size":135534747},
    {"chromosome": "chr11","size":135006516},
    {"chromosome": "chr12","size":133851895},
    {"chromosome": "chr13","size":115169878},
    {"chromosome": "chr14","size":107349540},
    {"chromosome": "chr15","size":102531392},
    {"chromosome": "chr16","size":90354753},
    {"chromosome": "chr17","size":81195210},
    {"chromosome": "chr18","size":78077248},
    {"chromosome": "chr19","size":59128983},
    {"chromosome": "chr20","size":63025520},
    {"chromosome": "chr21","size":48129895},
    {"chromosome": "chr22","size":51304566},
    {"chromosome": "chrX", "size":155270560},
    {"chromosome": "chrY", "size":59373566}
]
$(document).ready(function(){
    $.ajax({
        method:"GET",
        url:"get_phenotypes",
        success:function(phenotypes)
        {
            phenotypes.forEach(function(trait,i)
            {
                 $("#trait_list").append("<option id=\"" + trait + "\" value=\"" + trait + "\">" + trait + "</option>");
            });
        }
    });
    chromosomes.forEach(function(d)
    {
        $("#chr_list").append("<option id=\""+d.chromosome+ "\" value=\"" + d.chromosome + "\">" +d.chromosome+"</option>")
    });
    $(function()
    {
        $( "#start" ).val(1000000);
        $( "#end" ).val(2000000);
        $("#slider").slider({
        range: true,
        min: 1,
        max: (chromosomes[0].size+1000000),
        values: [1000000,2000000],
        slide: function(event, ui)
            {
                $( "#start" ).val(ui.values[0]);
                $( "#end" ).val(ui.values[1]);
            },
        step:1000000
        });
        $("#chr_list").change(function(e){
            var chr = chromosomes.filter(function(d){return d.chromosome == $("#chr_list").val()})[0];
            $("#slider").slider("destroy");
            //console.log(chr.size);
            $("#slider").slider({
                range: true,
                min: 1,
                max: (chr.size+10000),
                values: [1,10000],
                slide: function(event, ui)
                    {
                        $( "#start" ).val(ui.values[0]);
                        $( "#end" ).val(ui.values[1]);
                    },
                step:10000
             });
            //chr11
            //$( "#start" ).val(8000000);
             //$( "#end" ).val(8500000);
            //chr2
            //$( "#start" ).val(240995013);
             //$( "#end" ).val(241995013);
             //chr4
             //$( "#start" ).val(6391519);
             //$( "#end" ).val(7391519);
             //chr 13
             $( "#start" ).val(95398207);
             $( "#end" ).val(96398207);
        });
    });
});

function add()
{
    var start = $("#start").val();
    var end = $("#end").val();
    var chrom = $("#chr_list").val();
    var trait = $("#trait_list").val();
    $("#test").append("<tr><td>" + chrom + "</td><td>" + start + "</td><td>" + end + "</td><td>" + trait + "</td></tr>");
    $("#region_input").val($("#region_input").val() + (chrom+","+start+","+end+";"));
    $("#pheno_id").val($("#pheno_id").val() + trait);
}

function submit()
{
    $("form").submit();
}