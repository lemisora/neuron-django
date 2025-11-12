# core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path('upload/', views.upload_csv_and_train, name='upload'),
]
