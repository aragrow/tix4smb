import asyncio
import json
import csv
import random
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

JSON_DIR = Path("json")


def build_url(query: str, location: str) -> str:
    search = f"{query} in {location}".replace(" ", "+")
    return f"https://www.google.com/maps/search/{search}"


def location_slug(location: str) -> str:
    return re.sub(r"\s+", "-", location.strip().lower())


def is_excluded(name: str, exclusions: list[str]) -> bool:
    name_lower = name.lower()
    return any(term.lower() in name_lower for term in exclusions)


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
    """Split a Google Maps address into (address1, city, state, postal_code, country)."""
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


async def scrape_vendors(url: str) -> list[dict]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        page = await browser.new_page()
        await stealth_async(page)
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)

        try:
            await page.wait_for_selector('[role="feed"]', timeout=30000)
        except Exception:
            print("  Warning: no results feed found (possible anti-bot / no results) — skipping")
            await browser.close()
            return []

        feed = page.locator('[role="feed"]')
        for _ in range(5):
            await feed.evaluate("el => el.scrollBy(0, 800)")
            await page.wait_for_timeout(1500)

        cards = await page.query_selector_all('[role="feed"] > div')

        results = []
        for card in cards:
            try:
                name_el = await card.query_selector('div.fontHeadlineSmall, [class*="fontHeadlineSmall"]')
                name = (await name_el.inner_text()).strip() if name_el else None
                if not name:
                    continue

                await card.click()
                await page.wait_for_timeout(2000)

                phone = None
                phone_el = await page.query_selector('[data-tooltip="Copy phone number"], [aria-label*="Phone:"]')
                if phone_el:
                    label = await phone_el.get_attribute("aria-label") or await phone_el.get_attribute("data-tooltip")
                    phone = label.replace("Phone:", "").replace("Copy phone number", "").strip() if label else None

                if not phone:
                    phone_btn = await page.query_selector('button[data-item-id*="phone"]')
                    if phone_btn:
                        phone = (await phone_btn.inner_text()).strip()

                address = None
                addr_el = await page.query_selector('button[data-item-id="address"]')
                if addr_el:
                    label = await addr_el.get_attribute("aria-label") or ""
                    address = label.replace("Address:", "").strip() or None

                results.append({"name": name, "phone": phone or "N/A", "address": address})
                print(f"    {name}: {phone or 'N/A'}  |  {address or 'no address'}")

            except Exception:
                continue

        await browser.close()
        return results


def combine_vendors(output_files: list[str]) -> list[dict]:
    # Merge current-run files with any previously saved service files in json/
    # Exclude v2 files (belong to scraper2) and both combined outputs
    all_files = {str(f) for f in output_files}
    for f in JSON_DIR.glob("*.json"):
        if not f.name.endswith("-v2.json") and f.name not in ("vendors-combined.json", "vendors-combined-v2.json", "vendors-combined-ghl.json"):
            all_files.add(str(f))

    vendors = {}
    for fname in all_files:
        with open(fname) as f:
            data = json.load(f)[0]
        service  = data["service"]
        location = data["location"]

        for v in data["vendors"]:
            key = v["phone"] if v["phone"] != "N/A" else v["name"].lower().strip()
            if key not in vendors:
                vendors[key] = {
                    "name": v["name"],
                    "phone": v["phone"],
                    "address": v.get("address"),
                    "vendor_status": "prospect",
                    "services": [],
                    "locations": [],
                }
            if not vendors[key].get("address") and v.get("address"):
                vendors[key]["address"] = v["address"]
            if service not in vendors[key]["services"]:
                vendors[key]["services"].append(service)
            if location not in vendors[key]["locations"]:
                vendors[key]["locations"].append(location)

    return sorted(vendors.values(), key=lambda x: x["name"].lower())


def save_outputs(combined: list[dict]):
    with open(JSON_DIR / "vendors-combined.json", "w") as f:
        json.dump(combined, f, indent=2)

    fieldnames = ["Company Name", "Phone", "Address1", "City", "State", "Postal Code",
                  "Country", "Vendor Status", "Tags", "Contact Source"]
    with open(JSON_DIR / "vendors-combined.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for v in combined:
            address1, city, state, postal_code, country = split_address(v.get("address") or "")
            writer.writerow({
                "Company Name":   v["name"],
                "Phone":          format_phone_e164(v["phone"]),
                "Address1":       address1,
                "City":           city,
                "State":          state,
                "Postal Code":    postal_code,
                "Country":        country,
                "Vendor Status":  v.get("vendor_status", "prospect"),
                "Tags":           ", ".join(v["services"] + v["locations"]),
                "Contact Source": "scraper",
            })


async def main():
    config_path = sys.argv[1] if len(sys.argv) > 1 else "config.json"

    with open(config_path) as f:
        config = json.load(f)

    services:   dict = config["services"]
    locations:  list = config["locations"]
    exclusions: list = config.get("name_exclusion", [])

    JSON_DIR.mkdir(exist_ok=True)
    output_files = []

    for service_code, search_term in services.items():
        for location in locations:
            slug    = location_slug(location)
            out_file = JSON_DIR / f"{service_code}-{slug}.json"
            url     = build_url(search_term, location)

            print(f"\n[{service_code.upper()}] {search_term} in {location}")
            print(f"  URL: {url}")

            vendors = await scrape_vendors(url)

            if exclusions:
                before  = len(vendors)
                vendors = [v for v in vendors if v["name"] and not is_excluded(v["name"], exclusions)]
                excluded = before - len(vendors)
                if excluded:
                    print(f"  Excluded {excluded} vendor(s) by name filter")

            payload = [{"service": service_code, "location": location, "vendors": vendors}]
            with open(out_file, "w") as f:
                json.dump(payload, f, indent=2)

            print(f"  Saved {len(vendors)} vendors -> {out_file}")
            output_files.append(out_file)

            delay = random.uniform(3, 7)
            print(f"  Waiting {delay:.1f}s before next query...")
            await asyncio.sleep(delay)

    print("\nCombining all results...")
    combined = combine_vendors(output_files)
    print(f"  {len(combined)} unique vendors found")

    save_outputs(combined)
    print(f"\nDone. {len(combined)} vendors saved to vendors-combined.json and vendors-combined.csv")


asyncio.run(main())
