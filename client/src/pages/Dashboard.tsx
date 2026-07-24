import { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, AreaChart, Area } from 'recharts';
import { Shield, TrendingUp, AlertTriangle, Users, MapPin, Eye, Bell, Activity } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [temporal, setTemporal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sumRes, trendRes, tempRes] = await Promise.all([
          fetch('/api/analytics/summary', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          fetch('/api/analytics/trend', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          fetch('/api/analytics/temporal', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        ]);

        const summary = await sumRes.json();
        const trendData = await trendRes.json();
        const temp = await tempRes.json();

        setData(summary);
        setTrends(trendData);
        setTemporal(temp);
      } catch (err) {
        console.error('Error fetching dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: '20px' }}>
        <div style={{ width: '50px', height: '50px', border: '5px solid rgba(6,182,212,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>INITIALIZING COMMAND CENTER CORE SYSTEMS...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Crimes', value: data.kpis.totalCrimes, icon: Shield, color: 'var(--accent-cyan)', percent: '+4.2%' },
    { label: 'Today\'s Dispatch', value: data.kpis.todayCrimes, icon: AlertTriangle, color: 'var(--accent-ruby)', percent: '+1.5%' },
    { label: 'Active Investigations', value: data.kpis.activeInvestigations, icon: Activity, color: 'var(--accent-blue)', percent: '-2.1%' },
    { label: 'Repeat Offenders', value: data.kpis.repeatOffenders, icon: Users, color: 'var(--accent-amber)', percent: '+8.3%' },
    { label: 'Crime Index Rating', value: data.kpis.crimeHeatIndex, icon: TrendingUp, color: 'var(--accent-emerald)', percent: 'Optimal' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>COMMAND CENTER DASHBOARD</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Real-time spatial crime records, threat indicators, and dispatch telemetry.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', background: 'rgba(6,182,212,0.06)', border: '1px solid var(--panel-border)', padding: '6px 12px', borderRadius: '20px' }}>
          <span className="pulse-cyan" style={{ width: '8px', height: '8px' }}></span> SYSTEM FEED LIVE
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{kpi.label}</span>
                <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px', color: kpi.color }}>{kpi.value}</span>
                <span style={{ fontSize: '0.7rem', color: kpi.percent.startsWith('+') ? 'var(--accent-ruby)' : 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                  {kpi.percent} vs previous month
                </span>
              </div>
              <div style={{ padding: '8px', borderRadius: '8px', background: `rgba(30, 41, 59, 0.4)`, border: '1px solid var(--panel-border)' }}>
                <Icon style={{ color: kpi.color, width: '20px', height: '20px' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts and Feeds */}
      <div className="dashboard-grid">
        {/* Main Trend Line Chart */}
        <div className="glass-panel col-8" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.5px' }}>CRIME INCIDENCE PATTERN (MONTHLY)</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>LINE TREND REGRESSION</span>
          </div>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="99%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--panel-border)', borderRadius: '6px', color: '#fff' }} />
                <Line type="monotone" dataKey="total" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Cybercrime" stroke="var(--accent-blue)" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="Murder" stroke="var(--accent-ruby)" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="Robbery" stroke="var(--accent-amber)" strokeWidth={1} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Bar Chart */}
        <div className="glass-panel col-4" style={{ minHeight: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.5px' }}>DISTRIBUTION BY CRIME CATEGORY</h3>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={data.topCategories} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={10} width={100} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--panel-border)', borderRadius: '6px' }} />
                <Bar dataKey="count" fill="var(--accent-cyan)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Alerts Stream */}
        <div className="glass-panel col-5" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} style={{ color: 'var(--accent-ruby)' }} /> CRITICAL DISPATCH BULLETIN
            </h3>
            <span style={{ fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-ruby)', color: 'var(--accent-ruby)', padding: '2px 8px', borderRadius: '12px', fontFamily: 'var(--font-mono)' }}>SYSTEM ALERT</span>
          </div>

          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, maxHeight: '320px', paddingRight: '4px' }}>
            {data.recentAlerts.map((alert: any) => (
              <div key={alert.id} className="alert-ticker">
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="pulse-glow" style={{ flexShrink: 0 }}></div>
                  <span style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>{alert.message}</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(alert.time).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Latest FIR Registry */}
        <div className="glass-panel col-7" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>RECENT CRIME INCIDENT REPORTS (FIR)</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>LATEST SEEDS</span>
          </div>

          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table className="table-cyber">
              <thead>
                <tr>
                  <th>FIR Number</th>
                  <th>Category</th>
                  <th>District</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.latestFirs.map((fir: any) => (
                  <tr key={fir.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>{fir.fir_number}</td>
                    <td>{fir.category}</td>
                    <td>{fir.district}</td>
                    <td>
                      <span className={`badge-status ${fir.severity.toLowerCase()}`}>{fir.severity}</span>
                    </td>
                    <td style={{ color: fir.status === 'Solved' ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontSize: '0.85rem' }}>{fir.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
