from django.shortcuts import render
from django.db.models import Q
from django.http import HttpResponse,Http404
from .models import *
from collections import defaultdict
import json
import random

# Create your views here.
def initialize(request):
    return render(request, 'nc_snp/welcome_screen.html')

def get_phenotypes(request):
    return HttpResponse(json.dumps([item.name for item in Phenotype.objects.all()]),content_type='application/json')

def browse(request):
    if request.method == 'POST':
        regions = [{"start":region[1],"end":region[2],"chr":region[0]}  for region_str in request.POST.get("region_selected").split(";") for region in [region_str.split(",")] if len(region_str) > 1]
        phenotypes = [trait for trait in request.POST.get("pheno_id").split(";")]
        return render(request,'nc_snp/region_viewer.html',{"regions":json.dumps(regions),"pheno_id":json.dumps(phenotypes)})
    raise Http404("Error needs to be POST")

def grab_chip_seq(request):
    #csrf_token
    if request.method == 'POST':
        cell_labels = set({})
        start = request.POST.get("start")
        end = request.POST.get("end")
        chromosome = request.POST.get("chr")
        output_chip_data = defaultdict(list)
        chip_data_title = defaultdict(dict)
        data = Chip_Seq.objects.filter(Q(chr=chromosome) & Q(start__gt=start) & Q(end__lt=end))
        for item in data:
            if item.label.cell_type not in cell_labels:
                cell_labels.add(item.label.cell_type)
            output_chip_data[item.label.accession].append({"start":item.start,"end":item.end,"peak":item.peak,"id":item.label.cell_type})
            chip_data_title[item.label.accession] = {"target":item.label.label,"lab":item.label.lab,"replicate":item.label.replicate}
        return HttpResponse(json.dumps({"tracks":output_chip_data,"cell_labels":{item:index for index,item in enumerate(cell_labels)},"title":chip_data_title}),content_type='application/json')
    raise Http404("Error need POST method!!!")

def grab_snp_data(request):
    if request.method == 'POST':
        start = request.POST.get("start")
        end = request.POST.get("end")
        chromosome = request.POST.get("chr")
        phenotype = request.POST.get("pheno_id")
        snp_names = SNP.objects.filter(Q(chrom=chromosome) & Q(position__gte=start) & Q(position__lte=end))
        output_snp_data = [{"pos":item.snp.position,"id":item.snp.rs_id,"log_score":item.log_score} for item in PhenotypeMap.objects.filter(Q(snp__in=snp_names) & Q(phenotype_id=phenotype))]
        max_snp = max(output_snp_data,key=lambda x: x["log_score"])
        output_ld_data = {item.snp_B.rs_id:item.val for item in R_Squared.objects.filter(Q(snp_A=max_snp)&Q(snp_B__in=snp_names))}
        output_ld_data[max_snp["id"]] = -1
        return HttpResponse(json.dumps({"snps":output_snp_data,"ld":output_ld_data}),content_type='application/json')
    return Http404("Not Implemented Yet!")

def test(request):
    return render(request, 'nc_snp/test.html')