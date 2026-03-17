# GoHighLevel CSV Import — Contact Format

Reference: https://gohighlevelassist.freshdesk.com/support/solutions/articles/155000005143

---

## File Requirements

| Rule | Detail |
|------|--------|
| Format | `.csv` only |
| Max size | 30 MB |
| Sheets | One sheet per file |
| Headers | Must match existing GHL field labels exactly (including custom fields) |
| Blank rows/cols | Remove before import |

---

## Required Fields (at least one)

- `First Name`
- `Email`
- `Phone`

> For **vendor/company** contacts with no individual name, use `Phone` as the minimum required field.

---

## Standard Column Names

| CSV Column | GHL Field | Notes |
|---|---|---|
| `First Name` | First Name | Leave blank for company-only contacts |
| `Last Name` | Last Name | |
| `Email` | Email | |
| `Phone` | Phone | E.164 preferred: `+13051234567` |
| `Company Name` | Company Name | Maps to the Company field in GHL |
| `Address1` | Address | Street address |
| `City` | City | |
| `State` | State | |
| `Postal Code` | Postal Code | |
| `Country` | Country | Use exact GHL country name (e.g. `United States`) |
| `Website` | Website | |
| `Tags` | Tags | Comma or semicolon separated: `rc, key west fl` |
| `Contact Source` | Source | e.g. `scraper` |

---

## Scraper Output → GHL Mapping

The scrapers produce `vendors-combined-v2.csv` with these columns.
Rename/split them before importing into GHL:

| Scraper Column | GHL Column | Transform Needed |
|---|---|---|
| `Company` | `Company Name` | Rename header |
| `Phone` | `Phone` | Reformat to E.164 (`+1XXXXXXXXXX`) if not already |
| `Address` | `Address1` + `City` + `State` + `Postal Code` | Split the full address string |
| `Rating` | Custom field: `Rating` (Numerical) | Create custom field in GHL first |
| `Website` | `Website` | Direct map |
| `Vendor Status` | Custom field: `Vendor Status` (Single Option) | Create custom field in GHL first; value: `prospect` |
| `Contact Type` | Custom field: `Contact Type` (Single Option) | Create custom field in GHL first; value: `vendor` |
| `Tags` | `Tags` | Direct map — service codes + locations already comma-separated |

---

## Field Format Rules

| Field Type | Format | Example |
|---|---|---|
| Phone | E.164 (recommended) | `+13051234567` |
| Phone (US alternate) | Dashes or dots | `305-123-4567` |
| Date | `MM/DD/YYYY` or `YYYY-MM-DD` | `03/16/2026` |
| Tags / Multi-select | Comma or semicolon separated | `rc, vr, key west fl` |
| Single option | One value | `prospect` |
| Numerical | Standard number | `4.5` |
| Monetary | Optional commas | `1,200.00` |
| Country | Exact GHL match | `United States` |

---

## Custom Fields to Create in GHL Before Import

These must exist in GHL (same label + data type) before the CSV import:

| Label | Data Type | Values |
|---|---|---|
| `Vendor Status` | Single Option | `prospect`, `active`, `inactive` |
| `Contact Type` | Single Option | `vendor` |
| `Rating` | Numerical | — |

> Settings → Custom Fields → Contacts → Add Field

---

## Import Steps

1. Prepare CSV with headers matching GHL field labels exactly
2. Create any custom fields in GHL that don't exist yet
3. Go to **Contacts → Import**
4. Upload CSV → map columns → choose deduplication field (Phone recommended for vendors)
5. Review preview → confirm import
