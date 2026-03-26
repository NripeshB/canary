"""
Seed Ward table from delhiWards.json GeoJSON file.
Computes centroids for each ward for API geo-lookups.
"""
import json
from pathlib import Path
from django.core.management.base import BaseCommand
from wards.models import Ward


def compute_centroid(feature):
    """Compute centroid lat/lng from GeoJSON feature geometry."""
    geom = feature.get("geometry", {})
    coords = geom.get("coordinates", [])
    geom_type = geom.get("type", "")

    all_points = []
    if geom_type == "Polygon":
        for ring in coords:
            all_points.extend(ring)
    elif geom_type == "MultiPolygon":
        for polygon in coords:
            for ring in polygon:
                all_points.extend(ring)

    if not all_points:
        return 28.65, 77.22  # Delhi center fallback

    avg_lng = sum(p[0] for p in all_points) / len(all_points)
    avg_lat = sum(p[1] for p in all_points) / len(all_points)
    return round(avg_lat, 6), round(avg_lng, 6)


class Command(BaseCommand):
    help = "Seed Ward table from delhiWards.json"

    def handle(self, *args, **options):
        # Find GeoJSON file
        base = Path(__file__).resolve().parent.parent.parent.parent
        candidates = [base / "delhiWards.json", base.parent / "delhiWards.json",
                      base.parent / "public" / "delhiWards.json"]

        geojson = None
        for path in candidates:
            if path.exists():
                with open(path, "r") as f:
                    geojson = json.load(f)
                self.stdout.write(f"Loaded GeoJSON from {path}")
                break

        if not geojson:
            self.stderr.write(self.style.ERROR(f"delhiWards.json not found. Tried: {[str(p) for p in candidates]}"))
            return

        features = geojson.get("features", [])
        created = 0
        updated = 0

        for feature in features:
            props = feature.get("properties", {})
            ward_no = props.get("Ward_No", 0)
            if not ward_no:
                continue

            lat, lng = compute_centroid(feature)

            ward, was_created = Ward.objects.update_or_create(
                ward_no=ward_no,
                defaults={
                    "name": props.get("WardName", f"Ward {ward_no}"),
                    "district": props.get("AC_Name", "Unknown"),
                    "population": props.get("TotalPop", 0),
                    "centroid_lat": lat,
                    "centroid_lng": lng,
                }
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done! Created {created}, updated {updated} wards. Total: {Ward.objects.count()}"
        ))
