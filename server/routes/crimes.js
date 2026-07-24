const express = require('express');
const db = require('../db');
const { authenticateJWT, requireRole } = require('./auth');

const router = express.Router();

// Helper: Levenshtein distance for text matching (duplicate detection)
function getLevenshteinDistance(s1, s2) {
  const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j - 1][i] + 1,
        track[j][i - 1] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  return track[s2.length][s1.length];
}

function getSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const dist = getLevenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - dist / maxLen;
}

// Helper: Duplicate check logic
function checkDuplicateFIR(newFir) {
  const existingFirs = db.getCollection('firs');
  const match = existingFirs.find(fir => {
    // Time delta within 2 hours
    const time1 = new Date(fir.incident_time).getTime();
    const time2 = new Date(newFir.incident_time).getTime();
    const isTimeClose = Math.abs(time1 - time2) <= 2 * 60 * 60 * 1000;

    // Same category & district & station
    const isLocationMatch = fir.district === newFir.district && fir.police_station === newFir.police_station;
    const isCategoryMatch = fir.category === newFir.category;

    // Details similarity score
    const similarity = getSimilarity(fir.description, newFir.description);

    return (isTimeClose && isLocationMatch && isCategoryMatch) || similarity > 0.85;
  });

  return match ? match.id : null;
}

// FIR Routes
router.get('/firs', authenticateJWT, (req, res) => {
  let firs = db.getCollection('firs');

  // Filter based on officer scope
  if (req.user.role === 'District Officer' && req.user.district !== 'All') {
    firs = firs.filter(f => f.district === req.user.district);
  } else if (req.user.role === 'Police Station Officer' && req.user.station !== 'All') {
    firs = firs.filter(f => f.district === req.user.district && f.police_station === req.user.station);
  }

  res.json(firs);
});

router.post('/firs', authenticateJWT, requireRole(['Administrator', 'SCRB Officer', 'District Officer', 'Police Station Officer']), (req, res) => {
  const { incident_time, category, modus_operandi, district, police_station, latitude, longitude, severity, status, description, weapon, vehicle } = req.body;

  // Validation
  if (!incident_time || !category || !modus_operandi || !district || !police_station || !latitude || !longitude || !description) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }

  const newFir = {
    incident_time,
    category,
    modus_operandi,
    district,
    police_station,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    severity: severity || 'Medium',
    status: status || 'Under Investigation',
    description,
    weapon: weapon || 'None',
    vehicle: vehicle || 'None'
  };

  // Duplicate Check
  const duplicateId = checkDuplicateFIR(newFir);
  if (duplicateId) {
    return res.status(409).json({ error: 'Duplicate crime report detected', duplicateFirId: duplicateId });
  }

  // Set formatted FIR number
  const year = new Date(incident_time).getFullYear();
  const districtCode = district.substring(0, 3).toUpperCase();
  const existingCount = db.getCollection('firs').length;
  newFir.fir_number = `FIR-${districtCode}-${year}-${1000 + existingCount + 1}`;
  newFir.id = newFir.fir_number;

  const saved = db.insert('firs', newFir);

  // Auto-create case record for investigation tracking
  if (saved.status === 'Under Investigation' || saved.status === 'Solved') {
    db.insert('cases', {
      fir_id: saved.id,
      assigned_officer: 'Unassigned',
      progress: saved.status === 'Solved' ? 100 : 10,
      status: saved.status === 'Solved' ? 'Closed' : 'Active',
      diary: [{ date: new Date().toISOString(), entry: 'Case automatically initialized.' }]
    });
  }

  db.logAction(req.user.username, req.user.role, 'CREATE_FIR', req.ip, `Registered new FIR: ${saved.id}`);
  res.status(201).json(saved);
});

router.put('/firs/:id', authenticateJWT, requireRole(['Administrator', 'SCRB Officer', 'District Officer', 'Police Station Officer']), (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Force lat/lon to float if updated
  if (updates.latitude) updates.latitude = parseFloat(updates.latitude);
  if (updates.longitude) updates.longitude = parseFloat(updates.longitude);

  const updated = db.update('firs', id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'FIR not found' });
  }

  db.logAction(req.user.username, req.user.role, 'UPDATE_FIR', req.ip, `Updated FIR details for: ${id}`);
  res.json(updated);
});

router.delete('/firs/:id', authenticateJWT, requireRole(['Administrator', 'SCRB Officer']), (req, res) => {
  const { id } = req.params;
  const deleted = db.delete('firs', id);
  if (!deleted) {
    return res.status(404).json({ error: 'FIR not found' });
  }

  // Clean cases and other links
  const relatedCases = db.find('cases', c => c.fir_id === id);
  relatedCases.forEach(c => db.delete('cases', c.id));

  db.logAction(req.user.username, req.user.role, 'DELETE_FIR', req.ip, `Deleted FIR record: ${id}`);
  res.json({ message: 'FIR record deleted successfully' });
});

// CSV / Bulk Upload API
router.post('/bulk-upload', authenticateJWT, requireRole(['Administrator', 'SCRB Officer']), (req, res) => {
  const { csvData } = req.body;
  if (!csvData) {
    return res.status(400).json({ error: 'CSV dataset string is required' });
  }

  const lines = csvData.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  let insertedCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length < headers.length) continue;

    const row = {};
    headers.forEach((h, index) => {
      row[h] = values[index];
    });

    // Translate properties
    const newFir = {
      incident_time: row.incident_time || new Date().toISOString(),
      category: row.category,
      modus_operandi: row.modus_operandi,
      district: row.district,
      police_station: row.police_station,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      severity: row.severity || 'Medium',
      status: row.status || 'Under Investigation',
      description: row.description || `Bulk imported case of ${row.category}`,
      weapon: row.weapon || 'None',
      vehicle: row.vehicle || 'None'
    };

    // Validate
    if (!newFir.category || !newFir.district || !newFir.police_station || isNaN(newFir.latitude) || isNaN(newFir.longitude)) {
      errors.push(`Row ${i}: Missing required parameters or invalid coordinates.`);
      skippedCount++;
      continue;
    }

    // Check duplicate
    const isDuplicate = checkDuplicateFIR(newFir);
    if (isDuplicate) {
      skippedCount++;
      continue;
    }

    // Generate unique FIR ID
    const year = new Date(newFir.incident_time).getFullYear();
    const districtCode = newFir.district.substring(0, 3).toUpperCase();
    const existingCount = db.getCollection('firs').length + insertedCount;
    newFir.fir_number = `FIR-${districtCode}-${year}-${1000 + existingCount + 1}`;
    newFir.id = newFir.fir_number;

    db.insert('firs', newFir);
    insertedCount++;
  }

  db.logAction(req.user.username, req.user.role, 'BULK_UPLOAD_FIR', req.ip, `Bulk uploaded dataset. Inserted: ${insertedCount}, Skipped/Duplicate: ${skippedCount}`);

  res.json({
    message: 'Bulk processing completed',
    inserted: insertedCount,
    skipped: skippedCount,
    errors
  });
});

// Suspects API
router.get('/suspects', authenticateJWT, (req, res) => {
  res.json(db.getCollection('suspects'));
});

router.post('/suspects', authenticateJWT, requireRole(['Administrator', 'SCRB Officer', 'Crime Analyst']), (req, res) => {
  const newSuspect = req.body;
  if (!newSuspect.name || !newSuspect.age) {
    return res.status(400).json({ error: 'Name and age are required' });
  }
  newSuspect.arrest_count = parseInt(newSuspect.arrest_count || 0);
  newSuspect.status = newSuspect.status || 'Absconding';
  newSuspect.mugshot = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${newSuspect.name}`;

  const saved = db.insert('suspects', newSuspect);
  db.logAction(req.user.username, req.user.role, 'CREATE_SUSPECT', req.ip, `Added suspect: ${saved.name}`);
  res.status(201).json(saved);
});

router.put('/suspects/:id', authenticateJWT, requireRole(['Administrator', 'SCRB Officer', 'Crime Analyst']), (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (updates.arrest_count) updates.arrest_count = parseInt(updates.arrest_count);

  const updated = db.update('suspects', id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Suspect not found' });
  }
  res.json(updated);
});

router.delete('/suspects/:id', authenticateJWT, requireRole(['Administrator', 'SCRB Officer']), (req, res) => {
  const { id } = req.params;
  const deleted = db.delete('suspects', id);
  if (!deleted) {
    return res.status(444).json({ error: 'Suspect not found' });
  }
  res.json({ message: 'Suspect profile deleted' });
});

// Evidence API
router.get('/evidence', authenticateJWT, (req, res) => {
  res.json(db.getCollection('evidence'));
});

router.post('/evidence', authenticateJWT, requireRole(['Administrator', 'SCRB Officer', 'Police Station Officer']), (req, res) => {
  const ev = req.body;
  if (!ev.fir_id || !ev.type || !ev.description) {
    return res.status(400).json({ error: 'FIR ID, type, and description are required' });
  }
  ev.hash = 'SHA256:' + require('crypto').randomBytes(16).toString('hex');
  ev.status = ev.status || 'Locked in Locker';

  const saved = db.insert('evidence', ev);
  db.logAction(req.user.username, req.user.role, 'ADD_EVIDENCE', req.ip, `Evidence log added: ${saved.id} linked to ${saved.fir_id}`);
  res.status(201).json(saved);
});

// Victims API
router.get('/victims', authenticateJWT, (req, res) => {
  res.json(db.getCollection('victims'));
});

// Police Stations list (public access read-only, management by admin)
router.get('/stations', authenticateJWT, (req, res) => {
  res.json(db.getCollection('police_stations'));
});

module.exports = router;
