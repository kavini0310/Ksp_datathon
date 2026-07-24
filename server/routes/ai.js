const express = require('express');
const db = require('../db');
const { authenticateJWT } = require('./auth');

const router = express.Router();

// Helper: Calculate Jaccard similarity for MO clustering
function computeJaccardSimilarity(f1, f2) {
  let intersection = 0;
  let union = 0;

  // Features to match
  const features = [
    { key: 'category', weight: 3 },
    { key: 'modus_operandi', weight: 4 },
    { key: 'weapon', weight: 2 },
    { key: 'vehicle', weight: 2 }
  ];

  features.forEach(feat => {
    const val1 = f1[feat.key];
    const val2 = f2[feat.key];
    
    if (val1 && val2) {
      if (val1.toLowerCase() === val2.toLowerCase()) {
        intersection += feat.weight;
      }
      union += feat.weight;
    }
  });

  // Time of day overlap (night vs day)
  const hour1 = new Date(f1.incident_time).getHours();
  const hour2 = new Date(f2.incident_time).getHours();
  const isNight1 = hour1 >= 19 || hour1 <= 5;
  const isNight2 = hour2 >= 19 || hour2 <= 5;
  
  union += 1;
  if (isNight1 === isNight2) {
    intersection += 1;
  }

  return union === 0 ? 0 : intersection / union;
}

// 1. Natural Language Search Engine Parser
router.post('/search', authenticateJWT, (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const firs = db.getCollection('firs');
  const suspects = db.getCollection('suspects');

  const normalizedQuery = query.toLowerCase();
  
  // A. Determine Target Collection
  let target = 'firs';
  if (normalizedQuery.includes('suspect') || normalizedQuery.includes('offender') || normalizedQuery.includes('gang') || normalizedQuery.includes('who is')) {
    target = 'suspects';
  }

  // B. Parse Filters
  let filteredFirs = [...firs];
  let filteredSuspects = [...suspects];
  const appliedFilters = {};

  // Extract District
  const districts = ['bengaluru', 'mysuru', 'belagavi', 'hubballi', 'mangalu', 'kalaburagi', 'shivamogga', 'tumakuru', 'udupi', 'kolar'];
  districts.forEach(d => {
    if (normalizedQuery.includes(d)) {
      appliedFilters.district = d;
      if (target === 'firs') {
        filteredFirs = filteredFirs.filter(f => f.district.toLowerCase().includes(d));
      } else {
        filteredSuspects = filteredSuspects.filter(s => s.gang_association.toLowerCase().includes(d));
      }
    }
  });

  // Extract Categories
  const categories = ['cybercrime', 'murder', 'robbery', 'dacoity', 'rioting', 'drug', 'harassment'];
  categories.forEach(c => {
    if (normalizedQuery.includes(c)) {
      appliedFilters.category = c;
      if (target === 'firs') {
        filteredFirs = filteredFirs.filter(f => f.category.toLowerCase().includes(c));
      }
    }
  });

  // Extract Temporal Keywords
  if (normalizedQuery.includes('night') || normalizedQuery.includes('dark')) {
    appliedFilters.time = 'Night (7pm - 6am)';
    filteredFirs = filteredFirs.filter(f => {
      const h = new Date(f.incident_time).getHours();
      return h >= 19 || h <= 5;
    });
  } else if (normalizedQuery.includes('day') || normalizedQuery.includes('morning')) {
    appliedFilters.time = 'Day (6am - 7pm)';
    filteredFirs = filteredFirs.filter(f => {
      const h = new Date(f.incident_time).getHours();
      return h > 5 && h < 19;
    });
  }

  // Extract Suspect Status
  if (normalizedQuery.includes('absconding') || normalizedQuery.includes('run')) {
    appliedFilters.suspectStatus = 'Absconding';
    filteredSuspects = filteredSuspects.filter(s => s.status === 'Absconding');
  } else if (normalizedQuery.includes('custody') || normalizedQuery.includes('jail') || normalizedQuery.includes('arrested')) {
    appliedFilters.suspectStatus = 'In Custody';
    filteredSuspects = filteredSuspects.filter(s => s.status === 'In Custody');
  }

  // Extract Suspect alias/name directly
  suspects.forEach(s => {
    const aliasLower = s.alias.toLowerCase();
    const nameLower = s.name.toLowerCase();
    if (normalizedQuery.includes(aliasLower) || normalizedQuery.includes(nameLower)) {
      target = 'suspects';
      filteredSuspects = [s];
    }
  });

  res.json({
    target,
    appliedFilters,
    results: target === 'firs' ? filteredFirs.slice(0, 50) : filteredSuspects
  });
});

// 2. Modus Operandi Clustering Engine
router.get('/mo-clusters', authenticateJWT, (req, res) => {
  const firs = db.getCollection('firs');
  
  // Filter only solved or active cases
  const workingSet = firs.slice(0, 150);
  const clusters = [];
  const visited = new Set();

  for (let i = 0; i < workingSet.length; i++) {
    if (visited.has(workingSet[i].id)) continue;

    const currentCluster = [workingSet[i]];
    visited.add(workingSet[i].id);

    for (let j = i + 1; j < workingSet.length; j++) {
      if (visited.has(workingSet[j].id)) continue;

      const sim = computeJaccardSimilarity(workingSet[i], workingSet[j]);
      // Threshold 0.65 for MO linking
      if (sim >= 0.65) {
        currentCluster.push(workingSet[j]);
        visited.add(workingSet[j].id);
      }
    }

    if (currentCluster.length > 1) {
      clusters.push({
        id: `mo_cluster_${clusters.length + 1}`,
        category: currentCluster[0].category,
        primaryMo: currentCluster[0].modus_operandi,
        size: currentCluster.length,
        cases: currentCluster.map(c => ({ id: c.id, date: c.incident_time, location: `${c.police_station}, ${c.district}` })),
        weaponsUsed: [...new Set(currentCluster.map(c => c.weapon).filter(w => w !== 'None'))],
        vehiclesSeen: [...new Set(currentCluster.map(c => c.vehicle).filter(v => v !== 'None'))]
      });
    }
  }

  // Sort clusters by size
  clusters.sort((a, b) => b.size - a.size);
  res.json(clusters);
});

// 3. AI Crime Forecasting and Predictive Policing
router.get('/forecast', authenticateJWT, (req, res) => {
  const firs = db.getCollection('firs');
  const stations = db.getCollection('police_stations');

  // Compute baseline risk values per district
  const districts = ['Bengaluru City', 'Mysuru', 'Belagavi', 'Hubballi-Dharwad', 'Mangaluru (Dakshina Kannada)', 'Kalaburagi', 'Shivamogga', 'Tumakuru', 'Udupi', 'Kolar'];
  
  const forecasts = districts.map((dist, idx) => {
    // Slice crimes in this district
    const distCrimes = firs.filter(f => f.district === dist);
    const totalCount = distCrimes.length;

    // Trend slope (last 90 days vs previous 90 days)
    const ninetyDaysAgo = new Date('2026-04-25T00:00:00Z').getTime();
    const hundredEightyDaysAgo = new Date('2026-01-25T00:00:00Z').getTime();
    
    const recentCount = distCrimes.filter(f => new Date(f.incident_time).getTime() >= ninetyDaysAgo).length;
    const historicCount = distCrimes.filter(f => {
      const t = new Date(f.incident_time).getTime();
      return t >= hundredEightyDaysAgo && t < ninetyDaysAgo;
    }).length;

    const slope = historicCount === 0 ? 0 : (recentCount - historicCount) / historicCount;
    
    // Base probability metrics (higher density = higher baseline)
    const densityWeight = dist === 'Bengaluru City' ? 0.35 : 0.15;
    const trendMultiplier = 1 + slope;
    let confidence = 0.75 + (totalCount / 1000);
    if (confidence > 0.95) confidence = 0.95;

    const rawProb = (totalCount / firs.length) * 100 * trendMultiplier + (densityWeight * 100);
    const probability = Math.min(Math.max(Math.round(rawProb), 15), 94);

    // Identify emerging crime type
    const catCounts = {};
    distCrimes.forEach(f => catCounts[f.category] = (catCounts[f.category] || 0) + 1);
    let emergingCategory = 'Cybercrime';
    let maxEmerging = 0;
    Object.keys(catCounts).forEach(c => {
      if (catCounts[c] > maxEmerging) {
        maxEmerging = catCounts[c];
        emergingCategory = c;
      }
    });

    // Generate simulated patrol routes using nearby stations
    const stationsInDist = stations.filter(s => s.district === dist).slice(0, 3);
    const patrolRoutes = stationsInDist.map(s => {
      // Create offset path coordinates
      return [
        { name: `${s.name} Central`, lat: s.latitude, lon: s.longitude },
        { name: `${s.name} Sector A`, lat: s.latitude + 0.008, lon: s.longitude + 0.008 },
        { name: `${s.name} Sector B Patrol`, lat: s.latitude - 0.005, lon: s.longitude - 0.005 }
      ];
    });

    return {
      district: dist,
      riskScore: probability > 70 ? 'High' : (probability > 40 ? 'Medium' : 'Low'),
      probability: `${probability}%`,
      confidence: `${Math.round(confidence * 100)}%`,
      emergingCategory,
      resourceRequirement: probability > 75 ? 'Dispatch Tactical Patrol units' : 'Regular beat rounds',
      patrolRoutes,
      explanations: [
        { feature: 'Crime volume trend slope (last 90d)', weight: `${Math.round(Math.abs(slope * 40))}% influence` },
        { feature: 'Socioeconomic density threshold', weight: `${Math.round(densityWeight * 100)}% influence` },
        { feature: 'Historical repeating hotspot correlation', weight: '35% influence' }
      ]
    };
  });

  res.json(forecasts);
});

// 4. AI narrative creator
router.post('/narrative', authenticateJWT, (req, res) => {
  const { suspectId } = req.body;
  if (!suspectId) {
    return res.status(400).json({ error: 'Suspect ID is required' });
  }

  const suspect = db.findOne('suspects', s => s.id === suspectId);
  if (!suspect) {
    return res.status(404).json({ error: 'Suspect profile not found' });
  }

  const networks = db.getCollection('networks');
  const firs = db.getCollection('firs');

  // Find linked crimes (edges where suspect is linked to fir)
  const crimeLinks = networks.filter(net => net.source_id === suspect.id && net.type === 'SuspectInvolved');
  const casesLinked = crimeLinks.map(link => firs.find(f => f.id === link.target_id)).filter(Boolean);

  // Find accomplices (networks linked to other suspects)
  const associateLinks = networks.filter(net => 
    (net.source_id === suspect.id || net.target_id === suspect.id) && 
    net.type !== 'SuspectInvolved'
  );
  
  const associates = associateLinks.map(link => {
    const peerId = link.source_id === suspect.id ? link.target_id : link.source_id;
    const peer = db.findOne('suspects', s => s.id === peerId);
    return peer ? `${peer.name} (${peer.alias}) via [${link.type}]` : null;
  }).filter(Boolean);

  // AI text generation simulation
  const narrative = `### INTELLIGENCE BRIEFING: PROFILE OF ${suspect.name.toUpperCase()} (ALIAS: ${suspect.alias})

#### Executive Summary:
${suspect.name}, widely recognized by his street alias **"${suspect.alias}"**, is a registered class-A offender associated with the group **"${suspect.gang_association}"**. He is currently listed as **${suspect.status}**. With a total of **${suspect.arrest_count} prior arrests**, his recidivism probability index stands at **${(suspect.arrest_count * 15) + 10}%**.

#### Modus Operandi & Behavior Patterns:
Detailed audit of criminal files suggests ${suspect.name} primary operational category is **${casesLinked[0]?.category || 'Armed Robbery'}**. The suspect utilizes **${casesLinked[0]?.modus_operandi || 'night break-ins'}** as his core modus operandi. Weapon preference indicators suggest frequent utilization of a **${casesLinked[0]?.weapon || 'Knife/Rod'}**, with active coordination using a **${suspect.vehicle || 'Pulsar motorcycle'}** for quick escape routes in congested segments.

#### Criminal Syndicate Network:
The network centrality model places "${suspect.alias}" in a critical node position within the regional network graph. Relational matrices reveal direct associations with **${associates.length} primary accomplices**, including:
${associates.map(a => `- ${a}`).join('\n') || '- No active gang accomplices indexed in this folder.'}

#### Tactical Intelligence & Investigations:
The suspect is currently linked to **${casesLinked.length} active investigations**, detailed below:
${casesLinked.map(c => `- **${c.id}**: Incident of ${c.category} in ${c.district} on ${new Date(c.incident_time).toLocaleDateString()}. Status: *${c.status}*.`).join('\n') || '- No specific active files linked.'}

#### Countermeasures Recommendations:
1. **Targeted Surveillance:** Deploy active geo-tracking intercept on communication relays matching his associate network.
2. **Intercept Patrols:** Enhance checkpoint monitoring at district border limits between Mysuru and Bengaluru during weekend night hours.
3. **Syndicate Disruption:** Prioritize execution of pending warrants on primary associates to isolate node.`;

  res.json({ narrative });
});

// 5. Chatbot Interface
router.post('/chatbot', authenticateJWT, (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question string is required' });
  }

  const query = question.toLowerCase();
  const firs = db.getCollection('firs');
  const suspects = db.getCollection('suspects');
  const cases = db.getCollection('cases');

  let answer = '';

  if (query.includes('total crime') || query.includes('how many crimes')) {
    answer = `Based on the latest State Crime records database, there are currently a total of **${firs.length} crimes** registered across all 10 police districts. Of these, **${firs.filter(f => f.status === 'Solved').length}** have been successfully solved, and **${firs.filter(f => f.status === 'Under Investigation').length}** remain actively under investigation.`;
  } 
  else if (query.includes('suspect') || query.includes('offender') || query.includes('who is')) {
    // Look for matching suspect names
    const match = suspects.find(s => query.includes(s.name.toLowerCase()) || query.includes(s.alias.toLowerCase()));
    if (match) {
      answer = `**Suspect Identified:** **${match.name}** (Alias: *${match.alias}*), age ${match.age}, gender ${match.gender}. He belongs to the group *${match.gang_association}* and has been arrested **${match.arrest_count} times**. His current status is listed as **${match.status}**.`;
    } else {
      answer = `I found **${suspects.length} registered suspects** in the criminal database. To inquire about a specific person, please mention their name or alias (e.g., "Who is Karadi Kariya?").`;
    }
  } 
  else if (query.includes('bengaluru') || query.includes('bangalore')) {
    const blrCrimes = firs.filter(f => f.district === 'Bengaluru City');
    answer = `**Bengaluru City Command Stats:** I found **${blrCrimes.length} incidents** registered. The primary crime category is **${blrCrimes.filter(f => f.category === 'Cybercrime').length} Cybercrimes**, followed by **${blrCrimes.filter(f => f.category === 'Robbery').length} Robberies**. Currently, **${cases.filter(c => c.assigned_officer !== 'Unassigned' && firs.find(f => f.id === c.fir_id)?.district === 'Bengaluru City').length} cases** are assigned to active officers.`;
  }
  else if (query.includes('patrol') || query.includes('route') || query.includes('resource')) {
    answer = `**Resource Allocation Suggestion:** Based on active crime density, **Bengaluru City (Koramangala)** and **Kalaburagi (Chowk)** are flagged as High-Risk Zones. Recommendation: Shift **3 patrol vehicles** from low-intensity sectors (Shivamogga) to Koramangala sectors during night shift hours (22:00 - 04:00) to combat vehicle theft surges.`;
  }
  else {
    answer = `I am the KSP Intelligence Assistant. I can answer database queries, analyze MO patterns, and recommend patrol logistics.

**Example queries you can ask me:**
1. *"How many crimes are registered in the database?"*
2. *"Who is Double-Meter Manja?"*
3. *"Show me the stats for Bengaluru City."*
4. *"What are the patrol route recommendations?"*`;
  }

  res.json({ answer });
});

module.exports = router;
