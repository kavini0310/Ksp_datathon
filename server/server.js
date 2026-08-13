const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const db = require('./db');

const { router: authRouter, authenticateJWT, requireRole } = require('./routes/auth');
const crimesRouter = require('./routes/crimes');
const analyticsRouter = require('./routes/analytics');
const gisRouter = require('./routes/gis');
const graphRouter = require('./routes/graph');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 5000;

// Enable CORS and parsers
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Connect Modular API Routes
app.use('/api/auth', authRouter);
app.use('/api/crimes', crimesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/gis', gisRouter);
app.use('/api/graph', graphRouter);
app.use('/api/ai', aiRouter);

// 1. Cases endpoints (Case Management)
app.get('/api/cases', authenticateJWT, (req, res) => {
  const cases = db.getCollection('cases');
  const firs = db.getCollection('firs');

  // Enrich cases with category, district, severity from FIRs
  const enriched = cases.map(c => {
    const fir = firs.find(f => f.id === c.fir_id);
    return {
      ...c,
      category: fir ? fir.category : 'N/A',
      district: fir ? fir.district : 'N/A',
      severity: fir ? fir.severity : 'N/A',
      fir_number: fir ? fir.fir_number : 'N/A'
    };
  });

  res.json(enriched);
});

app.put('/api/cases/:id', authenticateJWT, requireRole(['Administrator', 'SCRB Officer', 'District Officer', 'Police Station Officer']), (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const updated = db.update('cases', id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Case file not found' });
  }

  // If status is closed, auto-update the linked FIR status to Solved
  if (updates.status === 'Closed') {
    db.update('firs', updated.fir_id, { status: 'Solved' });
  }

  db.logAction(req.user.username, req.user.role, 'UPDATE_CASE', req.ip, `Updated case progress or details for case ID: ${id}`);
  res.json(updated);
});

// Append Case Diary entries
app.post('/api/cases/:id/diary', authenticateJWT, requireRole(['Administrator', 'SCRB Officer', 'District Officer', 'Police Station Officer']), (req, res) => {
  const { id } = req.params;
  const { entry } = req.body;

  if (!entry) {
    return res.status(400).json({ error: 'Diary log content is required' });
  }

  const caseFile = db.findOne('cases', c => c.id === id);
  if (!caseFile) {
    return res.status(404).json({ error: 'Case file not found' });
  }

  const updatedDiary = [...(caseFile.diary || [])];
  updatedDiary.push({
    date: new Date().toISOString(),
    entry: entry
  });

  const updated = db.update('cases', id, { diary: updatedDiary });
  db.logAction(req.user.username, req.user.role, 'ADD_CASE_DIARY', req.ip, `Appended new log to case diary for case ID: ${id}`);
  res.json(updated);
});

// 2. Officer performance metrics
app.get('/api/officers/analytics', authenticateJWT, (req, res) => {
  const cases = db.getCollection('cases');
  
  const officers = [
    { name: 'Kumar Swamy', rank: 'Inspector', district: 'Bengaluru City' },
    { name: 'Mohan Rao', rank: 'Inspector', district: 'Mysuru' },
    { name: 'Satish Kumar', rank: 'Sub-Inspector', district: 'Belagavi' },
    { name: 'Girish Gowda', rank: 'Inspector', district: 'Hubballi-Dharwad' },
    { name: 'Archana Patil', rank: 'Sub-Inspector', district: 'Mangaluru' },
    { name: 'Venkatesh Murthy', rank: 'Inspector', district: 'Kolar' }
  ];

  const metrics = officers.map((off, idx) => {
    const assigned = cases.filter(c => c.assigned_officer === off.name);
    const solved = assigned.filter(c => c.status === 'Closed').length;
    const pending = assigned.filter(c => c.status === 'Active').length;
    
    // Calculate simulated rating
    let rating = 4.2;
    if (solved > 0) {
      rating = Math.min(5.0, 4.0 + (solved / assigned.length) * 1.0);
    }
    
    // Average investigation time
    const avgTime = Math.floor(Math.random() * 20) + 10; // days

    return {
      id: `off_${idx + 1}`,
      name: off.name,
      rank: off.rank,
      district: off.district,
      assigned: assigned.length,
      solved,
      pending,
      avgInvestigationTimeDays: avgTime,
      performanceRating: rating.toFixed(1)
    };
  });

  res.json(metrics);
});

// 3. Admin-only Audit Logs
app.get('/api/admin/audit-logs', authenticateJWT, requireRole(['Administrator']), (req, res) => {
  res.json(db.getCollection('audit_logs'));
});

// Serve frontend build static files in production
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`KSP platform server running on port http://localhost:${PORT}`);
});
