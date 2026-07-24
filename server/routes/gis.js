const express = require('express');
const db = require('../db');
const { authenticateJWT } = require('./auth');

const router = express.Router();

// Helper: Haversine distance formula (returns distance in km between two points)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 1. Get GIS crime points, hotspots, and risk layers
router.get('/pins', authenticateJWT, (req, res) => {
  const firs = db.getCollection('firs');
  const stations = db.getCollection('police_stations');

  const pins = firs.map(f => ({
    id: f.id,
    fir_number: f.fir_number,
    latitude: f.latitude,
    longitude: f.longitude,
    category: f.category,
    severity: f.severity,
    time: f.incident_time,
    district: f.district
  }));

  res.json({
    pins,
    stations: stations.map(s => ({
      id: s.id,
      name: s.name,
      district: s.district,
      latitude: s.latitude,
      longitude: s.longitude,
      active_officers: s.active_officers
    }))
  });
});

// 2. Geofence violation checking API
router.post('/check-geofence', authenticateJWT, (req, res) => {
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and Longitude are required' });
  }

  // Designate pre-defined virtual fence blocks in Bengaluru (e.g. MG Road, Koramangala)
  const FENCES = [
    {
      name: 'Koramangala High Risk Zone',
      latMin: 12.9200, latMax: 12.9450,
      lonMin: 77.6000, lonMax: 77.6400,
      riskLevel: 'High'
    },
    {
      name: 'Whitefield Industrial Estate Block',
      latMin: 12.9500, latMax: 12.9900,
      lonMin: 77.7200, lonMax: 77.7700,
      riskLevel: 'Medium'
    },
    {
      name: 'Mysuru Palace Precinct Geofence',
      latMin: 12.2900, latMax: 12.3150,
      lonMin: 76.6350, lonMax: 76.6600,
      riskLevel: 'Low'
    }
  ];

  const triggered = FENCES.find(f => 
    latitude >= f.latMin && latitude <= f.latMax &&
    longitude >= f.lonMin && longitude <= f.lonMax
  );

  if (triggered) {
    return res.json({
      inside: true,
      fenceName: triggered.name,
      riskLevel: triggered.riskLevel,
      message: `Coordinate is INSIDE the monitored geofenced zone: ${triggered.name}.`
    });
  }

  res.json({
    inside: false,
    message: 'Coordinate is outside all configured geofences.'
  });
});

// 3. Find nearby entities (CCTV, Police stations, hospitals)
router.get('/nearby', authenticateJWT, (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const radius = parseFloat(req.query.radius || 5.0); // Default 5km radius

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: 'Latitude and longitude query params are required' });
  }

  const stations = db.getCollection('police_stations');
  const firs = db.getCollection('firs');

  // Generate mock CCTV poles and Hospitals dynamically based on coordinate anchor (seeded)
  const nearbyStations = stations
    .map(s => ({ ...s, distance: haversineDistance(lat, lon, s.latitude, s.longitude) }))
    .filter(s => s.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

  const nearbyCrimes = firs
    .map(f => ({
      id: f.id,
      fir_number: f.fir_number,
      category: f.category,
      severity: f.severity,
      time: f.incident_time,
      distance: haversineDistance(lat, lon, f.latitude, f.longitude)
    }))
    .filter(f => f.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10);

  // Generate 5 CCTV cameras and 3 hospitals nearby (reproducible offsets)
  const nearbyCctv = [];
  for (let i = 1; i <= 5; i++) {
    const latOffset = (Math.sin(i * 123.4) * 0.01);
    const lonOffset = (Math.cos(i * 321.4) * 0.01);
    const cctvLat = lat + latOffset;
    const cctvLon = lon + lonOffset;
    const dist = haversineDistance(lat, lon, cctvLat, cctvLon);
    if (dist <= radius) {
      nearbyCctv.push({
        id: `cctv_${i}`,
        camera_model: `KSP-HikVision-HD-${i + 100}`,
        ip_address: `10.21.144.${10 + i}`,
        latitude: cctvLat,
        longitude: cctvLon,
        distance: dist.toFixed(2),
        status: i === 4 ? 'Inactive' : 'Live Feed Active'
      });
    }
  }

  const nearbyHospitals = [];
  const hospNames = ['Apollo Specialty', 'Fortis Hospital', 'St. Johns Medical College', 'KSP Wellness Clinic'];
  for (let i = 0; i < hospNames.length; i++) {
    const latOffset = (Math.sin(i * 88.8) * 0.02);
    const lonOffset = (Math.cos(i * 99.9) * 0.02);
    const hospLat = lat + latOffset;
    const hospLon = lon + lonOffset;
    const dist = haversineDistance(lat, lon, hospLat, hospLon);
    if (dist <= radius) {
      nearbyHospitals.push({
        id: `hosp_${i + 1}`,
        name: hospNames[i],
        latitude: hospLat,
        longitude: hospLon,
        distance: dist.toFixed(2),
        emergency_beds: Math.floor(Math.random() * 20) + 5
      });
    }
  }

  res.json({
    policestations: nearbyStations.map(s => ({ ...s, distance: s.distance.toFixed(2) })),
    crimes: nearbyCrimes.map(f => ({ ...f, distance: f.distance.toFixed(2) })),
    cctv: nearbyCctv,
    hospitals: nearbyHospitals
  });
});

module.exports = router;
