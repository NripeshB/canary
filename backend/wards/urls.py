from django.urls import path
from . import views
from . import auth_views

urlpatterns = [
    # Ward data
    path('wards/', views.WardListView.as_view(), name='ward-list'),
    path('wards/<int:ward_no>/', views.WardDetailView.as_view(), name='ward-detail'),
    path('hotspots/', views.HotspotView.as_view(), name='hotspots'),
    path('city-trend/', views.CityTrendView.as_view(), name='city-trend'),
    path('city-source-map/', views.CitySourceMapView.as_view(), name='city-source-map'),

    # Reports
    path('reports/', views.ReportSubmitView.as_view(), name='report-submit'),
    path('reports/recent/', views.RecentReportsView.as_view(), name='recent-reports'),
    path('reports/map/', views.ReportMapView.as_view(), name='report-map'),

    # New endpoints
    path('wind/', views.WindDataView.as_view(), name='wind-data'),
    path('impact/', views.ImpactMetricsView.as_view(), name='impact-metrics'),

    # Auth
    path('auth/login/', auth_views.LoginView.as_view(), name='auth-login'),
    path('auth/logout/', auth_views.LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', auth_views.MeView.as_view(), name='auth-me'),
    path('auth/csrf/', auth_views.CSRFTokenView.as_view(), name='auth-csrf'),
]
