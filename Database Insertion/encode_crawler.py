import urllib
import requests
import json
import tqdm
import os
import sys

def chunk_report(bytes_so_far, chunk_size, total_size):
   percent = float(bytes_so_far) / total_size
   percent = round(percent*100, 2)
   sys.stdout.write("Downloaded %d of %d bytes (%0.2f%%)\r" %
       (bytes_so_far, total_size, percent))

   if bytes_so_far >= total_size:
      sys.stdout.write('\n')

def chunk_read(response, file_obj, chunk_size=8192, report_hook=None):
   total_size = response.info().getheader('Content-Length').strip()
   total_size = int(total_size)
   bytes_so_far = 0

   while 1:
      chunk = response.read(chunk_size)
      bytes_so_far += len(chunk)

      if not chunk:
         break

      if report_hook:
         report_hook(bytes_so_far, chunk_size, total_size)

      file_obj.write(chunk)

base_file_path = "/Users/Dave/Documents/Voight_Lab/CHIP-Seq/Chip_Peaks/"
tracker_file = base_file_path + "tracker.csv"
HEADER = {'accept': 'application/json'}
URL = "https://www.encodeproject.org"
cell_type = ""
target = "GATA3"

if not(os.path.exists(tracker_file)):
    with open(tracker_file,"w") as f:
        f.write("File Name,Target,Build,Biosample Term Name,Lab,Database,Replicate\n")

with open(tracker_file,"a") as f:
    response = requests.get(URL + "/search/?searchTerm=%s&type=Experiment&limit=all" % (target),headers=HEADER)
    response_json_dict = response.json()
    if cell_type != "":
        potential_locations = [object for object in response_json_dict["@graph"] if len(object["replicates"]) > 0 and object["replicates"][0]["library"]["biosample"]["organism"]["scientific_name"] == "Homo sapiens" and object["biosample_term_name"].lower() == cell_type.lower()]
    else:
        potential_locations = [object for object in response_json_dict["@graph"] if len(object["replicates"]) > 0 and object["replicates"][0]["library"]["biosample"]["organism"]["scientific_name"] == "Homo sapiens"]

    if len(potential_locations) < 1:
        print "No results found"

    for location in tqdm.tqdm(potential_locations):
        location_response = requests.get(URL + location["@id"],headers=HEADER)
        location_response_dict = location_response.json()
        #chip_files = [file for file in location_response_dict["files"] if file["file_type"] == "bigwig" or file["file_type"]=="bed broadPeak"]
        chip_files = [file for file in location_response_dict["files"] if file["file_type"]=="bigWig"]
        for chip_file in chip_files:
            print "\n%s\n" %(os.path.basename(chip_file["href"]))
            #urllib.urlretrieve(URL + chip_file["href"],"/Users/Dave/Documents/Voight_Lab/CHIP-Seq/Chip_Peaks/%s" % (os.path.basename(chip_file["href"])))
            with open(base_file_path + os.path.basename(chip_file["href"]),"wb") as g:
                sys.stdout.write('\n')
                chunk_read(urllib.urlopen(URL + chip_file["href"]),g,report_hook=chunk_report,)
            f.write("%s,%s,%s,%s,\"%s\",%s,%s\n" % (os.path.basename(chip_file["href"]),location["target"]["label"],chip_file["assembly"],location["biosample_term_name"],location["lab"]["title"],location["award"]["project"],"" if len(chip_file["biological_replicates"]) == 0 else chip_file["biological_replicates"][0]))
    #print json.dumps(response_json_dict,indent=4, separators=(',', ': '))
