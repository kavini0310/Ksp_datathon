const express = require('express');
const db = require('../db');
const { authenticateJWT } = require('./auth');

const router = express.Router();

// Helper: Calculate Pearson Correlation Coefficient between two arrays
function calculatePearsonCorrelation(x, y) {
  const n = x.length;
  if (n === 0 || y.length === 0) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  
  const meanX = sumX / n;
  const meanY = sumY / n;
  
  let num = 0;
  let denX = 0;
  let denY = 0;
  
  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    num += diffX * diffY;
    denX += diffX * diffX;
    denY += diffY * diffY;
  }
  
  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
}

// 1. KPI Cards and Home Dashboard summary statistics
router.get('/summary', authenticateJWT, (req, res) => {
  const firs = db.getCollection('firs');
  const suspects = db.getCollection('suspects');
  const cases = db.getCollection('cases');

  const totalCrimes = firs.length;
  
  // Today's crimes (mocked relative to the end date of 2026-07-24)
  const todayStart = new Date('2026-07-23T20:00:00.000Z').getTime(); // Last 24 hrs
  const todayCrimes = firs.filter(f => new Date(f.incident_time).getTime() >= todayStart).length;

  const activeInvestigations = cases.filter(c => c.status === 'Active').length;
  
  // Repeat offenders (arrests > 1)
  const repeatOffenders = suspects.filter(s => s.arrest_count > 1).length;

  // Most dangerous district
  const districtCounts = {};
  firs.forEach(f => {
    districtCounts[f.district] = (districtCounts[f.district] || 0) + 1;
  });
  let mostDangerousDistrict = 'N/A';
  let maxDistrictCount = 0;
  Object.keys(districtCounts).forEach(d => {
    if (districtCounts[d] > maxDistrictCount) {
      maxDistrictCount = districtCounts[d];
      mostDangerousDistrict = d;
    }
  });

  // Category counts
  const categoryCounts = {};
  firs.forEach(f => {
    categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
  });
  const topCategories = Object.keys(categoryCounts)
    .map(name => ({ name, count: categoryCounts[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent 5 alerts (mock dynamic alerts based on high severity cases)
  const recentAlerts = firs
    .filter(f => f.severity === 'Critical')
    .slice(0, 5)
    .map(f => ({
      id: `alert_${f.id}`,
      type: 'CRITICAL_CRIME',
      message: `Critical severity incident [${f.category}] registered in ${f.district} at ${f.police_station}.`,
      time: f.incident_time
    }));

  // Latest 5 FIRs
  const latestFirs = [...firs]
    .sort((a, b) => new Date(b.incident_time) - new Date(a.incident_time))
    .slice(0, 5);

  res.json({
    kpis: {
      totalCrimes,
      todayCrimes,
      activeInvestigations,
      repeatOffenders,
      mostDangerousDistrict,
      crimeHeatIndex: (totalCrimes / 10).toFixed(1)
    },
    topCategories,
    recentAlerts,
    latestFirs
  });
});

// 2. Trend analytics
router.get('/trend', authenticateJWT, (req, res) => {
  const firs = db.getCollection('firs');
  
  // Group by Month (Year-Month)
  const monthlyData = {};
  firs.forEach(f => {
    const d = new Date(f.incident_time);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[label]) {
      monthlyData[label] = { month: label, total: 0, Cybercrime: 0, Murder: 0, Robbery: 0, Dacoity: 0, Rioting: 0, 'Drug Trafficking': 0, 'Women Harassment': 0 };
    }
    monthlyData[label].total++;
    if (monthlyData[label][f.category] !== undefined) {
      monthlyData[label][f.category]++;
    }
  });

  const sortedData = Object.keys(monthlyData)
    .sort()
    .map(k => monthlyData[k]);

  res.json(sortedData);
});

// 3. Temporal (Hourly Crime Clock and Day of Week distributions)
router.get('/temporal', authenticateJWT, (req, res) => {
  const firs = db.getCollection('firs');
  
  const hourly = Array(24).fill(0);
  const daily = { Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 };
  const weekly = Array(53).fill(0); // Weeks of the year

  firs.forEach(f => {
    const date = new Date(f.incident_time);
    hourly[date.getHours()]++;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    daily[days[date.getDay()]]++;

    // Simple week calculation
    const oneJan = new Date(date.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
    if (week >= 1 && week <= 53) {
      weekly[week - 1]++;
    }
  });

  res.json({
    hourly: hourly.map((count, hour) => ({ hour: `${hour}:00`, count })),
    daily: Object.keys(daily).map(day => ({ day, count: daily[day] })),
    weekly: weekly.map((count, index) => ({ week: `Week ${index + 1}`, count }))
  });
});

// 4. Anomaly Spikes detection (Z-Score analysis per district)
router.get('/anomalies', authenticateJWT, (req, res) => {
  const firs = db.getCollection('firs');
  
  // Compute monthly volume per district
  const districtMonthly = {}; // { 'Bengaluru': { '2025-08': 5, '2025-09': 8 ... } }
  
  firs.forEach(f => {
    const d = new Date(f.incident_time);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!districtMonthly[f.district]) districtMonthly[f.district] = {};
    districtMonthly[f.district][month] = (districtMonthly[f.district][month] || 0) + 1;
  });

  const anomaliesList = [];

  Object.keys(districtMonthly).forEach(dist => {
    const monthlyVolumes = Object.values(districtMonthly[dist]);
    if (monthlyVolumes.length < 3) return; // Need enough history for stats

    // Mean
    const mean = monthlyVolumes.reduce((a, b) => a + b, 0) / monthlyVolumes.length;
    // Standard deviation
    const variance = monthlyVolumes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / monthlyVolumes.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return;

    // Check latest month for spikes
    const monthsSorted = Object.keys(districtMonthly[dist]).sort();
    const latestMonth = monthsSorted[monthsSorted.length - 1];
    const latestVolume = districtMonthly[dist][latestMonth];

    const zScore = (latestVolume - mean) / stdDev;

    // Z-Score threshold of 1.5 for a visible anomaly in demo data
    if (zScore > 1.5) {
      anomaliesList.push({
        district: dist,
        month: latestMonth,
        volume: latestVolume,
        mean: mean.toFixed(1),
        zScore: zScore.toFixed(2),
        message: `Abnormal surge in Crime Volume detected in ${dist} during ${latestMonth} (${latestVolume} incidents vs mean ${mean.toFixed(1)}).`
      });
    }
  });

  res.json(anomaliesList);
});

// 5. Socioeconomic overlays and correlation matrices
router.get('/socioeconomic', authenticateJWT, (req, res) => {
  const firs = db.getCollection('firs');

  // Socioeconomic values per district (from static details seeded in generateData.js)
  const districtsMetadata = {
    'Bengaluru City': { popDensity: 4380, literacy: 88.48, poverty: 9.2, unemployment: 5.4, urbanization: 90.5 },
    'Mysuru': { popDensity: 476, literacy: 72.79, poverty: 14.5, unemployment: 6.2, urbanization: 41.5 },
    'Belagavi': { popDensity: 356, literacy: 73.48, poverty: 18.2, unemployment: 4.8, urbanization: 25.3 },
    'Hubballi-Dharwad': { popDensity: 430, literacy: 80.30, poverty: 12.1, unemployment: 5.1, urbanization: 56.8 },
    'Mangaluru (Dakshina Kannada)': { popDensity: 430, literacy: 88.57, poverty: 8.1, unemployment: 7.2, urbanization: 47.6 },
    'Kalaburagi': { popDensity: 233, literacy: 64.85, poverty: 28.5, unemployment: 8.9, urbanization: 32.4 },
    'Shivamogga': { popDensity: 207, literacy: 80.45, poverty: 15.1, unemployment: 5.6, urbanization: 35.6 },
    'Tumakuru': { popDensity: 253, literacy: 75.14, poverty: 16.8, unemployment: 4.5, urbanization: 22.4 },
    'Udupi': { popDensity: 328, literacy: 86.29, poverty: 7.3, unemployment: 6.8, urbanization: 29.8 },
    'Kolar': { popDensity: 386, literacy: 74.39, poverty: 17.5, unemployment: 4.9, urbanization: 31.2 }
  };

  // Dynamic Crime rate calculation (crimes per district)
  const distCounts = {};
  firs.forEach(f => {
    distCounts[f.district] = (distCounts[f.district] || 0) + 1;
  });

  const districts = Object.keys(districtsMetadata);
  const crimeRate = districts.map(d => distCounts[d] || 0);
  const density = districts.map(d => districtsMetadata[d].popDensity);
  const literacy = districts.map(d => districtsMetadata[d].literacy);
  const poverty = districts.map(d => districtsMetadata[d].poverty);
  const unemployment = districts.map(d => districtsMetadata[d].unemployment);
  const urbanization = districts.map(d => districtsMetadata[d].urbanization);

  const correlationMatrix = {
    crimeRate: {
      crimeRate: 1,
      density: calculatePearsonCorrelation(crimeRate, density).toFixed(2),
      literacy: calculatePearsonCorrelation(crimeRate, literacy).toFixed(2),
      poverty: calculatePearsonCorrelation(crimeRate, poverty).toFixed(2),
      unemployment: calculatePearsonCorrelation(crimeRate, unemployment).toFixed(2),
      urbanization: calculatePearsonCorrelation(crimeRate, urbanization).toFixed(2),
    },
    density: {
      crimeRate: calculatePearsonCorrelation(density, crimeRate).toFixed(2),
      density: 1,
      literacy: calculatePearsonCorrelation(density, literacy).toFixed(2),
      poverty: calculatePearsonCorrelation(density, poverty).toFixed(2),
      unemployment: calculatePearsonCorrelation(density, unemployment).toFixed(2),
      urbanization: calculatePearsonCorrelation(density, urbanization).toFixed(2),
    },
    literacy: {
      crimeRate: calculatePearsonCorrelation(literacy, crimeRate).toFixed(2),
      density: calculatePearsonCorrelation(literacy, density).toFixed(2),
      literacy: 1,
      poverty: calculatePearsonCorrelation(literacy, poverty).toFixed(2),
      unemployment: calculatePearsonCorrelation(literacy, unemployment).toFixed(2),
      urbanization: calculatePearsonCorrelation(literacy, urbanization).toFixed(2),
    },
    poverty: {
      crimeRate: calculatePearsonCorrelation(poverty, crimeRate).toFixed(2),
      density: calculatePearsonCorrelation(poverty, density).toFixed(2),
      literacy: calculatePearsonCorrelation(poverty, literacy).toFixed(2),
      poverty: 1,
      unemployment: calculatePearsonCorrelation(poverty, unemployment).toFixed(2),
      urbanization: calculatePearsonCorrelation(poverty, urbanization).toFixed(2),
    },
    unemployment: {
      crimeRate: calculatePearsonCorrelation(unemployment, crimeRate).toFixed(2),
      density: calculatePearsonCorrelation(unemployment, density).toFixed(2),
      literacy: calculatePearsonCorrelation(unemployment, literacy).toFixed(2),
      poverty: calculatePearsonCorrelation(unemployment, poverty).toFixed(2),
      unemployment: 1,
      urbanization: calculatePearsonCorrelation(unemployment, urbanization).toFixed(2),
    }
  };

  res.json({
    correlationMatrix,
    rawIndicators: districts.map(d => ({
      district: d,
      crimeCount: distCounts[d] || 0,
      ...districtsMetadata[d]
    }))
  });
});

module.exports = router;
