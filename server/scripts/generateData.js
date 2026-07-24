const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../db');

// List of Karnataka Districts and approximate centroids
const DISTRICTS = [
  { name: 'Bengaluru City', lat: 12.9716, lon: 77.5946, code: 'BLR', popDensity: 4380, literacy: 88.48, poverty: 9.2, unemployment: 5.4, urbanization: 90.5, income: 280000 },
  { name: 'Mysuru', lat: 12.2958, lon: 76.6394, code: 'MYS', popDensity: 476, literacy: 72.79, poverty: 14.5, unemployment: 6.2, urbanization: 41.5, income: 195000 },
  { name: 'Belagavi', lat: 15.8497, lon: 74.4977, code: 'BEL', popDensity: 356, literacy: 73.48, poverty: 18.2, unemployment: 4.8, urbanization: 25.3, income: 165000 },
  { name: 'Hubballi-Dharwad', lat: 15.3647, lon: 75.1240, code: 'HBD', popDensity: 430, literacy: 80.30, poverty: 12.1, unemployment: 5.1, urbanization: 56.8, income: 185000 },
  { name: 'Mangaluru (Dakshina Kannada)', lat: 12.9141, lon: 74.8560, code: 'DK', popDensity: 430, literacy: 88.57, poverty: 8.1, unemployment: 7.2, urbanization: 47.6, income: 250000 },
  { name: 'Kalaburagi', lat: 17.3297, lon: 76.8343, code: 'KLB', popDensity: 233, literacy: 64.85, poverty: 28.5, unemployment: 8.9, urbanization: 32.4, income: 110000 },
  { name: 'Shivamogga', lat: 13.9299, lon: 75.5681, code: 'SHM', popDensity: 207, literacy: 80.45, poverty: 15.1, unemployment: 5.6, urbanization: 35.6, income: 170000 },
  { name: 'Tumakuru', lat: 13.3392, lon: 77.1140, code: 'TUM', popDensity: 253, literacy: 75.14, poverty: 16.8, unemployment: 4.5, urbanization: 22.4, income: 150000 },
  { name: 'Udupi', lat: 13.3409, lon: 74.7421, code: 'UDP', popDensity: 328, literacy: 86.29, poverty: 7.3, unemployment: 6.8, urbanization: 29.8, income: 235000 },
  { name: 'Kolar', lat: 13.1368, lon: 78.1292, code: 'KLR', popDensity: 386, literacy: 74.39, poverty: 17.5, unemployment: 4.9, urbanization: 31.2, income: 145000 }
];

const STATIONS = {
  'Bengaluru City': ['Koramangala', 'Indiranagar', 'Whitefield', 'Jayanagar', 'Majestic', 'Peenya'],
  'Mysuru': ['Devaraja', 'Lashkar', 'Vidyaranyapuram', 'Vijayanagar'],
  'Belagavi': ['Khade Bazar', 'Camp', 'Udyambag', 'Market'],
  'Hubballi-Dharwad': ['Gokul Road', 'Town Police', 'Vidyanagar', 'Suburban'],
  'Mangaluru (Dakshina Kannada)': ['Pandeshwar', 'Kadri', 'Barkur', 'Ullal'],
  'Kalaburagi': ['Chowk', 'Station Bazar', 'Raghavendra Nagar'],
  'Shivamogga': ['Kote', 'Doddapete', 'Tunga Nagar'],
  'Tumakuru': ['Town Station', 'Kyathsandra', 'Jayanagar'],
  'Udupi': ['Town Station', 'Manipal', 'Malpe'],
  'Kolar': ['Town Station', 'Galipura', 'Robertsonpet']
};

const CRIME_CATEGORIES = [
  { name: 'Cybercrime', baseSeverity: 'Medium', moList: ['Phishing mail', 'OTP Scam', 'Ransomware', 'Job Portal Fraud', 'Card Cloning'] },
  { name: 'Murder', baseSeverity: 'Critical', moList: ['Contract killing', 'Land dispute clash', 'Crime of passion', 'Armed robbery fallout'] },
  { name: 'Robbery', baseSeverity: 'High', moList: ['Highway heist', 'Snatching at night', 'House break-in', 'Bank heist'] },
  { name: 'Dacoity', baseSeverity: 'Critical', moList: ['Armed gang break-in', 'Highway interception', 'Estate loot'] },
  { name: 'Rioting', baseSeverity: 'High', moList: ['Political clash', 'Communal instigation', 'Labor protest outbreak'] },
  { name: 'Drug Trafficking', baseSeverity: 'High', moList: ['Peddling near colleges', 'Inter-state courier', 'Synthetic lab supply'] },
  { name: 'Women Harassment', baseSeverity: 'Medium', moList: ['Stalking online', 'Domestic violence', 'Workplace harassment', 'Eve-teasing in transit'] }
];

const WEAPONS = ['None', 'Knife', 'Sickle', 'Pistol', 'Revolver', 'Iron Rod', 'Wooden Staff', 'Acid', 'Country-made Bomb'];
const VEHICLES = ['None', 'Hero Honda Splendor', 'Bajaj Pulsar', 'White Maruti Swift', 'Black Mahindra Scorpio', 'Yellow Auto Rickshaw', 'Royal Enfield Bullet'];
const GENDERS = ['Male', 'Female', 'Other'];

async function run() {
  console.log('Generating seed database content for KSP Platform...');

  const passwordHash = await bcrypt.hash('admin123', 10);
  const scrbHash = await bcrypt.hash('scrb123', 10);
  const districtHash = await bcrypt.hash('blr123', 10);
  const stationHash = await bcrypt.hash('kor123', 10);
  const analystHash = await bcrypt.hash('analyst123', 10);
  const guestHash = await bcrypt.hash('guest123', 10);

  // 1. Create Users
  const users = [
    { id: 'u1', username: 'admin', password: passwordHash, role: 'Administrator', name: 'Dr. Praveen Sood, IPS', district: 'All', station: 'All', phone: '9900012345', email: 'admin@ksp.gov.in' },
    { id: 'u2', username: 'scrb', password: scrbHash, role: 'SCRB Officer', name: 'Alok Kumar, IPS', district: 'All', station: 'All', phone: '9900054321', email: 'scrb@ksp.gov.in' },
    { id: 'u3', username: 'district_blr', password: districtHash, role: 'District Officer', name: 'B. Dayananda, IPS', district: 'Bengaluru City', station: 'All', phone: '9900011111', email: 'cp.blr@ksp.gov.in' },
    { id: 'u4', username: 'station_kor', password: stationHash, role: 'Police Station Officer', name: 'Shanthappa J, Inspector', district: 'Bengaluru City', station: 'Koramangala', phone: '9900022222', email: 'koramangala.ps@ksp.gov.in' },
    { id: 'u5', username: 'analyst', password: analystHash, role: 'Crime Analyst', name: 'Neha Sharma, Senior Analyst', district: 'All', station: 'All', phone: '9900033333', email: 'analyst.scrb@ksp.gov.in' },
    { id: 'u6', username: 'guest', password: guestHash, role: 'Guest Demo Mode', name: 'Hackathon Evaluator', district: 'All', station: 'All', phone: '9900044444', email: 'evaluator@hackathon.com' }
  ];

  // 2. Create Police Stations & Districts structure
  const policeStations = [];
  let stationIdCounter = 1;
  DISTRICTS.forEach(d => {
    const list = STATIONS[d.name] || ['Town Station'];
    list.forEach(name => {
      // Offset lat/lon slightly from centroid
      const latOffset = (Math.random() - 0.5) * 0.12;
      const lonOffset = (Math.random() - 0.5) * 0.12;
      policeStations.push({
        id: `ps_${stationIdCounter++}`,
        name: name,
        district: d.name,
        latitude: d.lat + latOffset,
        longitude: d.lon + lonOffset,
        active_officers: Math.floor(Math.random() * 30) + 15,
        rating: (Math.random() * 1.5 + 3.5).toFixed(1)
      });
    });
  });

  // 3. Create Suspect master profiles
  const suspectNames = [
    { name: 'Kariya', alias: 'Karadi Kariya', age: 34, gender: 'Male' },
    { name: 'Manju', alias: 'Double-Meter Manja', age: 29, gender: 'Male' },
    { name: 'Sadiq', alias: 'Cutter Sadiq', age: 41, gender: 'Male' },
    { name: 'Shiva', alias: 'Market Shiva', age: 38, gender: 'Male' },
    { name: 'Stella', alias: 'Cyber Queen Stella', age: 26, gender: 'Female' },
    { name: 'Praveen', alias: 'Carder Praveen', age: 31, gender: 'Male' },
    { name: 'Ravi', alias: 'Bullet Ravi', age: 45, gender: 'Male' },
    { name: 'Lokesh', alias: 'Silent Lokesha', age: 27, gender: 'Male' },
    { name: 'Venkatesh', alias: 'Kulla Venka', age: 33, gender: 'Male' },
    { name: 'Imran', alias: 'Tech Imran', age: 24, gender: 'Male' },
    { name: 'Ramesh', alias: 'Agri Ramesh', age: 39, gender: 'Male' },
    { name: 'Suma', alias: 'Gold Suma', age: 32, gender: 'Female' },
    { name: 'Harish', alias: 'Dacoit Hari', age: 47, gender: 'Male' },
    { name: 'Anwar', alias: 'Bhai Anwar', age: 50, gender: 'Male' },
    { name: 'Dileep', alias: 'Phisher Dileep', age: 25, gender: 'Male' }
  ];

  const suspects = suspectNames.map((s, index) => ({
    id: `susp_${index + 1}`,
    name: s.name,
    alias: s.alias,
    age: s.age,
    gender: s.gender,
    phone: `9845${Math.floor(Math.random() * 899999 + 100000)}`,
    vehicle: VEHICLES[Math.floor(Math.random() * (VEHICLES.length - 1)) + 1],
    arrest_count: Math.floor(Math.random() * 6) + 1,
    status: Math.random() > 0.4 ? 'Absconding' : 'In Custody',
    mugshot: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${s.name}`,
    gang_association: Math.random() > 0.5 ? (Math.random() > 0.5 ? 'Deccan Chargers Gang' : 'Kalaburagi Syndicate') : 'Independent'
  }));

  // 4. Create FIRs, Victims, Witnesses, Evidence, Cases, and Audit Logs
  const firs = [];
  const victims = [];
  const witnesses = [];
  const evidence = [];
  const cases = [];
  const networks = [];

  const victimNames = ['Girish', 'Radha', 'Kiran', 'Nagesh', 'Asha', 'Vijay', 'Sumithra', 'Nitin', 'Shruti', 'Anand', 'Basavaraj', 'Mallikarjun'];
  const officerNames = ['Kumar Swamy', 'Mohan Rao', 'Satish Kumar', 'Girish Gowda', 'Archana Patil', 'Venkatesh Murthy'];

  let firCounter = 1001;
  let victimCounter = 1;
  let witnessCounter = 1;
  let evidenceCounter = 1;
  let caseCounter = 1;

  // Generate 520 crimes spread across past 365 days
  const baseTime = new Date('2025-07-24T00:00:00Z').getTime();
  const endTime = new Date('2026-07-24T00:00:00Z').getTime();

  for (let i = 0; i < 520; i++) {
    const timeFraction = i / 520;
    const incidentTimeMs = baseTime + timeFraction * (endTime - baseTime);
    const incidentDate = new Date(incidentTimeMs);

    // Pick District and Station
    const dist = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
    const stationsInDist = policeStations.filter(ps => ps.district === dist.name);
    const station = stationsInDist[Math.floor(Math.random() * stationsInDist.length)];

    // Pick Category and MO
    const cat = CRIME_CATEGORIES[Math.floor(Math.random() * CRIME_CATEGORIES.length)];
    const mo = cat.moList[Math.floor(Math.random() * cat.moList.length)];

    // Generate location (close to police station)
    const latOffset = (Math.random() - 0.5) * 0.05;
    const lonOffset = (Math.random() - 0.5) * 0.05;
    const lat = station.latitude + latOffset;
    const lon = station.longitude + lonOffset;

    // Severity mapping
    let severity = cat.baseSeverity;
    if (Math.random() > 0.8) severity = 'Critical';
    if (Math.random() < 0.2) severity = 'Low';

    const statusList = ['Solved', 'Under Investigation', 'Cold Case', 'Untraced'];
    const status = statusList[Math.floor(Math.random() * statusList.length)];

    const firId = `FIR-${dist.code}-${incidentDate.getFullYear()}-${firCounter++}`;

    firs.push({
      id: firId,
      fir_number: firId,
      incident_time: incidentDate.toISOString(),
      category: cat.name,
      modus_operandi: mo,
      district: dist.name,
      police_station: station.name,
      latitude: lat,
      longitude: lon,
      severity: severity,
      status: status,
      description: `Reported incident of ${cat.name.toLowerCase()} involving ${mo.toLowerCase()} at location coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)}) within ${station.name} police limits. First information received by duty officer.`,
      weapon: severity === 'Critical' || severity === 'High' ? WEAPONS[Math.floor(Math.random() * (WEAPONS.length - 1)) + 1] : 'None',
      vehicle: Math.random() > 0.5 ? VEHICLES[Math.floor(Math.random() * VEHICLES.length)] : 'None'
    });

    // Generate Victims
    const numVictims = Math.floor(Math.random() * 2) + 1;
    for (let v = 0; v < numVictims; v++) {
      victims.push({
        id: `vic_${victimCounter++}`,
        fir_id: firId,
        name: victimNames[Math.floor(Math.random() * victimNames.length)] + ' ' + String.fromCharCode(65 + Math.floor(Math.random() * 26)),
        age: Math.floor(Math.random() * 50) + 18,
        gender: GENDERS[Math.floor(Math.random() * GENDERS.length)]
      });
    }

    // Generate Witnesses (80% chance)
    if (Math.random() > 0.2) {
      witnesses.push({
        id: `wit_${witnessCounter++}`,
        fir_id: firId,
        name: 'Witness ' + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + ' ' + victimNames[Math.floor(Math.random() * victimNames.length)],
        contact: `9108${Math.floor(Math.random() * 899999 + 100000)}`
      });
    }

    // Link some FIRs to suspects (roughly 60% chance)
    if (Math.random() > 0.4) {
      const activeSuspect = suspects[Math.floor(Math.random() * suspects.length)];
      // update suspect table structure to link fir
      // Create relationship node link
      networks.push({
        source_id: activeSuspect.id,
        target_id: firId,
        type: 'SuspectInvolved',
        weight: 1
      });
    }

    // Generate evidence items for this case
    if (status !== 'Untraced' && Math.random() > 0.3) {
      const evTypes = ['CCTV Footage', 'Fingerprints', 'Mobile Dump', 'Recovered Stolen Goods', 'Blood Sample', 'Witness Statement Transcript'];
      const evType = evTypes[Math.floor(Math.random() * evTypes.length)];
      evidence.push({
        id: `ev_${evidenceCounter++}`,
        fir_id: firId,
        type: evType,
        description: `Secured evidence: ${evType.toLowerCase()} associated with Crime incident ${firId}. Stored under safe custody.`,
        hash: 'SHA256:' + require('crypto').randomBytes(16).toString('hex'),
        status: 'Locked in Locker'
      });
    }

    // Generate active Cases
    if (status === 'Under Investigation' || status === 'Solved') {
      const officer = officerNames[Math.floor(Math.random() * officerNames.length)];
      cases.push({
        id: `case_${caseCounter++}`,
        fir_id: firId,
        assigned_officer: officer,
        progress: status === 'Solved' ? 100 : Math.floor(Math.random() * 70) + 15,
        status: status === 'Solved' ? 'Closed' : 'Active',
        diary: [
          { date: incidentDate.toISOString(), entry: 'FIR registered and case diary opened.' },
          { date: new Date(incidentTimeMs + 86400000).toISOString(), entry: 'Visited crime scene and drew spot mahazar.' }
        ]
      });
    }
  }

  // 5. Build Graph Network Links between Suspects ( accomplices, phone calls, weapon sharing )
  // We'll create strong links to showcase PageRank and Betweenness Centrality
  // Let's form 3 primary clusters (gangs)
  for (let s1 = 0; s1 < suspects.length; s1++) {
    for (let s2 = s1 + 1; s2 < suspects.length; s2++) {
      const susp1 = suspects[s1];
      const susp2 = suspects[s2];

      let linked = false;
      let linkType = '';
      let weight = 1;

      // Gang-based connections
      if (susp1.gang_association !== 'Independent' && susp1.gang_association === susp2.gang_association) {
        linked = true;
        linkType = 'GangMember';
        weight = 3;
      }
      // Random call logs
      else if (Math.random() > 0.85) {
        linked = true;
        linkType = 'PhoneLink';
        weight = 1;
      }
      // Financial transactions
      else if (Math.random() > 0.92) {
        linked = true;
        linkType = 'FinancialLink';
        weight = 2;
      }

      if (linked) {
        networks.push({
          source_id: susp1.id,
          target_id: susp2.id,
          type: linkType,
          weight: weight
        });
      }
    }
  }

  // Ensure one node is highly central (e.g. Anwar susp_14 has links to almost everyone)
  const masterSuspect = suspects.find(s => s.alias === 'Bhai Anwar') || suspects[0];
  suspects.forEach(s => {
    if (s.id !== masterSuspect.id && Math.random() > 0.4) {
      networks.push({
        source_id: masterSuspect.id,
        target_id: s.id,
        type: 'Accomplice',
        weight: 2
      });
    }
  });

  // 6. Generate Audit Logs
  const audit_logs = [
    { id: 'al_1', username: 'admin', role: 'Administrator', action: 'DB_INIT', ip: '127.0.0.1', details: 'Database initialized and seeded with hackathon dataset.', timestamp: new Date().toISOString() }
  ];

  // Save all to database
  db.reset({
    users,
    firs,
    suspects,
    victims,
    witnesses,
    evidence,
    police_stations: policeStations,
    networks,
    audit_logs,
    cases
  });

  console.log(`Seeding complete! Saved:
    - ${users.length} Users
    - ${policeStations.length} Police Stations
    - ${firs.length} FIR Crimes
    - ${suspects.length} Suspects
    - ${victims.length} Victims
    - ${evidence.length} Evidence Records
    - ${networks.length} Network Graph Connections
    - ${cases.length} Relational Case Investigations`);
}

run().catch(err => {
  console.error('Error seeding database:', err);
});
