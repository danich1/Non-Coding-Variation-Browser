from __future__ import unicode_literals

from django.db import models

# Create your models here.

#This is the Phenotype model that represents a phenotype that a gene is associated with
class Phenotype(models.Model):
    name = models.CharField(max_length=400, primary_key=True)
    def __str__(self):
        return "%s" % (str(self.name))

class Source(models.Model):
    source_name = models.CharField(max_length=100,primary_key=True)

    def __str__(self):
        return "%s" % (self.source_name)

class Chip_Label(models.Model):
    label = models.CharField(max_length=100)
    lab = models.CharField(max_length=200)
    cell_type = models.CharField(max_length=200)
    replicate = models.IntegerField(default=-1)
    accession = models.CharField(max_length=200,primary_key=True)

    def __str__(self):
        return "%s %s %s %s" % (self.label,self.lab,self.cell_type,self.replicate)

#This is the snp model that represents a given snp
class SNP(models.Model):
    chrom = models.CharField(max_length=6)
    rs_id = models.CharField(max_length=200,primary_key=True,default='unknown')
    r_sq = models.ManyToManyField('self',through='R_Squared',symmetrical=False)
    position = models.IntegerField()
    phenotype = models.ManyToManyField(Phenotype,through='PhenotypeMap')

    def __str__(self):
        return "%s" % (self.rs_id)

#This is the R_squared class that represents the ld scores between snps only considering >0.5 values
class R_Squared(models.Model):

    class Meta:
        unique_together=(("snp_A","snp_B","population"),)

    snp_A = models.ForeignKey(SNP)
    snp_B = models.ForeignKey(SNP,related_name='snp_B')
    val = models.FloatField()
    population = models.CharField(max_length=200,null=True)

    def __str__(self):
        return "%s,%s: %f" % (self.snp_A,self.snp_B,self.val)

class PhenotypeMap(models.Model):
    class Meta:
        unique_together=(("snp","phenotype"),)

    snp = models.ForeignKey(SNP)
    phenotype = models.ForeignKey(Phenotype)
    p_val = models.FloatField()
    log_score = models.FloatField()
    source = models.ForeignKey(Source,blank=True,null=True)

    def __str__(self):
        return "%s %s:%f" % (self.phenotype,self.snp,self.log_score)

class Chip_Seq(models.Model):
    chr = models.CharField(max_length=6)
    start = models.PositiveIntegerField()
    end = models.PositiveIntegerField()
    peak = models.FloatField()
    label = models.ForeignKey(Chip_Label)

    def __str__(self):
        return "%s (%d-%d)" % (self.chr,self.start,self.end)