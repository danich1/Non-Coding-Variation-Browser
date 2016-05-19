import pandas as pd
import sys
import os
#folder that contains the bigwigtobedgraph program
basename = "/Users/Dave/Documents/Voight_lab/CHIP-Seq/"
#absolute path of file to convert (NO FILE EXTENSION)
file_name = sys.argv[1]
chrom = sys.argv[2]
start = sys.argv[3]
end = sys.argv[4]
os.system("%s/bigWigToBedGraph %s.bigWig %s.bedgraph -chrom=%s -start=%d -end=%d" % (basename,file_name,file_name,chrom,int(start),int(end)))