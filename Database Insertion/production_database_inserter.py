import time
import argparse
import pandas as pd
import math
import os
import sqlite3
import re
import gzip

parser = argparse.ArgumentParser(prog="CHIP Database Inserter",description="This is a database inserter that takes chip signals/snp information and converts them into json format.")
parser.add_argument("-tr", "--track_info", help="Use this to insert track access information",nargs=1,metavar=("Track Metadata File"))
parser.add_argument("-cp","--chip_peak", help="Use this to parse the track file",action='store_true')
parser.add_argument("-s", "--snp", help="Use this to parse snp_location files", nargs=2, metavar=("SNP_File","Trait"))
parser.add_argument("-d", "--ld", help="Use this to parse LD files", nargs=2, metavar=("LD_File","Population"))
parser.add_argument("-c", "--chr", help="Use this option to narrow the data insertion to a given chromosome (chr# or chrX or chrY). ", nargs=1, metavar=("chromosome"))
args = parser.parse_args()
base_file_path = "/Users/Dave/Documents/Voight_lab/CHIP-Seq/Chip_Peaks/"

#set up the database connection
conn = sqlite3.connect("db.sqlite3")
print "WRITING TRACK INFO"
if args.track_info:
    query = conn.cursor()
    tracker = pd.read_csv(args.track_info[0])
    query.execute("SELECT accession FROM nc_snp_chip_label")
    labels = {item[0] for item in query.fetchall()}
    for index,file_row in tracker.iterrows():
        if os.path.splitext(file_row["File Name"])[0] not in labels:
            query.execute("INSERT OR IGNORE INTO nc_snp_chip_label (accession,lab,cell_type,label,replicate) VALUES ('%s','%s','%s','%s','%d')" % (os.path.splitext(file_row["File Name"])[0],file_row["Lab"],file_row["Biosample Term Name"],file_row["Target"],file_row["Replicate"] if not(pd.isnull(file_row["Replicate"])) else -1))
    query.close()

    print "WRITING CHIP DATA"
    if args.chip_peak:
        query = conn.cursor()
        start = time.time()
        query.execute("SELECT 1 FROM nc_snp_chip_seq")
        result = query.fetchall()
        if len(result) != 0:
            query.execute("SELECT Max(id) FROM nc_snp_chip_seq")
            result = query.fetchall()[0]
        for seq_file in tracker["File Name"].values:
            seq_file =  base_file_path + seq_file[0:seq_file.index('.')] + ".bedgraph"
            with open(seq_file,"r") as f:
                counter = result[0]+1 if len(result) > 0 else 1
                for line in f:
                    data = line.split("\t")
                    chrom = data[0]
                    seq_start = data[1]
                    seq_end = data[2]
                    seq_value = data[3]
                    query.execute("INSERT OR IGNORE INTO nc_snp_chip_seq (id,chr,start,end,peak,label_id) VALUES ('%d','%s','%d','%d','%f','%s')" % (counter,chrom,int(seq_start),int(seq_end),float(seq_value),os.path.splitext(seq_file.split("/")[-1])[0]))
                    counter = counter + 1
        end = time.time()
        print "Time Taken: %fs" % (end-start)
        query.close()

print "WRITING SNP DATA"
if  args.snp:
    snp_dict = {}
    query = conn.cursor()
    #update this for each snp file
    header_label = {"chromosome":0,"rs_number":1,"position":2,"pvalue":3}
    query.execute("INSERT OR IGNORE INTO nc_snp_phenotype (name) VALUES ('%s')" % (args.snp[1]))
    start = time.time()
    query.execute("SELECT 1 FROM nc_snp_phenotypemap")
    result = query.fetchall()
    if len(result) != 0:
        query.execute("SELECT Max(id) FROM nc_snp_phenotypemap")
        result = query.fetchall()[0]
    with open(args.snp[0],"r") as f:
        row_id = result[0] if len(result) > 0 else 1
        f.readline()
        for line in f:
            data = re.split(r"[\s]+",line.strip())
            if args.chr:
                if data[header_label["chromosome"]] == args.chr:
                    snp_dict[data[header_label["position"]]] = data[header_label["rs_number"]]
                    query.execute("INSERT OR IGNORE INTO nc_snp_snp (chrom,rs_id,position) VALUES ('%s','%s','%d')" % (data[header_label["chromosome"]],data[header_label["rs_number"]],int(data[header_label["position"]])))
                    query.execute("INSERT OR IGNORE INTO nc_snp_phenotypemap (id,p_val,log_score,phenotype_id,snp_id) VALUES('%d','%.4g','%f','%s','%s') " % (row_id,float(data[header_label["pvalue"]]),math.log10(float(data[header_label["pvalue"]])),args.snp[1],data[header_label["rs_number"]]))
                    row_id = row_id + 1
            else:
                snp_dict[data[header_label["position"]]] = data[header_label["rs_number"]]
                query.execute("INSERT OR IGNORE INTO nc_snp_snp (chrom,rs_id,position) VALUES ('%s','%s','%d')" % (data[header_label["chromosome"]],data[header_label["rs_number"]],int(data[header_label["position"]])))
                query.execute("INSERT OR IGNORE INTO nc_snp_phenotypemap (id,p_val,log_score,phenotype_id,snp_id) VALUES('%d','%.4g','%f','%s','%s') " % (row_id,float(data[header_label["pvalue"]]),math.log10(float(data[header_label["pvalue"]])),args.snp[1],data[header_label["rs_number"]]))
                row_id = row_id + 1

    print "WRITING LD DATA"
    if args.ld:
        query.execute("SELECT Max(id) FROM nc_snp_r_squared")
        result = query.fetchall()[0]
        row_id = result[0] if len(result) > 0 else 1
        with open(args.ld[0],"r") as f:
            f.readline()
            for line in f:
                data = re.split(r"[\s]+",line.strip())
                if data[1] in snp_dict:
                    if data[4] in snp_dict:
                        query.execute("INSERT OR IGNORE INTO nc_snp_r_squared (id,val,population,snp_A_id,snp_B_id) VALUES ('%d','%f','%s','%s','%s')" % (row_id,data[6],args.ld[1],snp_dict[data[1]],snp_dict[data[4]]))
                        row_id = row_id + 1
    end = time.time()
    print "Time Taken: %fs" % (end-start)
    query.close()

conn.commit()
conn.close()