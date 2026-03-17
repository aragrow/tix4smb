"""
run_all.py — Run the full vendor scraping pipeline.

Steps:
  1. scraper.py   — Google Maps (Playwright) scrape
  2. scraper2.py  — Google Places API scrape (rating + website)
  3. csv_export.py — Merge + export GHL-ready CSV

Usage:
    uv run run_all.py [config.json]   (default: config.json)
"""

import subprocess
import sys
from pathlib import Path

config = sys.argv[1] if len(sys.argv) > 1 else "config.json"

if not Path(config).exists():
    print(f"Error: config file '{config}' not found")
    sys.exit(1)

STEPS = [
    ("Playwright scraper",    ["scraper.py",  config]),
    ("Places API scraper",    ["scraper2.py", config]),
    ("GHL CSV export",        ["csv_export.py"]),
]

for label, args in STEPS:
    print(f"\n{'='*60}")
    print(f"  STEP: {label}")
    print(f"{'='*60}\n")

    result = subprocess.run(["uv", "run"] + args)

    if result.returncode != 0:
        print(f"\n[FAILED] {label} exited with code {result.returncode}")
        sys.exit(result.returncode)

print(f"\n{'='*60}")
print("  ALL STEPS COMPLETE")
print(f"{'='*60}")
print(f"  Output: json/vendors-combined-ghl.csv")
