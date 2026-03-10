// GoHighLevel mock data — used when GHL is not connected.

export const MOCK_GHL_CONTACTS = [
  { id: 'ghl-c01', name: 'Carmen Martinez',        email: 'carmen.m@email.com',    phone: '(850) 555-0101', tags: ['residential', 'weekly'] },
  { id: 'ghl-c02', name: 'Robert & Linda Thompson',email: 'rthompson@email.com',   phone: '(850) 555-0102', tags: ['residential', 'monthly'] },
  { id: 'ghl-c03', name: 'Wei Chen',               email: 'wei.chen@email.com',    phone: '(850) 555-0103', tags: ['residential', 'weekly'] },
  { id: 'ghl-c04', name: 'Priya Patel',            email: 'priya.patel@email.com', phone: '(850) 555-0104', tags: ['vacation-rental'] },
  { id: 'ghl-c05', name: "Sean O'Brien",           email: 'sobrien@email.com',     phone: '(850) 555-0105', tags: ['residential'] },
  { id: 'ghl-c06', name: 'Denise Williams',        email: 'dwilliams@email.com',   phone: '(850) 555-0106', tags: ['residential'] },
  { id: 'ghl-c07', name: 'Miguel Garcia',          email: 'mgarcia@email.com',     phone: '(850) 555-0107', tags: ['lead'] },
  { id: 'ghl-c08', name: 'Patricia Johnson',       email: 'pjohnson@email.com',    phone: '(850) 555-0108', tags: ['residential', 'weekly'] },
  { id: 'ghl-c09', name: 'Michael Anderson',       email: 'manderson@email.com',   phone: '(850) 555-0109', tags: ['vacation-rental', 'bi-weekly'] },
  { id: 'ghl-c10', name: 'Thi Nguyen',             email: 'tnguyen@email.com',     phone: '(850) 555-0110', tags: ['commercial'] },
  { id: 'ghl-c11', name: 'Sunrise Villas HOA',     email: 'mgmt@sunrisevillas.com',phone: '(850) 555-0114', tags: ['commercial', 'hoa'] },
  { id: 'ghl-c12', name: 'Coastal Property Mgmt',  email: 'ops@coastalprop.com',   phone: '(850) 555-0115', tags: ['commercial', 'property-mgmt'] },
  { id: 'ghl-c13', name: 'Blue Water Rentals LLC', email: 'info@bluewater.com',    phone: '(850) 555-0120', tags: ['vacation-rental'] },
  { id: 'ghl-c14', name: 'Emerald Coast Offices',  email: 'facilities@ecoffices.com', phone: '(850) 555-0125', tags: ['commercial', 'office'] },
  { id: 'ghl-c15', name: 'Marcus Taylor',          email: 'mtaylor@email.com',     phone: '(850) 555-0119', tags: ['lead', 'residential'] },
];

export const MOCK_GHL_OPPORTUNITIES = [
  { id: 'ghl-o01', name: 'Weekly Residential — Carmen Martinez',   contact: { id: 'ghl-c01', name: 'Carmen Martinez' },       pipelineStage: 'Active Client', monetaryValue: 150 },
  { id: 'ghl-o02', name: 'Monthly Deep Clean — Thompsons',         contact: { id: 'ghl-c02', name: 'Robert & Linda Thompson' },pipelineStage: 'Active Client', monetaryValue: 280 },
  { id: 'ghl-o03', name: 'Weekly Clean — Wei Chen',                contact: { id: 'ghl-c03', name: 'Wei Chen' },              pipelineStage: 'Active Client', monetaryValue: 130 },
  { id: 'ghl-o04', name: 'Vacation Rental Turnover — Patel',       contact: { id: 'ghl-c04', name: 'Priya Patel' },           pipelineStage: 'Active Client', monetaryValue: 200 },
  { id: 'ghl-o05', name: 'Move-Out Deep Clean — Priya Patel',      contact: { id: 'ghl-c04', name: 'Priya Patel' },           pipelineStage: 'Won',           monetaryValue: 350 },
  { id: 'ghl-o06', name: 'Bi-Weekly Residential — Sean O\'Brien',  contact: { id: 'ghl-c05', name: "Sean O'Brien" },          pipelineStage: 'Active Client', monetaryValue: 160 },
  { id: 'ghl-o07', name: 'Weekly Clean — Denise Williams',         contact: { id: 'ghl-c06', name: 'Denise Williams' },       pipelineStage: 'Active Client', monetaryValue: 140 },
  { id: 'ghl-o08', name: 'One-Time Deep Clean — Miguel Garcia',    contact: { id: 'ghl-c07', name: 'Miguel Garcia' },         pipelineStage: 'Proposal Sent', monetaryValue: 400 },
  { id: 'ghl-o09', name: 'Weekly Residential — Patricia Johnson',  contact: { id: 'ghl-c08', name: 'Patricia Johnson' },      pipelineStage: 'Active Client', monetaryValue: 145 },
  { id: 'ghl-o10', name: 'Vacation Rental Package — Anderson',     contact: { id: 'ghl-c09', name: 'Michael Anderson' },      pipelineStage: 'Active Client', monetaryValue: 380 },
  { id: 'ghl-o11', name: 'Monthly Office Clean — Thi Nguyen',      contact: { id: 'ghl-c10', name: 'Thi Nguyen' },            pipelineStage: 'Active Client', monetaryValue: 500 },
  { id: 'ghl-o12', name: 'HOA Common Areas — Sunrise Villas',      contact: { id: 'ghl-c11', name: 'Sunrise Villas HOA' },    pipelineStage: 'Active Client', monetaryValue: 1200 },
  { id: 'ghl-o13', name: 'Turnover Cleaning Package — Coastal',    contact: { id: 'ghl-c12', name: 'Coastal Property Mgmt' }, pipelineStage: 'Active Client', monetaryValue: 900 },
  { id: 'ghl-o14', name: 'Rental Turnovers — Blue Water',          contact: { id: 'ghl-c13', name: 'Blue Water Rentals LLC' },pipelineStage: 'Active Client', monetaryValue: 750 },
  { id: 'ghl-o15', name: 'Office Cleaning Contract — Emerald',     contact: { id: 'ghl-c14', name: 'Emerald Coast Offices' }, pipelineStage: 'Active Client', monetaryValue: 2000 },
  { id: 'ghl-o16', name: 'Residential Estimate — Marcus Taylor',   contact: { id: 'ghl-c15', name: 'Marcus Taylor' },         pipelineStage: 'Lead',          monetaryValue: 175 },
];

const d = (offset: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().slice(0, 16).replace('T', ' ');
};

export const MOCK_GHL_APPOINTMENTS = [
  { id: 'ghl-a01', title: 'Weekly Clean',             contact: { id: 'ghl-c01', name: 'Carmen Martinez' },       startTime: d(1),  status: 'confirmed', address: '142 Magnolia Blvd, Pensacola' },
  { id: 'ghl-a02', title: 'Weekly Clean',             contact: { id: 'ghl-c03', name: 'Wei Chen' },              startTime: d(2),  status: 'confirmed', address: '88 Crane Ct, Navarre' },
  { id: 'ghl-a03', title: 'Move-Out Deep Clean',      contact: { id: 'ghl-c04', name: 'Priya Patel' },           startTime: d(0),  status: 'confirmed', address: '519 Oak Ridge Rd, Milton' },
  { id: 'ghl-a04', title: 'Vacation Rental Turnover', contact: { id: 'ghl-c04', name: 'Priya Patel' },           startTime: d(1),  status: 'confirmed', address: '33 Harbor View Dr, Pensacola Beach' },
  { id: 'ghl-a05', title: 'Bi-Weekly Residential',    contact: { id: 'ghl-c05', name: "Sean O'Brien" },          startTime: d(4),  status: 'confirmed', address: '1045 Garden St, Pensacola' },
  { id: 'ghl-a06', title: 'Weekly Clean',             contact: { id: 'ghl-c06', name: 'Denise Williams' },       startTime: d(2),  status: 'confirmed', address: '780 Westside Blvd, Pace' },
  { id: 'ghl-a07', title: 'Estimate Walkthrough',     contact: { id: 'ghl-c07', name: 'Miguel Garcia' },         startTime: d(3),  status: 'new',       address: '3301 Davis Hwy, Pensacola' },
  { id: 'ghl-a08', title: 'Weekly Residential',       contact: { id: 'ghl-c08', name: 'Patricia Johnson' },      startTime: d(3),  status: 'confirmed', address: '60 Sandpiper Rd, Navarre' },
  { id: 'ghl-a09', title: 'Bi-Weekly Clean',          contact: { id: 'ghl-c09', name: 'Michael Anderson' },      startTime: d(5),  status: 'confirmed', address: '900 Nine Mile Rd, Pensacola' },
  { id: 'ghl-a10', title: 'Turnover Clean',           contact: { id: 'ghl-c09', name: 'Michael Anderson' },      startTime: d(1),  status: 'confirmed', address: '47 Pier Park Way, Panama City' },
  { id: 'ghl-a11', title: 'Monthly Office Clean',     contact: { id: 'ghl-c10', name: 'Thi Nguyen' },            startTime: d(6),  status: 'confirmed', address: '215 E Jackson St, Pensacola' },
  { id: 'ghl-a12', title: 'Clubhouse Weekly Clean',   contact: { id: 'ghl-c11', name: 'Sunrise Villas HOA' },    startTime: d(2),  status: 'confirmed', address: '1 Sunrise Villas Clubhouse, Gulf Breeze' },
  { id: 'ghl-a13', title: 'Turnover Clean Unit A',    contact: { id: 'ghl-c12', name: 'Coastal Property Mgmt' },startTime: d(3),  status: 'confirmed', address: '410 Palafox St Unit A, Pensacola' },
  { id: 'ghl-a14', title: 'Rental Turnover Unit 1',   contact: { id: 'ghl-c13', name: 'Blue Water Rentals LLC' },startTime: d(0),  status: 'confirmed', address: '12 Gulf Shore Dr Unit 1, Destin' },
  { id: 'ghl-a15', title: 'Initial Estimate Call',    contact: { id: 'ghl-c15', name: 'Marcus Taylor' },         startTime: d(5),  status: 'new',       address: '4520 Bayou Blvd, Pensacola' },
];
