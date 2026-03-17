"""
csv_export.py — Merge vendors-combined.json + vendors-combined-v2.json and export GHL-ready CSV.

Usage:
    uv run csv_export.py [json_dir]   (default: json/)

Merges rating + website from vendors-combined-v2.json into vendors-combined.json
using phone number as the key, then writes vendors-combined-ghl.csv.
"""

import csv
import json
import re
import sys
from pathlib import Path

JSON_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("json")

BASE_FILE = JSON_DIR / "vendors-combined.json"
V2_FILE   = JSON_DIR / "vendors-combined-v2.json"
OUT_CSV   = JSON_DIR / "vendors-combined-ghl.csv"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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
    """Split a Google address string into (address1, city, state, postal_code, country)."""
    if not address:
        return "", "", "", "", ""
    parts = [p.strip() for p in address.split(",")]
    address1    = parts[0] if len(parts) > 0 else ""
    city        = parts[1] if len(parts) > 1 else ""
    state_zip   = parts[2].strip() if len(parts) > 2 else ""
    country_raw = parts[3].strip() if len(parts) > 3 else ""
    sz = state_zip.split()
    state       = sz[0] if sz else ""
    postal_code = sz[1] if len(sz) > 1 else ""
    country = "United States" if country_raw.upper() in ("USA", "US", "UNITED STATES") else country_raw
    return address1, city, state, postal_code, country


# ---------------------------------------------------------------------------
# Load + merge
# ---------------------------------------------------------------------------

def load_vendors(path: Path) -> list[dict]:
    with open(path) as f:
        return json.load(f)


def merge(base: list[dict], v2: list[dict]) -> list[dict]:
    """Enrich base vendors with rating + website from v2, keyed by E.164 phone."""
    v2_index: dict[str, dict] = {}
    for v in v2:
        key = format_phone_e164(v.get("phone", ""))
        if key:
            v2_index[key] = v

    result = []
    for v in base:
        key = format_phone_e164(v.get("phone", ""))
        enriched = v2_index.get(key, {})
        result.append({
            "name":          v.get("name", ""),
            "phone":         v.get("phone", ""),
            "address":       v.get("address") or enriched.get("address") or "",
            "rating":        enriched.get("rating") or "",
            "website":       enriched.get("website") or "",
            "vendor_status": "prospect",
            "services":      v.get("services", []),
            "locations":     v.get("locations", []),
        })
    return result


# ---------------------------------------------------------------------------
# CSV export
# ---------------------------------------------------------------------------

FIELDNAMES = [
    "Company Name", "Phone", "Address1", "City", "State", "Postal Code",
    "Country", "Website", "Rating", "Vendor Status", "Contact Type", "Tags",
]


def write_csv(vendors: list[dict], out_path: Path) -> int:
    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        for v in vendors:
            address1, city, state, postal_code, country = split_address(v.get("address") or "")
            writer.writerow({
                "Company Name":   v["name"],
                "Phone":          format_phone_e164(v["phone"]),
                "Address1":       address1,
                "City":           city,
                "State":          state,
                "Postal Code":    postal_code,
                "Country":        country,
                "Website":        v.get("website") or "",
                "Rating":         v.get("rating") or "",
                "Vendor Status":  v.get("vendor_status", "prospect"),
                "Contact Type":   "vendor",
                "Tags":           ", ".join(v.get("services", []) + v.get("locations", [])),
            })
    return len(vendors)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    for path in (BASE_FILE, V2_FILE):
        if not path.exists():
            print(f"Error: {path} not found")
            sys.exit(1)

    print(f"Loading {BASE_FILE} ...")
    base = load_vendors(BASE_FILE)
    print(f"  {len(base)} vendors")

    print(f"Loading {V2_FILE} ...")
    v2 = load_vendors(V2_FILE)
    print(f"  {len(v2)} vendors")

    print("Merging rating + website by phone ...")
    merged = merge(base, v2)

    matched = sum(1 for v in merged if v.get("rating") or v.get("website"))
    print(f"  {matched}/{len(merged)} vendors enriched with rating/website")

    count = write_csv(merged, OUT_CSV)
    print(f"\nDone. {count} vendors saved to {OUT_CSV}")


main()
