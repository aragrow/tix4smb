import asyncio
import json
import csv
import re
import sys
import os
import httpx
from pathlib import Path

# Load .env.local if present
_env_file = Path(__file__).parent / ".env.local"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

JSON_DIR = Path("json")

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join([
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.rating",
    "places.websiteUri",
])


def location_slug(location: str) -> str:
    return re.sub(r"\s+", "-", location.strip().lower())


def is_excluded(name: str, exclusions: list[str]) -> bool:
    name_lower = name.lower()
    return any(term.lower() in name_lower for term in exclusions)


async def search_vendors(query: str, location: str, api_key: str) -> list[dict]:
    text_query = f"{query} in {location}"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body = {"textQuery": text_query}
    print(f"  → textQuery: \"{text_query}\"")

    async with httpx.AsyncClient() as client:
        response = await client.post(PLACES_URL, headers=headers, json=body, timeout=30)
        if not response.is_success:
            error = response.json().get("error", {})
            print(f"  API error {response.status_code}: {error.get('message', response.text)}")
            if response.status_code in (400, 401, 403):
                sys.exit(1)
            response.raise_for_status()
        data = response.json()

    results = []
    for place in data.get("places", []):
        name = place.get("displayName", {}).get("text")
        phone = place.get("nationalPhoneNumber") or "N/A"
        address = place.get("formattedAddress")
        rating = place.get("rating")
        website = place.get("websiteUri")

        results.append({
            "name": name,
            "phone": phone,
            "address": address,
            "rating": rating,
            "website": website,
        })
        print(f"    {name}: {phone}  |  {address or 'no address'}  |  rating={rating or '-'}")

    return results


def combine_vendors(output_files: list[str]) -> list[dict]:
    # Merge current-run files with any previously saved service files in json/
    all_files = {str(f) for f in output_files}
    for f in JSON_DIR.glob("*-v2.json"):
        if f.name != "vendors-combined-v2.json":
            all_files.add(str(f))

    vendors = {}
    for fname in all_files:
        with open(fname) as f:
            data = json.load(f)[0]
        service = data["service"]
        location = data["location"]

        for v in data["vendors"]:
            key = v["phone"] if v["phone"] != "N/A" else v["name"].lower().strip()
            if key not in vendors:
                vendors[key] = {
                    "name": v["name"],
                    "phone": v["phone"],
                    "address": v.get("address"),
                    "rating": v.get("rating"),
                    "website": v.get("website"),
                    "vendor_status": "prospect",
                    "services": [],
                    "locations": [],
                }
            if not vendors[key].get("address") and v.get("address"):
                vendors[key]["address"] = v["address"]
            if not vendors[key].get("rating") and v.get("rating"):
                vendors[key]["rating"] = v["rating"]
            if not vendors[key].get("website") and v.get("website"):
                vendors[key]["website"] = v["website"]
            if service not in vendors[key]["services"]:
                vendors[key]["services"].append(service)
            if location not in vendors[key]["locations"]:
                vendors[key]["locations"].append(location)

    return sorted(vendors.values(), key=lambda x: x["name"].lower())


def format_phone_e164(phone: str) -> str:
    if not phone or phone == "N/A":
        return ""
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return phone


def split_address(address: str) -> tuple[str, str, str, str, str]:
    """Split a Google Places address into (address1, city, state, postal_code, country)."""
    if not address:
        return "", "", "", "", ""
    parts = [p.strip() for p in address.split(",")]
    address1 = parts[0] if len(parts) > 0 else ""
    city     = parts[1] if len(parts) > 1 else ""
    state_zip = parts[2].strip() if len(parts) > 2 else ""
    country_raw = parts[3].strip() if len(parts) > 3 else ""
    sz = state_zip.split()
    state       = sz[0] if sz else ""
    postal_code = sz[1] if len(sz) > 1 else ""
    country = "United States" if country_raw.upper() in ("USA", "US", "UNITED STATES") else country_raw
    return address1, city, state, postal_code, country


def save_outputs(combined: list[dict]):
    with open(JSON_DIR / "vendors-combined-v2.json", "w") as f:
        json.dump(combined, f, indent=2)

    fieldnames = ["Company Name", "Phone", "Address1", "City", "State", "Postal Code",
                  "Country", "Website", "Rating", "Vendor Status", "Tags", "Contact Source"]
    with open(JSON_DIR / "vendors-combined-v2.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for v in combined:
            address1, city, state, postal_code, country = split_address(v.get("address") or "")
            writer.writerow({
                "Company Name": v["name"],
                "Phone": format_phone_e164(v["phone"]),
                "Address1": address1,
                "City": city,
                "State": state,
                "Postal Code": postal_code,
                "Country": country,
                "Website": v.get("website") or "",
                "Rating": v.get("rating") or "",
                "Vendor Status": v.get("vendor_status", "prospect"),
                "Tags": ", ".join(v["services"] + v["locations"]),
                "Contact Source": "scraper",
            })


async def main():
    config_path = sys.argv[1] if len(sys.argv) > 1 else "config.json"

    with open(config_path) as f:
        config = json.load(f)

    api_key = config.get("google_api_key") or os.environ.get("GOOGLE_PLACE_API_KEY")
    if not api_key:
        print("Error: set 'google_api_key' in config.json or GOOGLE_PLACE_API_KEY env var")
        sys.exit(1)
    print(f"Using API key: {api_key[:8]}...{api_key[-4:]} | Service: Places API (New) [{PLACES_URL}]")

    services: dict = config["services"]
    locations: list = config["locations"]
    exclusions: list = config.get("name_exclusion", [])

    JSON_DIR.mkdir(exist_ok=True)
    output_files = []

    for service_code, search_term in services.items():
        for location in locations:
            slug = location_slug(location)
            out_file = JSON_DIR / f"{service_code}-{slug}-v2.json"

            print(f"\n[{service_code.upper()}] {search_term} in {location}")

            vendors = await search_vendors(search_term, location, api_key)

            if exclusions:
                before = len(vendors)
                vendors = [v for v in vendors if v["name"] and not is_excluded(v["name"], exclusions)]
                excluded = before - len(vendors)
                if excluded:
                    print(f"  Excluded {excluded} vendor(s) by name filter")

            payload = [{"service": service_code, "location": location, "vendors": vendors}]
            with open(out_file, "w") as f:
                json.dump(payload, f, indent=2)

            print(f"  Saved {len(vendors)} vendors -> {out_file}")
            output_files.append(out_file)

    print("\nCombining all results...")
    combined = combine_vendors(output_files)
    print(f"  {len(combined)} unique vendors found")

    save_outputs(combined)
    print(f"\nDone. {len(combined)} vendors saved to vendors-combined-v2.json and vendors-combined-v2.csv")


asyncio.run(main())
