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
parser.add_argument("-cp","--chip_peak", help="Use this to parse the track file",nargs='+',metavar=("<Track File>"))
parser.add_argument("-s", "--snp", help="Use this to parse snp_location files", nargs=2, metavar=("SNP_File","Trait"))
parser.add_argument("-d", "--ld", help="Use this to parse LD files", nargs=2, metavar=("LD_File","Population"))
parser.add_argument("-c", "--chr", help="Use this to specify a specific chromosome (chr# or chrX or chrY) if -cp or --chip_peak is not used", nargs=1, metavar=("chromosome"))
args = parser.parse_args()

#set up the database connection
conn = sqlite3.connect("db.sqlite3")
if args.track_info:
    query = conn.cursor()
    tracker = pd.read_csv(args.track_info[0])
    query.execute("SELECT accession FROM nc_snp_chip_label")
    labels = {item[0] for item in query.fetchall()}
    for index,file_row in tracker.iterrows():
        if os.path.splitext(file_row["File Name"])[0] not in labels:
            query.execute("INSERT INTO nc_snp_chip_label (accession,lab,cell_type,label,replicate) VALUES ('%s','%s','%s','%s','%d')" % (os.path.splitext(file_row["File Name"])[0],file_row["Lab"],file_row["Biosample Term Name"],file_row["Target"],file_row["Replicate"] if not(pd.isnull(file_row["Replicate"])) else -1))
    query.close()

if args.chip_peak:
    query = conn.cursor()
    start = time.time()
    query.execute("SELECT Max(id) FROM nc_snp_chip_seq")
    result = query.fetchall()[0]
    for seq_file in args.chip_peak:
        with gzip.open(seq_file,"r") as f:
            for line in f:
                counter = result[0]+1 if len(result) > 0 else 1
                data = line.split("\t")
                chrom = data[0]
                seq_start = data[1]
                seq_end = data[2]
                seq_value = data[3]
                print "INSERT INTO nc_snp_chip_seq (id,chr,start,end,peak,label_id) VALUES ('%d','%s','%d','%d','%f','%s')" % (counter,chrom,int(seq_start),int(seq_end),float(seq_value),os.path.splitext(seq_file.split("/")[-1])[0])
                counter = counter + 1
    end = time.time()
    print "Time Taken: %fs" % (end-start)
    query.close()

if  args.snp:
    snp_dict = {}
    query = conn.cursor()
    #update this for each snp file
    header_label = {"rs_number":0,"chromosome":1,"position":2,"pvalue":3}
    query.execute("INSERT OR IGNORE INTO nc_snp_phenotype (name) VALUES ('%s')" % (args.snp[2]))
    start = time.time()
    query.execute("SELECT Max(id) FROM nc_snp_phenotypemap")
    result = query.fetchall()[0]
    with open(args.snp[0],"r") as f:
        row_id = result[0] if len(result) > 0 else 1
        f.readline()
        for line in f:
            data = re.split(r"[\s]+",line.strip())
            if args.chr:
                if data[header_label["chromosome"]] == args.chr:
                    snp_dict[data[header_label["position"]]] = snp_dict[data[header_label["rs_number"]]]
                    query.execute("INSERT OR IGNORE INTO nc_snp_snp (chrom,rs_id,postion) VALUES ('%s','%s','%d')" % (data[header_label["chromosome"]],data[header_label["rs_number"]],data[header_label["position"]]))
                    query.execute("INSERT OR IGNORE INTO nc_snp_phenotypemap (id,p_val,log_score,phenotype_id,snp_id) VALUES('%d','%.4g','%f','%s','%s') " % (row_id,data[header_label["pvalue"]],math.log10(data[header_label["pvalue"]]),args.snp[1],data[header_label["rs_number"]]))
                    row_id = row_id + 1
            else:
                snp_dict[data[header_label["position"]]] = snp_dict[data[header_label["rs_number"]]]
                query.execute("INSERT OR IGNORE INTO nc_snp_snp (chrom,rs_id,postion) VALUES ('%s','%s','%d')" % (data[header_label["chromosome"]],data[header_label["rs_number"]],data[header_label["position"]]))
                query.execute("INSERT OR IGNORE INTO nc_snp_phenotypemap (id,p_val,log_score,phenotype_id,snp_id) VALUES('%d','%.4g','%f','%s','%s') " % (row_id,data[header_label["pvalue"]],math.log10(data[header_label["pvalue"]]),args.snp[1],data[header_label["rs_number"]]))
                row_id = row_id + 1

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
    query.close()

conn.commit()
conn.close()