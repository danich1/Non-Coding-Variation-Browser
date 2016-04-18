import sys
import struct
import tqdm
import time
import os
import glob
import gzip
chr = sys.argv[1]
start = sys.argv[2]
end = sys.argv[3]

#current algorithm has 351 MB to 195 MB (45% space decrease)
with gzip.open("/Users/Dave/Documents/Voight_lab/CHIP-Seq/test.index.gz","wb") as f:
    if chr == "X":
        f.write(struct.pack(">b",23))
    elif chr == "Y":
        f.write(struct.pack(">b",24))
    else:
        f.write(struct.pack(">b",int(chr))) # one byte
    f.write(struct.pack(">I",int(start))) # 4 bytes
    f.write(struct.pack(">I",int(end))) # 4 bytes
    for file_name in tqdm.tqdm(glob.glob("/Users/Dave/Documents/Voight_lab/CHIP-Seq/Chip_Peaks/*.bedgraph")):
        with open(file_name,"r") as g:
            count = 0
            for line in g:
                count = count + 1
            g.seek(0,0)
            pos = 1
            f.write(os.path.splitext(os.path.basename(file_name))[0]) # 11 bytes
            f.write(struct.pack(">Q",count)) # 8 bytes
            for line in g:
                data = line.strip().split("\t")
                f.write(struct.pack(">I",int(data[1]))) # 4 bytes
                f.write(struct.pack(">I",int(data[2]))) # 4 bytes
                f.write(struct.pack(">H",int(round(float(data[3]))))) # 2 bytes