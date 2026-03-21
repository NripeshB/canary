from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from . import services


class WardListView(APIView):
    """GET /api/wards/ — All wards with AQI summary."""

    def get(self, request):
        wards = services.get_ward_summary_list()
        return Response({
            "count": len(wards),
            "wards": wards,
        })


class WardDetailView(APIView):
    """GET /api/wards/<ward_no>/ — Full ward detail."""

    def get(self, request, ward_no):
        detail = services.get_ward_detail(ward_no)
        if not detail:
            return Response(
                {"error": f"Ward {ward_no} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(detail)


class HotspotView(APIView):
    """GET /api/hotspots/ — Top polluted wards."""

    def get(self, request):
        count = int(request.query_params.get("count", 5))
        hotspots = services.get_hotspots(count=count)
        return Response({"hotspots": hotspots})


class CityTrendView(APIView):
    """GET /api/city-trend/ — Delhi-wide 12-month AQI trend."""

    def get(self, request):
        trend = services.generate_city_trend()
        return Response({"trend": trend})


class CitySourceMapView(APIView):
    """GET /api/city-source-map/ — Per-ward source intensity for map rendering."""

    def get(self, request):
        source_data = services.get_source_map()
        return Response({"wards": source_data})


class ReportSubmitView(APIView):
    """POST /api/reports/ — Submit a citizen report."""

    def post(self, request):
        data = request.data
        if not data.get("category") or not data.get("description"):
            return Response(
                {"error": "category and description are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report = services.submit_report(data)
        return Response(report, status=status.HTTP_201_CREATED)


class RecentReportsView(APIView):
    """GET /api/reports/recent/ — Recent citizen reports."""

    def get(self, request):
        limit = int(request.query_params.get("limit", 20))
        reports = services.get_recent_reports(limit=limit)
        return Response({"reports": reports})
