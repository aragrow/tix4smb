import type { JobberClient, JobberVendor, JobberProperty, JobberJob, JobberVisit } from '@/types';

// ─── 25 Clients ────────────────────────────────────────────────────────────────
export const MOCK_CLIENTS: JobberClient[] = [
  { id: 'c01', name: 'Carmen Martinez',        email: 'carmen.m@email.com',    phone: '(850) 555-0101' },
  { id: 'c02', name: 'Robert & Linda Thompson', email: 'rthompson@email.com',   phone: '(850) 555-0102' },
  { id: 'c03', name: 'Wei Chen',               email: 'wei.chen@email.com',    phone: '(850) 555-0103' },
  { id: 'c04', name: 'Priya Patel',            email: 'priya.patel@email.com', phone: '(850) 555-0104' },
  { id: 'c05', name: 'Sean O\'Brien',          email: 'sobrien@email.com',     phone: '(850) 555-0105' },
  { id: 'c06', name: 'Denise Williams',        email: 'dwilliams@email.com',   phone: '(850) 555-0106' },
  { id: 'c07', name: 'Miguel Garcia',          email: 'mgarcia@email.com',     phone: '(850) 555-0107' },
  { id: 'c08', name: 'Patricia Johnson',       email: 'pjohnson@email.com',    phone: '(850) 555-0108' },
  { id: 'c09', name: 'Michael Anderson',       email: 'manderson@email.com',   phone: '(850) 555-0109' },
  { id: 'c10', name: 'Thi Nguyen',             email: 'tnguyen@email.com',     phone: '(850) 555-0110' },
  { id: 'c11', name: 'James Kim',              email: 'jkim@email.com',        phone: '(850) 555-0111' },
  { id: 'c12', name: 'Sarah Brown',            email: 'sbrown@email.com',      phone: '(850) 555-0112' },
  { id: 'c13', name: 'Charles Davis',          email: 'cdavis@email.com',      phone: '(850) 555-0113' },
  { id: 'c14', name: 'Sunrise Villas HOA',     email: 'mgmt@sunrisevillas.com',phone: '(850) 555-0114' },
  { id: 'c15', name: 'Coastal Property Mgmt', email: 'ops@coastalprop.com',   phone: '(850) 555-0115' },
  { id: 'c16', name: 'Elena Rodriguez',        email: 'erodriguez@email.com',  phone: '(850) 555-0116' },
  { id: 'c17', name: 'David White',            email: 'dwhite@email.com',      phone: '(850) 555-0117' },
  { id: 'c18', name: 'Jennifer Lee',           email: 'jlee@email.com',        phone: '(850) 555-0118' },
  { id: 'c19', name: 'Marcus Taylor',          email: 'mtaylor@email.com',     phone: '(850) 555-0119' },
  { id: 'c20', name: 'Blue Water Rentals LLC', email: 'info@bluewater.com',    phone: '(850) 555-0120' },
  { id: 'c21', name: 'Martinez Properties',    email: 'admin@martinezprop.com',phone: '(850) 555-0121' },
  { id: 'c22', name: 'Christine Cooper',       email: 'ccooper@email.com',     phone: '(850) 555-0122' },
  { id: 'c23', name: 'Thomas Walker',          email: 'twalker@email.com',     phone: '(850) 555-0123' },
  { id: 'c24', name: 'Brenda Hall',            email: 'bhall@email.com',       phone: '(850) 555-0124' },
  { id: 'c25', name: 'Emerald Coast Offices',  email: 'facilities@ecoffices.com', phone: '(850) 555-0125' },
];

// ─── 8 Vendors (subcontractor cleaning crews) ──────────────────────────────────
export const MOCK_VENDORS: JobberVendor[] = [
  { id: 'vd01', name: 'Maria Santos',             email: 'maria.santos@cleanpro.com',    phone: '(850) 555-0201', specialty: 'Residential' },
  { id: 'vd02', name: 'Gulf Coast Cleaners LLC',  email: 'info@gulfcoastclean.com',      phone: '(850) 555-0202', specialty: 'Residential & Commercial' },
  { id: 'vd03', name: 'Sunshine Pro Clean',       email: 'ops@sunshinepro.com',           phone: '(850) 555-0203', specialty: 'Vacation Rentals' },
  { id: 'vd04', name: 'Emerald Clean Services',   email: 'contact@emeraldclean.com',      phone: '(850) 555-0204', specialty: 'HOA & Commercial' },
  { id: 'vd05', name: 'Bay Clean Team',           email: 'bay@baycleanteam.com',          phone: '(850) 555-0205', specialty: 'Commercial & Turnover' },
  { id: 'vd06', name: 'Coastal Pro Clean',        email: 'hello@coastalpro.com',          phone: '(850) 555-0206', specialty: 'General Residential' },
  { id: 'vd07', name: 'Pristine Clean Co.',       email: 'admin@pristineclean.com',       phone: '(850) 555-0207', specialty: 'Deep Clean Specialist' },
  { id: 'vd08', name: 'Gulf Breeze Services',     email: 'info@gulfbreezesvcs.com',       phone: '(850) 555-0208', specialty: 'Vacation Rentals & Deep Clean' },
];

// ─── Properties (1–3 per client) ───────────────────────────────────────────────
export const MOCK_PROPERTIES: JobberProperty[] = [
  // c01 — 2 properties
  { id: 'p01a', street: '142 Magnolia Blvd',    city: 'Pensacola',       province: 'FL', postalCode: '32501', client: { id: 'c01', name: 'Carmen Martinez' } },
  { id: 'p01b', street: '7 Palmetto Dr',         city: 'Gulf Breeze',     province: 'FL', postalCode: '32561', client: { id: 'c01', name: 'Carmen Martinez' } },
  // c02 — 1 property
  { id: 'p02a', street: '2310 Bayshore Ave',     city: 'Pensacola',       province: 'FL', postalCode: '32503', client: { id: 'c02', name: 'Robert & Linda Thompson' } },
  // c03 — 3 properties
  { id: 'p03a', street: '88 Crane Ct',           city: 'Navarre',         province: 'FL', postalCode: '32566', client: { id: 'c03', name: 'Wei Chen' } },
  { id: 'p03b', street: '204 Sunrise Ln',        city: 'Navarre',         province: 'FL', postalCode: '32566', client: { id: 'c03', name: 'Wei Chen' } },
  { id: 'p03c', street: '11 Pelican Pl',         city: 'Gulf Breeze',     province: 'FL', postalCode: '32563', client: { id: 'c03', name: 'Wei Chen' } },
  // c04 — 2 properties
  { id: 'p04a', street: '519 Oak Ridge Rd',      city: 'Milton',          province: 'FL', postalCode: '32570', client: { id: 'c04', name: 'Priya Patel' } },
  { id: 'p04b', street: '33 Harbor View Dr',     city: 'Pensacola Beach', province: 'FL', postalCode: '32561', client: { id: 'c04', name: 'Priya Patel' } },
  // c05 — 1 property
  { id: 'p05a', street: '1045 Garden St',        city: 'Pensacola',       province: 'FL', postalCode: '32504', client: { id: 'c05', name: "Sean O'Brien" } },
  // c06 — 2 properties
  { id: 'p06a', street: '780 Westside Blvd',     city: 'Pace',            province: 'FL', postalCode: '32571', client: { id: 'c06', name: 'Denise Williams' } },
  { id: 'p06b', street: '22 Coral Way',          city: 'Gulf Breeze',     province: 'FL', postalCode: '32561', client: { id: 'c06', name: 'Denise Williams' } },
  // c07 — 1 property
  { id: 'p07a', street: '3301 Davis Hwy',        city: 'Pensacola',       province: 'FL', postalCode: '32503', client: { id: 'c07', name: 'Miguel Garcia' } },
  // c08 — 3 properties
  { id: 'p08a', street: '60 Sandpiper Rd',       city: 'Navarre',         province: 'FL', postalCode: '32566', client: { id: 'c08', name: 'Patricia Johnson' } },
  { id: 'p08b', street: '120 Beachwood Cir',     city: 'Navarre',         province: 'FL', postalCode: '32566', client: { id: 'c08', name: 'Patricia Johnson' } },
  { id: 'p08c', street: '5 Inlet Pointe Dr',     city: 'Pensacola',       province: 'FL', postalCode: '32507', client: { id: 'c08', name: 'Patricia Johnson' } },
  // c09 — 2 properties
  { id: 'p09a', street: '900 Nine Mile Rd',      city: 'Pensacola',       province: 'FL', postalCode: '32514', client: { id: 'c09', name: 'Michael Anderson' } },
  { id: 'p09b', street: '47 Pier Park Way',      city: 'Panama City',     province: 'FL', postalCode: '32408', client: { id: 'c09', name: 'Michael Anderson' } },
  // c10 — 1 property
  { id: 'p10a', street: '215 E Jackson St',      city: 'Pensacola',       province: 'FL', postalCode: '32502', client: { id: 'c10', name: 'Thi Nguyen' } },
  // c11 — 2 properties
  { id: 'p11a', street: '441 Bauer Rd',          city: 'Milton',          province: 'FL', postalCode: '32583', client: { id: 'c11', name: 'James Kim' } },
  { id: 'p11b', street: '18 Marina Blvd',        city: 'Pensacola Beach', province: 'FL', postalCode: '32561', client: { id: 'c11', name: 'James Kim' } },
  // c12 — 1 property
  { id: 'p12a', street: '700 Creekside Dr',      city: 'Pace',            province: 'FL', postalCode: '32571', client: { id: 'c12', name: 'Sarah Brown' } },
  // c13 — 3 properties
  { id: 'p13a', street: '1200 Cervantes St',     city: 'Pensacola',       province: 'FL', postalCode: '32501', client: { id: 'c13', name: 'Charles Davis' } },
  { id: 'p13b', street: '34 Osprey Way',         city: 'Gulf Breeze',     province: 'FL', postalCode: '32563', client: { id: 'c13', name: 'Charles Davis' } },
  { id: 'p13c', street: '880 Scenic Hwy',        city: 'Pensacola',       province: 'FL', postalCode: '32503', client: { id: 'c13', name: 'Charles Davis' } },
  // c14 HOA — 3 properties (common areas)
  { id: 'p14a', street: '1 Sunrise Villas Clubhouse', city: 'Gulf Breeze', province: 'FL', postalCode: '32563', client: { id: 'c14', name: 'Sunrise Villas HOA' } },
  { id: 'p14b', street: '2 Sunrise Villas Pool Deck', city: 'Gulf Breeze', province: 'FL', postalCode: '32563', client: { id: 'c14', name: 'Sunrise Villas HOA' } },
  { id: 'p14c', street: '3 Sunrise Villas Gym',       city: 'Gulf Breeze', province: 'FL', postalCode: '32563', client: { id: 'c14', name: 'Sunrise Villas HOA' } },
  // c15 — 3 properties
  { id: 'p15a', street: '410 Palafox St Unit A', city: 'Pensacola',       province: 'FL', postalCode: '32502', client: { id: 'c15', name: 'Coastal Property Mgmt' } },
  { id: 'p15b', street: '410 Palafox St Unit B', city: 'Pensacola',       province: 'FL', postalCode: '32502', client: { id: 'c15', name: 'Coastal Property Mgmt' } },
  { id: 'p15c', street: '55 Bayfront Pkwy',      city: 'Pensacola',       province: 'FL', postalCode: '32502', client: { id: 'c15', name: 'Coastal Property Mgmt' } },
  // c16 — 1 property
  { id: 'p16a', street: '2805 Tippin Ave',        city: 'Pensacola',       province: 'FL', postalCode: '32504', client: { id: 'c16', name: 'Elena Rodriguez' } },
  // c17 — 2 properties
  { id: 'p17a', street: '99 Whisper Pines Dr',   city: 'Milton',          province: 'FL', postalCode: '32570', client: { id: 'c17', name: 'David White' } },
  { id: 'p17b', street: '310 Avalon Blvd',       city: 'Milton',          province: 'FL', postalCode: '32583', client: { id: 'c17', name: 'David White' } },
  // c18 — 1 property
  { id: 'p18a', street: '1700 E Moreno St',      city: 'Pensacola',       province: 'FL', postalCode: '32503', client: { id: 'c18', name: 'Jennifer Lee' } },
  // c19 — 2 properties
  { id: 'p19a', street: '4520 Bayou Blvd',       city: 'Pensacola',       province: 'FL', postalCode: '32503', client: { id: 'c19', name: 'Marcus Taylor' } },
  { id: 'p19b', street: '601 Scenic Gulf Dr',    city: 'Miramar Beach',   province: 'FL', postalCode: '32550', client: { id: 'c19', name: 'Marcus Taylor' } },
  // c20 — 3 properties (vacation rentals)
  { id: 'p20a', street: '12 Gulf Shore Dr Unit 1', city: 'Destin',        province: 'FL', postalCode: '32541', client: { id: 'c20', name: 'Blue Water Rentals LLC' } },
  { id: 'p20b', street: '12 Gulf Shore Dr Unit 2', city: 'Destin',        province: 'FL', postalCode: '32541', client: { id: 'c20', name: 'Blue Water Rentals LLC' } },
  { id: 'p20c', street: '45 Harbor Cove Rd',     city: 'Destin',          province: 'FL', postalCode: '32541', client: { id: 'c20', name: 'Blue Water Rentals LLC' } },
  // c21 — 2 properties
  { id: 'p21a', street: '890 W Fairfield Dr',    city: 'Pensacola',       province: 'FL', postalCode: '32505', client: { id: 'c21', name: 'Martinez Properties' } },
  { id: 'p21b', street: '1100 N Davis Hwy',      city: 'Pensacola',       province: 'FL', postalCode: '32503', client: { id: 'c21', name: 'Martinez Properties' } },
  // c22 — 1 property
  { id: 'p22a', street: '620 Aragon Ave',        city: 'Pensacola',       province: 'FL', postalCode: '32503', client: { id: 'c22', name: 'Christine Cooper' } },
  // c23 — 2 properties
  { id: 'p23a', street: '3300 Barrancas Ave',    city: 'Pensacola',       province: 'FL', postalCode: '32507', client: { id: 'c23', name: 'Thomas Walker' } },
  { id: 'p23b', street: '78 Quiet Cove Ln',      city: 'Gulf Breeze',     province: 'FL', postalCode: '32561', client: { id: 'c23', name: 'Thomas Walker' } },
  // c24 — 1 property
  { id: 'p24a', street: '505 E Gonzalez St',     city: 'Pensacola',       province: 'FL', postalCode: '32501', client: { id: 'c24', name: 'Brenda Hall' } },
  // c25 — 3 properties (commercial offices)
  { id: 'p25a', street: '2100 N Palafox St Ste 100', city: 'Pensacola',   province: 'FL', postalCode: '32501', client: { id: 'c25', name: 'Emerald Coast Offices' } },
  { id: 'p25b', street: '2100 N Palafox St Ste 200', city: 'Pensacola',   province: 'FL', postalCode: '32501', client: { id: 'c25', name: 'Emerald Coast Offices' } },
  { id: 'p25c', street: '800 W Garden St Ste 300',   city: 'Pensacola',   province: 'FL', postalCode: '32502', client: { id: 'c25', name: 'Emerald Coast Offices' } },
];

// ─── Jobs (0–2 per property) ────────────────────────────────────────────────────
const V = (id: string, name: string) => ({ id, name });
export const MOCK_JOBS: JobberJob[] = [
  { id: 'j01', title: 'Weekly Residential Clean',   jobStatus: 'active',   client: { id: 'c01', name: 'Carmen Martinez' },          property: { id: 'p01a', street: '142 Magnolia Blvd',    city: 'Pensacola' },      vendor: V('vd01','Maria Santos') },
  { id: 'j02', title: 'Bi-Weekly Clean',            jobStatus: 'active',   client: { id: 'c01', name: 'Carmen Martinez' },          property: { id: 'p01b', street: '7 Palmetto Dr',         city: 'Gulf Breeze' },    vendor: V('vd02','Gulf Coast Cleaners LLC') },
  { id: 'j03', title: 'Monthly Deep Clean',         jobStatus: 'active',   client: { id: 'c02', name: 'Robert & Linda Thompson' },  property: { id: 'p02a', street: '2310 Bayshore Ave',     city: 'Pensacola' },      vendor: V('vd02','Gulf Coast Cleaners LLC') },
  { id: 'j04', title: 'Weekly Clean',               jobStatus: 'active',   client: { id: 'c03', name: 'Wei Chen' },                 property: { id: 'p03a', street: '88 Crane Ct',           city: 'Navarre' },        vendor: V('vd01','Maria Santos') },
  { id: 'j05', title: 'Post-Construction Cleanup',  jobStatus: 'completed',client: { id: 'c03', name: 'Wei Chen' },                 property: { id: 'p03b', street: '204 Sunrise Ln',        city: 'Navarre' },        vendor: V('vd08','Gulf Breeze Services') },
  // p03c — no job
  { id: 'j06', title: 'Move-Out Deep Clean',        jobStatus: 'active',   client: { id: 'c04', name: 'Priya Patel' },             property: { id: 'p04a', street: '519 Oak Ridge Rd',      city: 'Milton' },         vendor: V('vd03','Sunshine Pro Clean') },
  { id: 'j07', title: 'Vacation Rental Turnover',   jobStatus: 'active',   client: { id: 'c04', name: 'Priya Patel' },             property: { id: 'p04b', street: '33 Harbor View Dr',     city: 'Pensacola Beach' }, vendor: V('vd03','Sunshine Pro Clean') },
  { id: 'j08', title: 'Bi-Weekly Residential',      jobStatus: 'active',   client: { id: 'c05', name: "Sean O'Brien" },            property: { id: 'p05a', street: '1045 Garden St',        city: 'Pensacola' },      vendor: V('vd02','Gulf Coast Cleaners LLC') },
  { id: 'j09', title: 'Weekly Clean',               jobStatus: 'active',   client: { id: 'c06', name: 'Denise Williams' },         property: { id: 'p06a', street: '780 Westside Blvd',     city: 'Pace' },           vendor: V('vd04','Emerald Clean Services') },
  // p06b — no job
  // p07a — no job
  { id: 'j10', title: 'Weekly Residential',         jobStatus: 'active',   client: { id: 'c08', name: 'Patricia Johnson' },        property: { id: 'p08a', street: '60 Sandpiper Rd',       city: 'Navarre' },        vendor: V('vd01','Maria Santos') },
  { id: 'j11', title: 'Move-In Clean',              jobStatus: 'active',   client: { id: 'c08', name: 'Patricia Johnson' },        property: { id: 'p08b', street: '120 Beachwood Cir',     city: 'Navarre' },        vendor: V('vd01','Maria Santos') },
  // p08c — no job
  { id: 'j12', title: 'Bi-Weekly Clean',            jobStatus: 'active',   client: { id: 'c09', name: 'Michael Anderson' },        property: { id: 'p09a', street: '900 Nine Mile Rd',      city: 'Pensacola' },      vendor: V('vd05','Bay Clean Team') },
  { id: 'j13', title: 'Vacation Rental Turnover',   jobStatus: 'active',   client: { id: 'c09', name: 'Michael Anderson' },        property: { id: 'p09b', street: '47 Pier Park Way',      city: 'Panama City' },    vendor: V('vd05','Bay Clean Team') },
  { id: 'j14', title: 'Monthly Office Clean',       jobStatus: 'active',   client: { id: 'c10', name: 'Thi Nguyen' },              property: { id: 'p10a', street: '215 E Jackson St',      city: 'Pensacola' },      vendor: V('vd06','Coastal Pro Clean') },
  { id: 'j15', title: 'Weekly Residential',         jobStatus: 'active',   client: { id: 'c11', name: 'James Kim' },               property: { id: 'p11a', street: '441 Bauer Rd',          city: 'Milton' },         vendor: V('vd03','Sunshine Pro Clean') },
  { id: 'j16', title: 'Vacation Rental Turnover',   jobStatus: 'active',   client: { id: 'c11', name: 'James Kim' },               property: { id: 'p11b', street: '18 Marina Blvd',        city: 'Pensacola Beach' }, vendor: V('vd03','Sunshine Pro Clean') },
  { id: 'j17', title: 'Bi-Weekly Clean',            jobStatus: 'active',   client: { id: 'c12', name: 'Sarah Brown' },             property: { id: 'p12a', street: '700 Creekside Dr',      city: 'Pace' },           vendor: V('vd02','Gulf Coast Cleaners LLC') },
  { id: 'j18', title: 'Weekly Clean',               jobStatus: 'active',   client: { id: 'c13', name: 'Charles Davis' },           property: { id: 'p13a', street: '1200 Cervantes St',     city: 'Pensacola' },      vendor: V('vd07','Pristine Clean Co.') },
  { id: 'j19', title: 'Monthly Deep Clean',         jobStatus: 'active',   client: { id: 'c13', name: 'Charles Davis' },           property: { id: 'p13c', street: '880 Scenic Hwy',        city: 'Pensacola' },      vendor: V('vd07','Pristine Clean Co.') },
  // p13b — no job
  { id: 'j20', title: 'Clubhouse Weekly Clean',     jobStatus: 'active',   client: { id: 'c14', name: 'Sunrise Villas HOA' },      property: { id: 'p14a', street: '1 Sunrise Villas Clubhouse', city: 'Gulf Breeze' }, vendor: V('vd04','Emerald Clean Services') },
  { id: 'j21', title: 'Pool Deck Bi-Weekly',        jobStatus: 'active',   client: { id: 'c14', name: 'Sunrise Villas HOA' },      property: { id: 'p14b', street: '2 Sunrise Villas Pool Deck', city: 'Gulf Breeze' }, vendor: V('vd04','Emerald Clean Services') },
  { id: 'j22', title: 'Gym Daily Cleaning',         jobStatus: 'active',   client: { id: 'c14', name: 'Sunrise Villas HOA' },      property: { id: 'p14c', street: '3 Sunrise Villas Gym',       city: 'Gulf Breeze' }, vendor: V('vd04','Emerald Clean Services') },
  { id: 'j23', title: 'Turnover Clean Unit A',      jobStatus: 'active',   client: { id: 'c15', name: 'Coastal Property Mgmt' },  property: { id: 'p15a', street: '410 Palafox St Unit A', city: 'Pensacola' },  vendor: V('vd05','Bay Clean Team') },
  { id: 'j24', title: 'Turnover Clean Unit B',      jobStatus: 'active',   client: { id: 'c15', name: 'Coastal Property Mgmt' },  property: { id: 'p15b', street: '410 Palafox St Unit B', city: 'Pensacola' },  vendor: V('vd05','Bay Clean Team') },
  // p15c — no job
  { id: 'j25', title: 'Weekly Residential',         jobStatus: 'active',   client: { id: 'c16', name: 'Elena Rodriguez' },         property: { id: 'p16a', street: '2805 Tippin Ave',       city: 'Pensacola' },      vendor: V('vd01','Maria Santos') },
  { id: 'j26', title: 'Bi-Weekly Clean',            jobStatus: 'active',   client: { id: 'c17', name: 'David White' },             property: { id: 'p17a', street: '99 Whisper Pines Dr',   city: 'Milton' },         vendor: V('vd06','Coastal Pro Clean') },
  // p17b — no job
  { id: 'j27', title: 'Monthly Deep Clean',         jobStatus: 'active',   client: { id: 'c18', name: 'Jennifer Lee' },            property: { id: 'p18a', street: '1700 E Moreno St',      city: 'Pensacola' },      vendor: V('vd07','Pristine Clean Co.') },
  { id: 'j28', title: 'Weekly Residential',         jobStatus: 'active',   client: { id: 'c19', name: 'Marcus Taylor' },           property: { id: 'p19a', street: '4520 Bayou Blvd',       city: 'Pensacola' },      vendor: V('vd03','Sunshine Pro Clean') },
  { id: 'j29', title: 'Vacation Rental Turnover',   jobStatus: 'active',   client: { id: 'c19', name: 'Marcus Taylor' },           property: { id: 'p19b', street: '601 Scenic Gulf Dr',    city: 'Miramar Beach' },  vendor: V('vd03','Sunshine Pro Clean') },
  { id: 'j30', title: 'Rental Turnover Unit 1',     jobStatus: 'active',   client: { id: 'c20', name: 'Blue Water Rentals LLC' },  property: { id: 'p20a', street: '12 Gulf Shore Dr Unit 1', city: 'Destin' },    vendor: V('vd08','Gulf Breeze Services') },
  { id: 'j31', title: 'Rental Turnover Unit 2',     jobStatus: 'active',   client: { id: 'c20', name: 'Blue Water Rentals LLC' },  property: { id: 'p20b', street: '12 Gulf Shore Dr Unit 2', city: 'Destin' },    vendor: V('vd08','Gulf Breeze Services') },
  { id: 'j32', title: 'Deep Clean Between Seasons', jobStatus: 'completed',client: { id: 'c20', name: 'Blue Water Rentals LLC' },  property: { id: 'p20c', street: '45 Harbor Cove Rd',     city: 'Destin' },         vendor: V('vd08','Gulf Breeze Services') },
  { id: 'j33', title: 'Monthly Rental Clean',       jobStatus: 'active',   client: { id: 'c21', name: 'Martinez Properties' },     property: { id: 'p21a', street: '890 W Fairfield Dr',    city: 'Pensacola' },      vendor: V('vd02','Gulf Coast Cleaners LLC') },
  // p21b — no job
  { id: 'j34', title: 'Bi-Weekly Residential',      jobStatus: 'active',   client: { id: 'c22', name: 'Christine Cooper' },        property: { id: 'p22a', street: '620 Aragon Ave',        city: 'Pensacola' },      vendor: V('vd04','Emerald Clean Services') },
  { id: 'j35', title: 'Weekly Clean',               jobStatus: 'active',   client: { id: 'c23', name: 'Thomas Walker' },           property: { id: 'p23a', street: '3300 Barrancas Ave',    city: 'Pensacola' },      vendor: V('vd06','Coastal Pro Clean') },
  { id: 'j36', title: 'Seasonal Deep Clean',        jobStatus: 'completed',client: { id: 'c23', name: 'Thomas Walker' },           property: { id: 'p23b', street: '78 Quiet Cove Ln',      city: 'Gulf Breeze' },    vendor: V('vd06','Coastal Pro Clean') },
  { id: 'j37', title: 'Weekly Residential',         jobStatus: 'active',   client: { id: 'c24', name: 'Brenda Hall' },             property: { id: 'p24a', street: '505 E Gonzalez St',     city: 'Pensacola' },      vendor: V('vd07','Pristine Clean Co.') },
  { id: 'j38', title: 'Daily Office Clean Ste 100', jobStatus: 'active',   client: { id: 'c25', name: 'Emerald Coast Offices' },   property: { id: 'p25a', street: '2100 N Palafox St Ste 100', city: 'Pensacola' }, vendor: V('vd05','Bay Clean Team') },
  { id: 'j39', title: 'Daily Office Clean Ste 200', jobStatus: 'active',   client: { id: 'c25', name: 'Emerald Coast Offices' },   property: { id: 'p25b', street: '2100 N Palafox St Ste 200', city: 'Pensacola' }, vendor: V('vd05','Bay Clean Team') },
  { id: 'j40', title: 'Weekly Common Area Clean',   jobStatus: 'active',   client: { id: 'c25', name: 'Emerald Coast Offices' },   property: { id: 'p25c', street: '800 W Garden St Ste 300',   city: 'Pensacola' }, vendor: V('vd05','Bay Clean Team') },
];

// ─── Visits (1 per property, 0 extra) ──────────────────────────────────────────
const d = (offset: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().slice(0, 10);
};

export const MOCK_VISITS: JobberVisit[] = [
  { id: 'v01', title: 'Weekly Clean',             scheduledStart: d(1),   status: 'scheduled',  client: { id: 'c01', name: 'Carmen Martinez' },         property: { id: 'p01a', street: '142 Magnolia Blvd',    city: 'Pensacola' },      vendor: V('vd01','Maria Santos') },
  { id: 'v02', title: 'Bi-Weekly Clean',          scheduledStart: d(3),   status: 'scheduled',  client: { id: 'c01', name: 'Carmen Martinez' },         property: { id: 'p01b', street: '7 Palmetto Dr',         city: 'Gulf Breeze' },    vendor: V('vd02','Gulf Coast Cleaners LLC') },
  { id: 'v03', title: 'Monthly Deep Clean',       scheduledStart: d(-2),  status: 'completed',  client: { id: 'c02', name: 'Robert & Linda Thompson' }, property: { id: 'p02a', street: '2310 Bayshore Ave',     city: 'Pensacola' },      vendor: V('vd02','Gulf Coast Cleaners LLC') },
  { id: 'v04', title: 'Weekly Clean',             scheduledStart: d(2),   status: 'scheduled',  client: { id: 'c03', name: 'Wei Chen' },                property: { id: 'p03a', street: '88 Crane Ct',           city: 'Navarre' },        vendor: V('vd01','Maria Santos') },
  { id: 'v05', title: 'Post-Construction Visit',  scheduledStart: d(-5),  status: 'completed',  client: { id: 'c03', name: 'Wei Chen' },                property: { id: 'p03b', street: '204 Sunrise Ln',        city: 'Navarre' },        vendor: V('vd08','Gulf Breeze Services') },
  { id: 'v06', title: 'Initial Walk-Through',     scheduledStart: d(7),   status: 'scheduled',  client: { id: 'c03', name: 'Wei Chen' },                property: { id: 'p03c', street: '11 Pelican Pl',         city: 'Gulf Breeze' },    vendor: V('vd01','Maria Santos') },
  { id: 'v07', title: 'Move-Out Deep Clean',      scheduledStart: d(0),   status: 'scheduled',  client: { id: 'c04', name: 'Priya Patel' },            property: { id: 'p04a', street: '519 Oak Ridge Rd',      city: 'Milton' },         vendor: V('vd03','Sunshine Pro Clean') },
  { id: 'v08', title: 'Turnover Clean',           scheduledStart: d(1),   status: 'scheduled',  client: { id: 'c04', name: 'Priya Patel' },            property: { id: 'p04b', street: '33 Harbor View Dr',     city: 'Pensacola Beach' }, vendor: V('vd03','Sunshine Pro Clean') },
  { id: 'v09', title: 'Bi-Weekly Residential',    scheduledStart: d(4),   status: 'scheduled',  client: { id: 'c05', name: "Sean O'Brien" },           property: { id: 'p05a', street: '1045 Garden St',        city: 'Pensacola' },      vendor: V('vd02','Gulf Coast Cleaners LLC') },
  { id: 'v10', title: 'Weekly Clean',             scheduledStart: d(2),   status: 'scheduled',  client: { id: 'c06', name: 'Denise Williams' },        property: { id: 'p06a', street: '780 Westside Blvd',     city: 'Pace' },           vendor: V('vd04','Emerald Clean Services') },
  { id: 'v11', title: 'Initial Assessment',       scheduledStart: d(10),  status: 'unscheduled',client: { id: 'c06', name: 'Denise Williams' },        property: { id: 'p06b', street: '22 Coral Way',          city: 'Gulf Breeze' },    vendor: V('vd04','Emerald Clean Services') },
  { id: 'v12', title: 'One-Time Deep Clean',      scheduledStart: d(-1),  status: 'completed',  client: { id: 'c07', name: 'Miguel Garcia' },          property: { id: 'p07a', street: '3301 Davis Hwy',        city: 'Pensacola' },      vendor: V('vd08','Gulf Breeze Services') },
  { id: 'v13', title: 'Weekly Residential',       scheduledStart: d(3),   status: 'scheduled',  client: { id: 'c08', name: 'Patricia Johnson' },       property: { id: 'p08a', street: '60 Sandpiper Rd',       city: 'Navarre' },        vendor: V('vd01','Maria Santos') },
  { id: 'v14', title: 'Move-In Clean',            scheduledStart: d(5),   status: 'scheduled',  client: { id: 'c08', name: 'Patricia Johnson' },       property: { id: 'p08b', street: '120 Beachwood Cir',     city: 'Navarre' },        vendor: V('vd01','Maria Santos') },
  { id: 'v15', title: 'One-Time Clean',           scheduledStart: d(14),  status: 'unscheduled',client: { id: 'c08', name: 'Patricia Johnson' },       property: { id: 'p08c', street: '5 Inlet Pointe Dr',     city: 'Pensacola' },      vendor: V('vd01','Maria Santos') },
  { id: 'v16', title: 'Bi-Weekly Clean',          scheduledStart: d(5),   status: 'scheduled',  client: { id: 'c09', name: 'Michael Anderson' },       property: { id: 'p09a', street: '900 Nine Mile Rd',      city: 'Pensacola' },      vendor: V('vd05','Bay Clean Team') },
  { id: 'v17', title: 'Turnover Clean',           scheduledStart: d(1),   status: 'scheduled',  client: { id: 'c09', name: 'Michael Anderson' },       property: { id: 'p09b', street: '47 Pier Park Way',      city: 'Panama City' },    vendor: V('vd05','Bay Clean Team') },
  { id: 'v18', title: 'Monthly Office Clean',     scheduledStart: d(6),   status: 'scheduled',  client: { id: 'c10', name: 'Thi Nguyen' },             property: { id: 'p10a', street: '215 E Jackson St',      city: 'Pensacola' },      vendor: V('vd06','Coastal Pro Clean') },
  { id: 'v19', title: 'Weekly Residential',       scheduledStart: d(2),   status: 'scheduled',  client: { id: 'c11', name: 'James Kim' },              property: { id: 'p11a', street: '441 Bauer Rd',          city: 'Milton' },         vendor: V('vd03','Sunshine Pro Clean') },
  { id: 'v20', title: 'Turnover Clean',           scheduledStart: d(0),   status: 'scheduled',  client: { id: 'c11', name: 'James Kim' },              property: { id: 'p11b', street: '18 Marina Blvd',        city: 'Pensacola Beach' }, vendor: V('vd03','Sunshine Pro Clean') },
  { id: 'v21', title: 'Bi-Weekly Clean',          scheduledStart: d(4),   status: 'scheduled',  client: { id: 'c12', name: 'Sarah Brown' },            property: { id: 'p12a', street: '700 Creekside Dr',      city: 'Pace' },           vendor: V('vd02','Gulf Coast Cleaners LLC') },
  { id: 'v22', title: 'Weekly Clean',             scheduledStart: d(1),   status: 'scheduled',  client: { id: 'c13', name: 'Charles Davis' },          property: { id: 'p13a', street: '1200 Cervantes St',     city: 'Pensacola' },      vendor: V('vd07','Pristine Clean Co.') },
  { id: 'v23', title: 'Estimate Visit',           scheduledStart: d(9),   status: 'unscheduled',client: { id: 'c13', name: 'Charles Davis' },          property: { id: 'p13b', street: '34 Osprey Way',         city: 'Gulf Breeze' },    vendor: V('vd07','Pristine Clean Co.') },
  { id: 'v24', title: 'Monthly Deep Clean',       scheduledStart: d(-1),  status: 'completed',  client: { id: 'c13', name: 'Charles Davis' },          property: { id: 'p13c', street: '880 Scenic Hwy',        city: 'Pensacola' },      vendor: V('vd07','Pristine Clean Co.') },
  { id: 'v25', title: 'Clubhouse Weekly',         scheduledStart: d(2),   status: 'scheduled',  client: { id: 'c14', name: 'Sunrise Villas HOA' },     property: { id: 'p14a', street: '1 Sunrise Villas Clubhouse', city: 'Gulf Breeze' }, vendor: V('vd04','Emerald Clean Services') },
  { id: 'v26', title: 'Pool Deck Clean',          scheduledStart: d(4),   status: 'scheduled',  client: { id: 'c14', name: 'Sunrise Villas HOA' },     property: { id: 'p14b', street: '2 Sunrise Villas Pool Deck', city: 'Gulf Breeze' }, vendor: V('vd04','Emerald Clean Services') },
  { id: 'v27', title: 'Gym Daily Clean',          scheduledStart: d(1),   status: 'scheduled',  client: { id: 'c14', name: 'Sunrise Villas HOA' },     property: { id: 'p14c', street: '3 Sunrise Villas Gym',       city: 'Gulf Breeze' }, vendor: V('vd04','Emerald Clean Services') },
  { id: 'v28', title: 'Turnover Unit A',          scheduledStart: d(3),   status: 'scheduled',  client: { id: 'c15', name: 'Coastal Property Mgmt' }, property: { id: 'p15a', street: '410 Palafox St Unit A', city: 'Pensacola' },  vendor: V('vd05','Bay Clean Team') },
  { id: 'v29', title: 'Turnover Unit B',          scheduledStart: d(5),   status: 'scheduled',  client: { id: 'c15', name: 'Coastal Property Mgmt' }, property: { id: 'p15b', street: '410 Palafox St Unit B', city: 'Pensacola' },  vendor: V('vd05','Bay Clean Team') },
  { id: 'v30', title: 'Initial Walkthrough',      scheduledStart: d(12),  status: 'unscheduled',client: { id: 'c15', name: 'Coastal Property Mgmt' }, property: { id: 'p15c', street: '55 Bayfront Pkwy',      city: 'Pensacola' },      vendor: V('vd05','Bay Clean Team') },
  { id: 'v31', title: 'Weekly Residential',       scheduledStart: d(2),   status: 'scheduled',  client: { id: 'c16', name: 'Elena Rodriguez' },        property: { id: 'p16a', street: '2805 Tippin Ave',       city: 'Pensacola' },      vendor: V('vd01','Maria Santos') },
  { id: 'v32', title: 'Bi-Weekly Clean',          scheduledStart: d(6),   status: 'scheduled',  client: { id: 'c17', name: 'David White' },            property: { id: 'p17a', street: '99 Whisper Pines Dr',   city: 'Milton' },         vendor: V('vd06','Coastal Pro Clean') },
  { id: 'v33', title: 'One-Time Deep Clean',      scheduledStart: d(21),  status: 'unscheduled',client: { id: 'c17', name: 'David White' },            property: { id: 'p17b', street: '310 Avalon Blvd',       city: 'Milton' },         vendor: V('vd06','Coastal Pro Clean') },
  { id: 'v34', title: 'Monthly Deep Clean',       scheduledStart: d(8),   status: 'scheduled',  client: { id: 'c18', name: 'Jennifer Lee' },           property: { id: 'p18a', street: '1700 E Moreno St',      city: 'Pensacola' },      vendor: V('vd07','Pristine Clean Co.') },
  { id: 'v35', title: 'Weekly Residential',       scheduledStart: d(1),   status: 'scheduled',  client: { id: 'c19', name: 'Marcus Taylor' },          property: { id: 'p19a', street: '4520 Bayou Blvd',       city: 'Pensacola' },      vendor: V('vd03','Sunshine Pro Clean') },
  { id: 'v36', title: 'Turnover Clean',           scheduledStart: d(2),   status: 'scheduled',  client: { id: 'c19', name: 'Marcus Taylor' },          property: { id: 'p19b', street: '601 Scenic Gulf Dr',    city: 'Miramar Beach' },  vendor: V('vd03','Sunshine Pro Clean') },
  { id: 'v37', title: 'Turnover Unit 1',          scheduledStart: d(0),   status: 'scheduled',  client: { id: 'c20', name: 'Blue Water Rentals LLC' }, property: { id: 'p20a', street: '12 Gulf Shore Dr Unit 1', city: 'Destin' },    vendor: V('vd08','Gulf Breeze Services') },
  { id: 'v38', title: 'Turnover Unit 2',          scheduledStart: d(0),   status: 'scheduled',  client: { id: 'c20', name: 'Blue Water Rentals LLC' }, property: { id: 'p20b', street: '12 Gulf Shore Dr Unit 2', city: 'Destin' },    vendor: V('vd08','Gulf Breeze Services') },
  { id: 'v39', title: 'Deep Clean Harbor Cove',   scheduledStart: d(-7),  status: 'completed',  client: { id: 'c20', name: 'Blue Water Rentals LLC' }, property: { id: 'p20c', street: '45 Harbor Cove Rd',     city: 'Destin' },         vendor: V('vd08','Gulf Breeze Services') },
  { id: 'v40', title: 'Monthly Rental Clean',     scheduledStart: d(5),   status: 'scheduled',  client: { id: 'c21', name: 'Martinez Properties' },    property: { id: 'p21a', street: '890 W Fairfield Dr',    city: 'Pensacola' },      vendor: V('vd02','Gulf Coast Cleaners LLC') },
  { id: 'v41', title: 'Estimate Visit',           scheduledStart: d(15),  status: 'unscheduled',client: { id: 'c21', name: 'Martinez Properties' },    property: { id: 'p21b', street: '1100 N Davis Hwy',      city: 'Pensacola' },      vendor: V('vd02','Gulf Coast Cleaners LLC') },
  { id: 'v42', title: 'Bi-Weekly Residential',    scheduledStart: d(3),   status: 'scheduled',  client: { id: 'c22', name: 'Christine Cooper' },       property: { id: 'p22a', street: '620 Aragon Ave',        city: 'Pensacola' },      vendor: V('vd04','Emerald Clean Services') },
  { id: 'v43', title: 'Weekly Clean',             scheduledStart: d(1),   status: 'scheduled',  client: { id: 'c23', name: 'Thomas Walker' },          property: { id: 'p23a', street: '3300 Barrancas Ave',    city: 'Pensacola' },      vendor: V('vd06','Coastal Pro Clean') },
  { id: 'v44', title: 'Seasonal Deep Clean',      scheduledStart: d(-4),  status: 'completed',  client: { id: 'c23', name: 'Thomas Walker' },          property: { id: 'p23b', street: '78 Quiet Cove Ln',      city: 'Gulf Breeze' },    vendor: V('vd06','Coastal Pro Clean') },
  { id: 'v45', title: 'Weekly Residential',       scheduledStart: d(2),   status: 'scheduled',  client: { id: 'c24', name: 'Brenda Hall' },            property: { id: 'p24a', street: '505 E Gonzalez St',     city: 'Pensacola' },      vendor: V('vd07','Pristine Clean Co.') },
  { id: 'v46', title: 'Daily Office Clean Ste 100',scheduledStart: d(1),  status: 'scheduled',  client: { id: 'c25', name: 'Emerald Coast Offices' },  property: { id: 'p25a', street: '2100 N Palafox St Ste 100', city: 'Pensacola' }, vendor: V('vd05','Bay Clean Team') },
  { id: 'v47', title: 'Daily Office Clean Ste 200',scheduledStart: d(1),  status: 'scheduled',  client: { id: 'c25', name: 'Emerald Coast Offices' },  property: { id: 'p25b', street: '2100 N Palafox St Ste 200', city: 'Pensacola' }, vendor: V('vd05','Bay Clean Team') },
  { id: 'v48', title: 'Weekly Common Area Clean', scheduledStart: d(3),   status: 'scheduled',  client: { id: 'c25', name: 'Emerald Coast Offices' },  property: { id: 'p25c', street: '800 W Garden St Ste 300',   city: 'Pensacola' }, vendor: V('vd05','Bay Clean Team') },
];
