import time
import tqdm
import argparse
import pandas as pd
import math
import os
import sqlite3
import re

parser = argparse.ArgumentParser(prog="CHIP Database Inserter",description="This is a database inserter that takes chip signals/snp information and converts them into json format.")
parser.add_argument("-cp","--chip_peak", help="Use this to parser bed files",action='store_true')
parser.add_argument("-s", "--snp", help="Use this to parse snp_location files", nargs=3, metavar=("SNP_File","Source","Trait"))
parser.add_argument("-d", "--ld", help="Use this to parse LD files", nargs=3, metavar=("LD_File","Chr","Population"))
args = parser.parse_args()

#set up the directory path
base_name = "/Users/Dave/Documents/Voight_Lab/CHIP-Seq/"

#set up the database connection
conn = sqlite3.connect("/Users/Dave/Desktop/gwas_seq/db.sqlite3")

if args.chip_peak:
    query = conn.cursor()
    tracker = pd.read_csv(base_name + "Chip_Peaks/tracker.csv")
    start = time.time()
    query.execute("SELECT accession FROM nc_snp_chip_label")
    labels = {item[0] for item in query.fetchall()}
    query.execute("SELECT Max(id) FROM nc_snp_chip_seq")
    result = query.fetchall()[0]
    with open("track.txt","w") as g:
        counter = result[0]+1 if len(result) > 0 else 1
        print counter
        for index,file_row in tracker.iterrows():
            if os.path.splitext(file_row["File Name"])[0] not in labels:
                query.execute("INSERT INTO nc_snp_chip_label (accession,lab,cell_type,label,replicate) VALUES ('%s','%s','%s','%s','%d')" % (os.path.splitext(file_row["File Name"])[0],file_row["Lab"],file_row["Biosample Term Name"],file_row["Target"],file_row["Replicate"] if not(pd.isnull(file_row["Replicate"])) else -1))
            print base_name + os.path.splitext(file_row["File Name"])[0] + ".bedGraph"
            with open(base_name + "Chip_Peaks/" + os.path.splitext(file_row["File Name"])[0] + ".bedGraph","r") as f:
                for line in tqdm.tqdm(f):
                    data = line.strip().split("\t")
                    g.write("%d,%s,%d,%d,%f,%s\n" % (counter,data[0],int(data[1]),int(data[2]),float(data[3]),os.path.splitext(file_row["File Name"])[0]))
                    counter = counter + 1
    end = time.time()
    print "Total Time: (%fs)" % (end-start)
    conn.commit()
    query.close()

if not(args.snp):
    query = conn.cursor()
    #update this for each snp file
    header_label = {"chromosome":0, "position":2,"rs_number":1,"pvalue":3}
    print "Gathering The Data"
    query.execute("INSERT OR IGNORE INTO nc_snp_source (source_name) VALUES ('%s')" % (args.snp[1]))
    query.execute("INSERT OR IGNORE INTO nc_snp_phenotype (name) VALUES ('%s')" % (args.snp[2]))
    print "Starting the Insertion"
    start = time.time()
    query.execute("SELECT Max(id) FROM nc_snp_phenotypemap")
    result = query.fetchall()[0]
    with open(base_name + args.snp[0],"r") as f:
        f.readline()
        with open("snp.txt", "w") as g:
            with open("phenomap.txt", "w") as h:
                counter = result[0]+1 if len(result) > 0 else 1
                for line in tqdm.tqdm(f):
                    data = re.split(r"[\s]+",line.strip())
                    g.write("%s,%s,%d\n"%(data[header_label["chromosome"]],data[header_label["rs_number"]],int(float(data[header_label["position"]]))))
                    h.write("%d,s,%f,%s,%s,%s\n" % (counter,float(data[header_label["pvalue"]]),-math.log10(float(data[header_label["pvalue"]])),args.snp[2],data[header_label["rs_number"]],args.snp[1]))
                    counter = counter + 1
                      #  query.executemany("INSERT OR IGNORE INTO nc_snp_snp (chrom,position,rs_id) VALUES (?,?,?)",chunk_snp)
                      #  query.executemany("INSERT OR IGNORE INTO nc_snp_phenotypemap (snp_id,phenotype_id,p_val,log_score,source_id) VALUES (?,?,?,?,?)",chunk_data)
    end = time.time()
    print "Total Time: (%fs)" % (end-start)
    conn.commit()
    query.close()

if not(args.ld):
    query = conn.cursor()
    query.execute("SELECT rs_id,position FROM nc_snp_snp WHERE chrom='%s'" % (args.ld[1]))
    unfound_positions = {data[1]:data[0] for data in query.fetchall()}
    query.execute("SELECT Max(id) FROM nc_snp_r_squared")
    result = query.fetchall()[0]
    start = time.time()
    with open(base_name + args.ld[0],"r") as f:
        f.readline()
        counter = result[0] if len(result) > 0 else 1
        with open("r_squared.txt","w") as g:
            for line in tqdm.tqdm(f):
                # 1 4
                data = re.split(r"[\s]+",line.strip())
                data[1] = int(data[1])
                data[4] = int(data[4])
                if data[1] in unfound_positions and data[4] in unfound_positions:
                    g.write("%d,%f,%s,%s,%s\n" % (counter,float(data[6]),args.ld[2],unfound_positions[data[1]],unfound_positions[data[4]]))
                    counter = counter + 1
    end = time.time()
    print "Total Time: (%fs)" % (end-start)
    conn.commit()
    query.close()

conn.close()