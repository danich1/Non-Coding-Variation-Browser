# -*- coding: utf-8 -*-
# Generated by Django 1.9.2 on 2016-03-19 07:18
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('nc_snp', '0002_auto_20160317_0414'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='phenotypemap',
            unique_together=set([('snp', 'phenotype')]),
        ),
    ]
