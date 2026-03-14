"""
Nearby Health Centers — Uses OpenStreetMap (Nominatim + Overpass API).
No API key required. Implements content-based filtering:
  disease/treatment → medical specialties → filter facilities by NAME + tags.

Most Indian OSM facilities lack healthcare:speciality tags, so we match
specialty keywords against the facility NAME to filter results.
"""

from fastapi import APIRouter, Query
from typing import Optional, List
import httpx
import math
import json
import re

router = APIRouter(prefix="/api/nearby", tags=["nearby"])

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

HEADERS = {
    "User-Agent": "CuraTrace/1.0 (medical-treatment-intelligence-platform)",
}

# ─── Disease → Specialty Keywords ─────────────────────────────────────────────
# Each disease maps to keywords that should appear in facility NAMES/tags.
# These are used to FILTER results, not just score them.
SPECIALTY_MAP = {
    # Respiratory
    "lung": ["pulmon", "respiratory", "chest", "thorac", "tb"],
    "asthma": ["pulmon", "respiratory", "chest", "allergy", "asthma"],
    "bronchitis": ["pulmon", "respiratory", "chest"],
    "pneumonia": ["pulmon", "respiratory", "chest", "infectious"],
    "cough": ["pulmon", "respiratory", "chest", "ent"],
    "tb": ["pulmon", "tuberculosis", "chest", "tb"],
    "tuberculosis": ["pulmon", "tuberculosis", "chest"],

    # Cardiac
    "heart": ["cardio", "cardiac", "heart"],
    "hypertension": ["cardio", "cardiac", "heart", "internal"],
    "blood pressure": ["cardio", "cardiac", "heart"],
    "cholesterol": ["cardio", "cardiac", "heart"],

    # Diabetes / Endocrine
    "diabetes": ["diabet", "endocrin", "sugar"],
    "thyroid": ["endocrin", "thyroid"],
    "pcos": ["gynae", "gynec", "obstet", "endocrin", "women"],
    "pcod": ["gynae", "gynec", "obstet", "endocrin", "women"],
    "hormonal": ["endocrin", "gynae", "gynec"],

    # Gastro
    "stomach": ["gastro", "digest", "abdomen"],
    "liver": ["gastro", "hepat", "liver"],
    "ulcer": ["gastro", "digest"],
    "acidity": ["gastro", "digest"],
    "diarrhea": ["gastro", "digest"],
    "constipation": ["gastro", "digest"],
    "jaundice": ["gastro", "hepat", "liver"],

    # Dermatology
    "skin": ["dermat", "skin", "cosmet"],
    "acne": ["dermat", "skin", "cosmet"],
    "eczema": ["dermat", "skin"],
    "psoriasis": ["dermat", "skin"],
    "rash": ["dermat", "skin"],

    # Orthopedic
    "bone": ["ortho", "bone", "joint", "fracture"],
    "joint": ["ortho", "bone", "joint", "rheumat"],
    "arthritis": ["ortho", "bone", "joint", "rheumat"],
    "back pain": ["ortho", "spine", "physio"],
    "fracture": ["ortho", "bone", "trauma"],
    "osteoporosis": ["ortho", "bone"],

    # Neuro
    "headache": ["neuro", "brain", "migraine"],
    "migraine": ["neuro", "brain", "migraine"],
    "epilepsy": ["neuro", "brain"],
    "stroke": ["neuro", "brain"],
    "alzheimer": ["neuro", "brain", "geriat"],
    "parkinson": ["neuro", "brain"],

    # Eye
    "eye": ["eye", "ophthalm", "vision", "optic"],
    "vision": ["eye", "ophthalm", "vision", "optic"],
    "cataract": ["eye", "ophthalm"],
    "glaucoma": ["eye", "ophthalm"],

    # ENT
    "ear": ["ent", "ear"],
    "nose": ["ent", "nose", "sinus"],
    "throat": ["ent", "throat"],
    "sore throat": ["ent", "throat"],
    "sinusitis": ["ent", "sinus"],
    "tonsillitis": ["ent", "tonsil"],

    # Dental
    "dental": ["dent", "tooth", "oral"],
    "tooth": ["dent", "tooth", "oral"],

    # Women's health
    "pregnancy": ["gynae", "gynec", "obstet", "matern", "women"],
    "menstrual": ["gynae", "gynec", "obstet", "women"],
    "menopause": ["gynae", "gynec", "obstet", "women"],
    "infertility": ["gynae", "gynec", "fertil", "ivf", "women"],

    # Mental health
    "depression": ["psych", "mental", "counsel"],
    "anxiety": ["psych", "mental", "counsel"],
    "bipolar": ["psych", "mental"],
    "schizophrenia": ["psych", "mental"],
    "insomnia": ["psych", "mental", "sleep"],

    # Kidney / Urology
    "kidney": ["nephro", "urol", "renal", "kidney"],
    "uti": ["urol", "kidney"],

    # Cancer
    "cancer": ["onco", "cancer", "tumor"],
    "tumor": ["onco", "cancer", "tumor"],

    # Infectious
    "infection": ["infect", "fever"],
    "fever": ["general", "fever"],
    "malaria": ["infect", "tropical"],
    "typhoid": ["infect", "tropical"],
    "dengue": ["infect", "tropical"],
    "covid": ["covid", "infect", "pulmon", "respiratory"],

    # Allergy
    "allergy": ["allergy", "immuno"],
    "allergies": ["allergy", "immuno"],

    # Pediatric
    "child": ["pediatr", "paediatr", "child"],

    # General
    "pain": ["pain", "physio", "rehab"],
    "fatigue": ["general", "internal"],
}

# Display-friendly specialty names (for the banner)
SPECIALTY_DISPLAY = {
    "pulmon": "Pulmonology", "respiratory": "Respiratory Medicine", "chest": "Chest Medicine",
    "cardio": "Cardiology", "cardiac": "Cardiac Care", "heart": "Heart Care",
    "diabet": "Diabetology", "endocrin": "Endocrinology", "sugar": "Diabetes Care",
    "gastro": "Gastroenterology", "digest": "Digestive Care", "hepat": "Hepatology",
    "dermat": "Dermatology", "skin": "Skin Care",
    "ortho": "Orthopedics", "bone": "Bone & Joint", "rheumat": "Rheumatology",
    "neuro": "Neurology", "brain": "Brain & Neuroscience", "migraine": "Migraine/Headache",
    "eye": "Ophthalmology", "ophthalm": "Ophthalmology", "vision": "Vision Care",
    "ent": "ENT", "ear": "ENT",
    "dent": "Dentistry", "oral": "Oral Care",
    "gynae": "Gynecology", "gynec": "Gynecology", "obstet": "Obstetrics", "women": "Women's Health",
    "psych": "Psychiatry/Psychology", "mental": "Mental Health",
    "nephro": "Nephrology", "urol": "Urology", "renal": "Renal Care",
    "onco": "Oncology", "cancer": "Cancer Care",
    "infect": "Infectious Disease", "tropical": "Tropical Medicine",
    "pediatr": "Pediatrics", "paediatr": "Pediatrics",
    "physio": "Physiotherapy", "rehab": "Rehabilitation",
    "allergy": "Allergy & Immunology",
}


def _get_specialties_for_treatment(treatment: str):
    """Returns (filter_keywords, display_names) for a treatment."""
    treatment_lower = treatment.lower().strip()
    filter_kws = set()

    for keyword, specs in SPECIALTY_MAP.items():
        if keyword in treatment_lower:
            filter_kws.update(specs)

    # LLM fallback for unmapped conditions
    if not filter_kws:
        try:
            from nlp.llm_synthesis import _get_client
            client = _get_client()
            if client:
                resp = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": (
                        f'What medical specialty treats "{treatment}"? '
                        'Reply ONLY with JSON: {"keywords": ["keyword1", "keyword2"]} '
                        'where keywords are short substrings found in hospital/clinic names '
                        '(e.g., "neuro", "cardio", "ortho", "dermat").'
                    )}],
                    temperature=0, max_tokens=80,
                )
                content = resp.choices[0].message.content.strip()
                if '```' in content:
                    content = content.split('```')[1].replace('json', '').strip()
                parsed = json.loads(content)
                kws = parsed.get("keywords", [])
                filter_kws.update(k.lower() for k in kws)
        except Exception:
            pass

    # Build display names
    display_names = []
    for kw in filter_kws:
        name = SPECIALTY_DISPLAY.get(kw, kw.title())
        if name not in display_names:
            display_names.append(name)

    return list(filter_kws), display_names[:4]


def _haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def _matches_specialty(tags: dict, filter_keywords: List[str]) -> bool:
    """Check if a facility's name/tags contain ANY of the specialty keywords.
    This is the core filter — only matching facilities are shown."""
    if not filter_keywords:
        return True  # No treatment specified, show all

    # Build a searchable string from ALL tags (name, description, specialty, etc.)
    searchable = " ".join(str(v).lower() for v in tags.values())

    for kw in filter_keywords:
        if kw in searchable:
            return True

    return False


def _is_multispeciality(tags: dict) -> bool:
    """Check if a facility is a multi-speciality hospital (always relevant)."""
    searchable = " ".join(str(v).lower() for v in tags.values())
    return any(kw in searchable for kw in [
        "multispecial", "multi-special", "multi special",
        "super special", "superspecial",
        "general hospital", "district hospital",
        "medical college", "aiims", "government hospital",
    ])


@router.get("")
async def find_nearby(
    pincode: str = Query(..., description="Pincode or postal code"),
    country: str = Query("India", description="Country name"),
    radius_km: float = Query(10, description="Search radius in km"),
    type: str = Query("hospital", description="Type: hospital, clinic, doctor, pharmacy"),
    treatment: str = Query("", description="Treatment/disease for specialty filtering"),
):
    """Find nearby health centers with specialty-based filtering."""

    # Step 1: Geocode
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=10) as client:
            geo_resp = await client.get(NOMINATIM_URL, params={
                "q": f"{pincode}, {country}",
                "format": "json",
                "limit": 1,
            })
            geo_data = geo_resp.json()
            if not geo_data:
                return {"error": f"Could not find location for pincode '{pincode}'", "results": []}
            lat = float(geo_data[0]["lat"])
            lon = float(geo_data[0]["lon"])
            display_name = geo_data[0].get("display_name", "")
    except Exception as e:
        return {"error": f"Geocoding failed: {str(e)}", "results": []}

    # Step 2: Get specialty filter keywords
    filter_keywords, display_specialties = _get_specialties_for_treatment(treatment) if treatment else ([], [])

    # Step 3: Overpass query — fetch ALL facilities of this type in the radius
    amenity_map = {
        "hospital": "hospital",
        "clinic": "clinic",
        "doctor": "doctors",
        "pharmacy": "pharmacy",
    }
    amenity = amenity_map.get(type, "hospital")
    delta = radius_km / 111.0
    bbox = f"{lat - delta},{lon - delta},{lat + delta},{lon + delta}"

    overpass_query = f"""
    [out:json][timeout:20];
    (
      node["amenity"="{amenity}"]({bbox});
      way["amenity"="{amenity}"]({bbox});
      relation["amenity"="{amenity}"]({bbox});
      node["healthcare"]({bbox});
      way["healthcare"]({bbox});
    );
    out body center 80;
    """

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=20) as client:
            overpass_resp = await client.post(OVERPASS_URL, data={"data": overpass_query})
            overpass_data = overpass_resp.json()
    except Exception as e:
        return {"error": f"Overpass query failed: {str(e)}", "results": [],
                "location": {"lat": lat, "lon": lon, "display_name": display_name}}

    # Step 4: Parse, FILTER, and build results
    all_results = []
    relevant_results = []
    seen_names = set()

    for element in overpass_data.get("elements", []):
        tags = element.get("tags", {})
        name = tags.get("name", tags.get("official_name", ""))
        if not name:
            continue
        name_key = name.lower().strip()
        if name_key in seen_names:
            continue
        seen_names.add(name_key)

        elem_lat = element.get("lat") or element.get("center", {}).get("lat")
        elem_lon = element.get("lon") or element.get("center", {}).get("lon")
        if not elem_lat or not elem_lon:
            continue

        distance = round(_haversine(lat, lon, float(elem_lat), float(elem_lon)), 2)

        facility = {
            "name": name,
            "type": tags.get("amenity", tags.get("healthcare", type)),
            "specialty": tags.get("healthcare:speciality", ""),
            "address": _build_address(tags),
            "phone": tags.get("phone", tags.get("contact:phone", "")),
            "website": tags.get("website", tags.get("contact:website", "")),
            "lat": float(elem_lat),
            "lon": float(elem_lon),
            "distance_km": distance,
            "opening_hours": tags.get("opening_hours", ""),
            "emergency": tags.get("emergency", ""),
            "is_relevant": False,
            "is_multispeciality": False,
        }

        # Check if this facility matches the treatment specialty
        if filter_keywords:
            if _matches_specialty(tags, filter_keywords):
                facility["is_relevant"] = True
                relevant_results.append(facility)
            elif _is_multispeciality(tags):
                facility["is_multispeciality"] = True
                relevant_results.append(facility)
            all_results.append(facility)
        else:
            all_results.append(facility)

    # Step 5: Build final list
    if filter_keywords:
        # Show ONLY relevant facilities + multispeciality
        final = sorted(relevant_results, key=lambda x: (
            0 if x["is_relevant"] else 1,  # relevant first
            x["distance_km"],
        ))
        # If very few relevant results found, include nearest non-relevant as fallback
        if len(final) < 3:
            remaining = [r for r in all_results if r not in relevant_results]
            remaining.sort(key=lambda x: x["distance_km"])
            for r in remaining[:5]:
                r["is_relevant"] = False
                final.append(r)
    else:
        final = sorted(all_results, key=lambda x: x["distance_km"])

    return {
        "pincode": pincode,
        "location": {"lat": lat, "lon": lon, "display_name": display_name},
        "radius_km": radius_km,
        "type": type,
        "specialties_searched": display_specialties,
        "filter_keywords": filter_keywords,
        "count": len(final),
        "relevant_count": sum(1 for r in final if r.get("is_relevant")),
        "results": final[:25],
    }


def _build_address(tags):
    parts = []
    for key in ["addr:street", "addr:housenumber", "addr:city", "addr:state", "addr:postcode"]:
        val = tags.get(key, "")
        if val:
            parts.append(val)
    if parts:
        return ", ".join(parts)
    return tags.get("addr:full", tags.get("description", ""))
