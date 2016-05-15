#Non-Coding-Variation-Browser 
##Version
alpha 1.0

##Description
The aim of this project is to provide users a way to visualize Genome Wide Association (GWAS) data in conjunction with the non-coding portion of the human genome (histones marks, transcription factor binding sites, etc.).
(Non-coding data obtained from the [Encode Project] (https://www.encodeproject.org/)). 

##Dependencies
  - python 2.7.X
  - django module
  - tqdm module
  - pandas module
  - sqlite3 module
  - gzip module

##Installation Guide
###Installing The Missing Python Modeules
To install the missing modules use the python package manager [pip](https://pip.pypa.io/en/stable/). Please verify all the necessary modules are installed by following these commands: 
  1. Open a terminal
  2. type in `python` to open the python interpreter. 
  3. type in the `import` and then the name of the module you want to test
    1. if there is no output, then the module is successfully installed
    2. if an error is received, then the given module is missing

###Quick steps to running the server
After cloning this repository, open a terminal and navigate to the repository folder. Once in the repository folder type `ls` or `dir` to get a listing of files within the directory. If you see a `manage.py` file, then you are in the correct directory. The `manage.py` file is essential for setting up the django server and majority of the commands will involve this file. Once you have found the 'manage.py' file, type this command: 'python manage.py migrate'. After viewing the output, a db.sqlite3 file should be generated. (This is the database file that django will be using to read/write the data). The database will initially be empty, so to insert data please refer to the file: `production_database_inserter.py`. Lastly, when the database has been set up and the database has been set up, type this command to start the server: 'python manage.py runserver'. This command will run the server in debug mode. To access the website open your favorite browser and type this address into the url: `127.0.0.1:8000/NCVB`. If everything goes well, the browser should load the welcome screen. After loading the welcome screen, using the browser should be straight forward.

##Future Ideas/Directions
- [X] GWAS Asssociation plot 
- [X] CHIP-Seq/DNAse track plot
- [X] Multiple Loci Queue 
- [ ] Create Encode Track Recommender for a given locus
- [ ] Refactor the server to incorporate multi-processing/multithreading (Speed-up)
- [ ] Set-up External Database
