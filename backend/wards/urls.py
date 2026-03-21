from django.urls import path
from . import views

urlpatterns = [
    path('wards/', views.WardListView.as_view(), name='ward-list'),
    path('wards/<int:ward_no>/', views.WardDetailView.as_view(), name='ward-detail'),
    path('hotspots/', views.HotspotView.as_view(), name='hotspots'),
    path('city-trend/', views.CityTrendView.as_view(), name='city-trend'),
    path('city-source-map/', views.CitySourceMapView.as_view(), name='city-source-map'),
    path('reports/', views.ReportSubmitView.as_view(), name='report-submit'),
    path('reports/recent/', views.RecentReportsView.as_view(), name='recent-reports'),
]
