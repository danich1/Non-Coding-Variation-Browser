from django.conf.urls import url
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from . import views
# These are all the available urls for django
# Add all the urls that belong to drug_search here
urlpatterns = [
    url(r'^$', views.initialize, name="start"),
    url(r'browse',views.browse,name="browse"),
    url(r'grab_chip_seq', views.grab_chip_seq,name="grab_chip_seq"),
    url(r'grab_snp_data', views.grab_snp_data,name="grab_snp_data"),
    url(r'get_phenotypes',views.get_phenotypes,name="get_phenotypes"),
    url(r'test', views.test,name="test")
]
#This last part is important so django can find static files in the static folder
urlpatterns += staticfiles_urlpatterns()