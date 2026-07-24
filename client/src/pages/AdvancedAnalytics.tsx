import { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Legend, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { Activity, Thermometer, Info, ArrowUpRight } from 'lucide-react';

export default function AdvancedAnalytics() {
  const [firs, setFirs] = useState<any[]>([]);
  const [socio, setSocio] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [temporal, setTemporal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('token');
        const [firsRes, socioRes, anomRes, tempRes] = await Promise.all([
          fetch('/api/crimes/firs', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/analytics/socioeconomic', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/analytics/anomalies', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/analytics/temporal', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const fList = await firsRes.json();
        const sMatrix = await socioRes.json();
        const aList = await anomRes.json();
        const tObj = await tempRes.json();

        setFirs(fList);
        setSocio(sMatrix);
        setAnomalies(aList);
        setTemporal(tObj);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading || !firs.length) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading analytics panel...</div>;
  }

  // Filter logic
  const filteredFirs = firs.filter(f => {
    if (selectedDistrict !== 'All' && f.district !== selectedDistrict) return false;
    if (selectedCategory !== 'All' && f.category !== selectedCategory) return false;
    if (selectedSeverity !== 'All' && f.severity !== selectedSeverity) return false;
    return true;
  });

  // Calculate stats based on filtered selection
  // 1. Group by District for Status stacked bar
  const distGroup: { [key: string]: { district: string; Solved: number; Pending: number } } = {};
  filteredFirs.forEach(f => {
    if (!distGroup[f.district]) {
      distGroup[f.district] = { district: f.district, Solved: 0, Pending: 0 };
    }
    if (f.status === 'Solved') {
      distGroup[f.district].Solved++;
    } else {
      distGroup[f.district].Pending++;
    }
  });
  const distBarData = Object.values(distGroup);

  // 2. Category Pie
  const catGroup: { [key: string]: number } = {};
  filteredFirs.forEach(f => {
    catGroup[f.category] = (catGroup[f.category] || 0) + 1;
  });
  const catPieData = Object.keys(catGroup).map(name => ({ name, value: catGroup[name] }));
  const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#a855f7', '#64748b'];

  // 3. Hourly Clock area (derived from filtered set)
  const hourlyCounts = Array(24).fill(0);
  filteredFirs.forEach(f => {
    const h = new Date(f.incident_time).getHours();
    hourlyCounts[h]++;
  });
  const hourlyData = hourlyCounts.map((count, hour) => ({ hour: `${hour}:00`, count }));

  // Get unique filters
  const districts = ['All', ...new Set(firs.map(f => f.district))];
  const categories = ['All', ...new Set(firs.map(f => f.category))];
  const severities = ['All', 'Low', 'Medium', 'High', 'Critical'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>ADVANCED ANALYTICS COMMAND</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Comprehensive correlation engines, temporal crime clock distributions, and anomalies warning decks.</p>
      </div>

      {/* Dynamic Filters Deck */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>District Limits:</span>
          <select className="input-cyber" style={{ width: '180px', padding: '6px 10px' }} value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Category:</span>
          <select className="input-cyber" style={{ width: '180px', padding: '6px 10px' }} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Severity Index:</span>
          <select className="input-cyber" style={{ width: '150px', padding: '6px 10px' }} value={selectedSeverity} onChange={(e) => setSelectedSeverity(e.target.value)}>
            {severities.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
          MATCHED DOCKETS: {filteredFirs.length}
        </span>
      </div>

      {/* Warning/Anomalies Box */}
      {anomalies.length > 0 && (
        <div className="glass-panel" style={{ borderColor: 'var(--accent-ruby)', background: 'rgba(239,68,68,0.03)', padding: '16px' }}>
          <h4 style={{ color: 'var(--accent-ruby)', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Thermometer size={18} /> Z-SCORE ANOMALOUS SPIKE DETECTOR
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {anomalies.map((anom, idx) => (
              <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', color: '#fff', borderBottom: '1px dashed rgba(239,68,68,0.15)', paddingBottom: '4px' }}>
                <span>{anom.message}</span>
                <strong style={{ color: 'var(--accent-ruby)', fontFamily: 'var(--font-mono)' }}>Z-Score: +{anom.zScore}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid of Charts */}
      <div className="dashboard-grid">
        {/* District Status Stacked Bar */}
        <div className="glass-panel col-6" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>DISTRICT RESOLUTION METRICS</h3>
          <div style={{ flex: 1, minHeight: '260px' }}>
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={distBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="district" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--panel-border)', borderRadius: '6px' }} />
                <Legend verticalAlign="top" height={36} iconSize={10} style={{ fontSize: '0.8rem' }} />
                <Bar dataKey="Solved" stackId="a" fill="var(--accent-emerald)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Pending" stackId="a" fill="var(--accent-amber)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Crime Clock Area Chart */}
        <div className="glass-panel col-6" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>24-HOUR CRIME CLOCK (TEMPORAL)</h3>
          <div style={{ flex: 1, minHeight: '260px' }}>
            <ResponsiveContainer width="99%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--panel-border)', borderRadius: '6px' }} />
                <defs>
                  <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="count" stroke="var(--accent-cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorHour)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Category Chart */}
        <div className="glass-panel col-4" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>CRIME VOLUME PIE</h3>
          <div style={{ flex: 1, minHeight: '260px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="99%" height="100%">
              <PieChart>
                <Pie data={catPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value">
                  {catPieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--panel-border)', borderRadius: '6px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Socioeconomic Correlation Matrix Grid */}
        <div className="glass-panel col-8" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>SOCIOECONOMIC CORRELATION MATRIX</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Info size={12} /> Pearson Coefficient (r)</span>
          </div>

          {socio && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                <thead>
                  <tr style={{ background: 'rgba(30,41,59,0.3)', borderBottom: '1px solid var(--panel-border)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-secondary)' }}>Indicator</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Crime Rate</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Density</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Literacy</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Poverty</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Unemployed</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(socio.correlationMatrix).map((rowKey) => {
                    const row = socio.correlationMatrix[rowKey];
                    const labelMap: { [key: string]: string } = {
                      crimeRate: 'Crime Incidence Rate',
                      density: 'Population Density',
                      literacy: 'Literacy Index',
                      poverty: 'Poverty Rate',
                      unemployment: 'Unemployment Index'
                    };
                    return (
                      <tr key={rowKey} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.15)' }}>
                        <td style={{ padding: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>{labelMap[rowKey]}</td>
                        {['crimeRate', 'density', 'literacy', 'poverty', 'unemployment'].map((colKey) => {
                          const val = parseFloat(row[colKey]);
                          // Compute coloring based on value (positive = green/cyan, negative = red)
                          let bg = 'transparent';
                          let text = '#fff';
                          if (val > 0.4) { bg = 'rgba(6,182,212,0.25)'; text = '#06b6d4'; }
                          else if (val < -0.4) { bg = 'rgba(239,68,68,0.2)'; text = '#fca5a5'; }
                          return (
                            <td key={colKey} style={{ padding: '8px', textAlign: 'center', background: bg, color: text, borderRadius: '4px', fontWeight: Math.abs(val) > 0.6 ? 700 : 400 }}>
                              {val.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '10px' }}>
                <strong>Interpretation:</strong> A positive correlation (+0.70) between <em>Crime Rate</em> and <em>Density/Unemployment</em> indicates higher incident rates in densely built environments. Negative correlation with <em>Literacy</em> emphasizes preventive impact of educational demographics.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
