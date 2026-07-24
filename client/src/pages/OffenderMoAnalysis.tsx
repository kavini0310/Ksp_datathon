import { useState, useEffect } from 'react';
import { User, Cpu, ShieldAlert, Layers, MapPin, Calendar, Zap, AlertTriangle } from 'lucide-react';

export default function OffenderMoAnalysis() {
  const [suspects, setSuspects] = useState<any[]>([]);
  const [selectedSuspectId, setSelectedSuspectId] = useState('');
  const [suspectDetail, setSuspectDetail] = useState<any>(null);
  
  const [moClusters, setMoClusters] = useState<any[]>([]);
  const [narrative, setNarrative] = useState('');
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [suspRes, moRes] = await Promise.all([
        fetch('/api/crimes/suspects', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/ai/mo-clusters', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const sList = await suspRes.json();
      const moData = await moRes.json();

      setSuspects(sList);
      setMoClusters(moData);
      
      if (sList.length > 0) {
        setSelectedSuspectId(sList[0].id);
        setSuspectDetail(sList[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch AI Narrative on Suspect Selection
  const fetchNarrative = async (id: string) => {
    setLoadingNarrative(true);
    setNarrative('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ai/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ suspectId: id })
      });
      const data = await res.json();
      setNarrative(data.narrative);
    } catch (err) {
      console.error(err);
      setNarrative('Error generating intelligence briefing.');
    } finally {
      setLoadingNarrative(false);
    }
  };

  useEffect(() => {
    if (selectedSuspectId) {
      const s = suspects.find(item => item.id === selectedSuspectId);
      setSuspectDetail(s);
      fetchNarrative(selectedSuspectId);
    }
  }, [selectedSuspectId, suspects]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Analyzing recidivism ledger...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>RECIDIVISM & MODUS OPERANDI (MO)</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Profiling repeat offenders, calculating risk weights, and clustering matching modus operandi clusters.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Column: Offender profiles & AI narrative */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} /> OFFENDER LEDGER MONITOR
            </h3>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Offender:</span>
              <select className="input-cyber" style={{ flex: 1 }} value={selectedSuspectId} onChange={(e) => setSelectedSuspectId(e.target.value)}>
                {suspects.map(s => <option key={s.id} value={s.id}>{s.name} (Alias: "{s.alias}")</option>)}
              </select>
            </div>

            {suspectDetail && (
              <div style={{ display: 'flex', gap: '20px', background: 'rgba(30,41,59,0.2)', padding: '16px', border: '1px solid var(--panel-border)', borderRadius: '8px', marginTop: '10px' }}>
                <img src={suspectDetail.mugshot} alt={suspectDetail.name} style={{ width: '80px', height: '80px', borderRadius: '6px', background: 'rgba(30,41,59,0.4)', border: '1px solid var(--panel-border)' }} />
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Full Name</span>
                    <strong>{suspectDetail.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Alias Moniker</span>
                    <strong style={{ color: 'var(--accent-amber)' }}>"{suspectDetail.alias}"</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Arrests Registered</span>
                    <strong>{suspectDetail.arrest_count} priors</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Custody Status</span>
                    <span style={{ color: suspectDetail.status === 'In Custody' ? 'var(--accent-emerald)' : 'var(--accent-ruby)', fontWeight: 700 }}>
                      {suspectDetail.status}
                    </span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Gang Association</span>
                    <strong>{suspectDetail.gang_association}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI narrative output */}
          <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} /> AI-GENERATED INTELLIGENCE BRIEFING
            </h3>
            {loadingNarrative ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                RUNNING RECIDIVISM MATRIX PROFILES AND GENERATING STORY Timelines...
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '350px', background: 'rgba(7,11,19,0.4)', padding: '16px', borderRadius: '6px', border: '1px solid var(--panel-border)', fontSize: '0.85rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
                {narrative}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: MO Clusters (Jaccard similarity) */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '720px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} /> MO PATTERN CLUSTERS (JACCARD SIMILARITY)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Algorithms group crime files based on matching entry methods, timings, weapon preferences, and getaway vehicle models (threshold similarity &ge; 0.65).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {moClusters.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No MO pattern clusters established in working set.</div>
            ) : (
              moClusters.map((cluster) => (
                <div key={cluster.id} style={{ border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '16px', background: 'rgba(30,41,59,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>{cluster.category} Pattern</strong>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(6,182,212,0.1)', border: '1px solid var(--accent-cyan)', borderRadius: '12px', padding: '2px 8px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      {cluster.size} Linked Dockets
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <strong>MO Focus:</strong> {cluster.primaryMo}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.75rem', marginBottom: '10px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Weapons Checked:</span>{' '}
                      <strong>{cluster.weaponsUsed.join(', ') || 'None'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Vehicles Checked:</span>{' '}
                      <strong>{cluster.vehiclesSeen.join(', ') || 'None'}</strong>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', fontWeight: 600, display: 'block', borderTop: '1px dashed var(--panel-border)', paddingTop: '6px' }}>
                    PATROL WARNING: Serial activity detected. Watch for repeated Modus Operandi parameters.
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
