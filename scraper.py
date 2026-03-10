import asyncio
import json
import csv
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright

JSON_DIR = Path("json")


def build_url(query: str, location: str) -> str:
    search = f"{query} in {location}".replace(" ", "+")
    return f"https://www.google.com/maps/search/{search}"


def location_slug(location: str) -> str:
    return re.sub(r"\s+", "-", location.strip().lower())


async def scrape_vendors(url: str) -> list[dict]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)

        await page.wait_for_selector('[role="feed"]', timeout=15000)

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


async def enrich_vendor(page, vendor: dict) -> dict:
    query = vendor["name"]
    if vendor["phone"] != "N/A":
        query += f" {vendor['phone']}"
    url = "https://www.google.com/maps/search/" + query.replace(" ", "+")

    await page.goto(url, wait_until="domcontentloaded", timeout=60000)
    await page.wait_for_timeout(2000)

    # If a feed appears, click the first result
    first_card = await page.query_selector('[role="feed"] > div')
    if first_card:
        await first_card.click()
        await page.wait_for_timeout(2000)

    # Website
    website_el = await page.query_selector('a[data-item-id="authority"]')
    vendor["website"] = await website_el.get_attribute("href") if website_el else None

    # Address
    addr_el = await page.query_selector('button[data-item-id="address"]')
    if addr_el:
        label = await addr_el.get_attribute("aria-label") or ""
        vendor["address"] = label.replace("Address:", "").strip() or None
    else:
        vendor["address"] = None

    # Rating
    rating_el = await page.query_selector('[aria-label*=" stars"]')
    if rating_el:
        label = await rating_el.get_attribute("aria-label") or ""
        m = re.search(r"([\d.]+)\s+stars?", label)
        vendor["rating"] = m.group(1) if m else None
    else:
        vendor["rating"] = None

    # Contact person (best-effort)
    contact_el = await page.query_selector('button[data-item-id="owner"], [aria-label*="Owner"]')
    if contact_el:
        vendor["contact"] = (await contact_el.inner_text()).strip() or None
    else:
        vendor["contact"] = None

    return vendor


async def enrich_vendors(vendors: list[dict]) -> list[dict]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        for i, vendor in enumerate(vendors):
            print(f"  [{i+1}/{len(vendors)}] {vendor['name']}")
            try:
                vendors[i] = await enrich_vendor(page, vendor)
                website = vendor.get("website") or "-"
                address = vendor.get("address") or "-"
                rating = vendor.get("rating") or "-"
                print(f"    website={website}  address={address}  rating={rating}")
            except Exception as e:
                print(f"    Error: {e}")
                vendors[i].setdefault("website", None)
                vendors[i].setdefault("address", None)
                vendors[i].setdefault("rating", None)
                vendors[i].setdefault("contact", None)

        await browser.close()
    return vendors


def combine_vendors(output_files: list[str]) -> list[dict]:
    vendors = {}
    for fname in output_files:
        with open(fname) as f:
            data = json.load(f)[0]
        service = data["service"]
        location = data["location"]

        for v in data["vendors"]:
            key = v["phone"] if v["phone"] != "N/A" else v["name"].lower().strip()
            if key not in vendors:
                vendors[key] = {"name": v["name"], "phone": v["phone"], "address": v.get("address"), "prospect_vendor": 1, "services": [], "locations": []}
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

    with open(JSON_DIR / "vendors-combined.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["Company", "Phone", "Address", "Prospect Vendor", "Tags"])
        writer.writeheader()
        for v in combined:
            writer.writerow({
                "Company": v["name"],
                "Phone": v["phone"] if v["phone"] != "N/A" else "",
                "Address": v.get("address") or "",
                "Prospect Vendor": v.get("prospect_vendor", 1),
                "Tags": ", ".join(v["services"] + v["locations"])
            })


async def main():
    config_path = sys.argv[1] if len(sys.argv) > 1 else "config.json"

    with open(config_path) as f:
        config = json.load(f)

    services: dict = config["services"]
    locations: list = config["locations"]

    JSON_DIR.mkdir(exist_ok=True)
    output_files = []

    for service_code, search_term in services.items():
        for location in locations:
            slug = location_slug(location)
            out_file = JSON_DIR / f"{service_code}-{slug}.json"
            url = build_url(search_term, location)

            print(f"\n[{service_code.upper()}] {search_term} in {location}")
            print(f"  URL: {url}")

            vendors = await scrape_vendors(url)

            payload = [{"service": service_code, "location": location, "vendors": vendors}]
            with open(out_file, "w") as f:
                json.dump(payload, f, indent=2)

            print(f"  Saved {len(vendors)} vendors -> {out_file}")
            output_files.append(out_file)

    # Combine all into one deduplicated list
    print("\nCombining all results...")
    combined = combine_vendors(output_files)
    print(f"  {len(combined)} unique vendors found")

    # Save JSON + CSV
    save_outputs(combined)
    print(f"\nDone. {len(combined)} vendors saved to vendors-combined.json and vendors-combined.csv")


asyncio.run(main())
