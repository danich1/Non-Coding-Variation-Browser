#!/usr/bin/env python

from cruzdb import Genome
import sys
import re
import tqdm
import pandas as pd
limit = 1000
build = sys.argv[1]
fname = sys.argv[2]
mybuild = Genome(build)
if (re.search("hg19",build)):
    snpdb = mybuild.snp138
elif (re.search("hg18",build)):
    snpdb = mybuild.snp130
with open(sys.argv[3], "w") as f:
    counter = 0
    f.write("chrom\tstart\tend\tname\tscore\tstrand\n")
    rs_ids = pd.read_csv(fname,names=["id"])
    for index in tqdm.tqdm(range(0,rs_ids.shape[0],limit)):
        result = snpdb.filter(snpdb.name.in_(list(rs_ids["id"][index:index + limit]))).limit(limit).all()
        f.write("\n".join(map(lambda x: str(x),result)))
        f.write("\n")