import { useState, useEffect } from 'react';
import { Briefcase, UserCheck, Plus, Clock, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function CaseManagement() {
  const [cases, setCases] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Case details modal
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [diaryInput, setDiaryInput] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [casesRes, offRes] = await Promise.all([
        fetch('/api/cases', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/officers/analytics', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const casesData = await casesRes.json();
      const offData = await offRes.json();

      setCases(casesData);
      setOfficers(offData);
      
      if (casesData.length > 0 && !selectedCaseId) {
        setSelectedCaseId(casesData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, progress: newStatus === 'Closed' ? 100 : 50 })
      });
      if (!res.ok) throw new Error('Failed to update case status');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignOfficer = async (id: string, officerName: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assigned_officer: officerName })
      });
      if (!res.ok) throw new Error('Failed to assign officer');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryInput.trim() || !selectedCaseId) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/cases/${selectedCaseId}/diary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entry: diaryInput })
      });
      if (!res.ok) throw new Error('Failed to log diary entry');
      setDiaryInput('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading case management boards...</div>;
  }

  const activeCases = cases.filter(c => c.status === 'Active');
  const closedCases = cases.filter(c => c.status === 'Closed');
  
  const selectedCase = cases.find(c => c.id === selectedCaseId);

  const role = localStorage.getItem('role') || 'Guest';
  const isGuest = role === 'Guest Demo Mode';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>INVESTIGATION CASE MANAGER</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Officer assignments, progress trackers, evidence chains, and interactive diaries.</p>
      </div>

      {/* Kanban + Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
        {/* Kanban Board */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Active Columns */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '520px', background: 'rgba(30,41,59,0.1)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-amber)', borderBottom: '2px solid var(--accent-amber)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>ACTIVE INVESTIGATIONS</span>
              <span>{activeCases.length}</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '460px', paddingRight: '4px' }}>
              {activeCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  style={{
                    background: selectedCaseId === c.id ? 'rgba(6,182,212,0.1)' : 'rgba(30,41,59,0.3)',
                    border: `1px solid ${selectedCaseId === c.id ? 'var(--accent-cyan)' : 'var(--panel-border)'}`,
                    borderRadius: '8px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{c.fir_number}</strong>
                    <span className={`badge-status ${c.severity.toLowerCase()}`} style={{ scale: '0.8' }}>{c.severity}</span>
                  </div>
                  <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>{c.category} ({c.district})</strong>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '10px', color: 'var(--text-secondary)' }}>
                    <span>Officer: <strong>{c.assigned_officer}</strong></span>
                    {!isGuest && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(c.id, 'Closed');
                        }}
                        className="btn-glass"
                        style={{ padding: '2px 6px', fontSize: '0.7rem', borderColor: 'var(--accent-emerald)', color: 'var(--accent-emerald)' }}
                      >
                        Close Case
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Closed Columns */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '520px', background: 'rgba(30,41,59,0.1)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-emerald)', borderBottom: '2px solid var(--accent-emerald)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>RESOLVED CASES</span>
              <span>{closedCases.length}</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '460px', paddingRight: '4px' }}>
              {closedCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  style={{
                    background: selectedCaseId === c.id ? 'rgba(6,182,212,0.1)' : 'rgba(30,41,59,0.3)',
                    border: `1px solid ${selectedCaseId === c.id ? 'var(--accent-cyan)' : 'var(--panel-border)'}`,
                    borderRadius: '8px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>{c.fir_number}</strong>
                    <span className="badge-status low" style={{ scale: '0.8' }}>Closed</span>
                  </div>
                  <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>{c.category} ({c.district})</strong>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '10px', color: 'var(--text-secondary)' }}>
                    <span>Officer: <strong>{c.assigned_officer}</strong></span>
                    {!isGuest && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(c.id, 'Active');
                        }}
                        className="btn-glass"
                        style={{ padding: '2px 6px', fontSize: '0.7rem', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}
                      >
                        Reopen Case
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Case Diary/Details Panel */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}><Briefcase size={18} /> INVESTIGATION LOGS</h3>
          
          {selectedCase ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{selectedCase.fir_number}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Location: {selectedCase.district} ({selectedCase.category})</span>
              </div>

              {/* Progress Index */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span>Investigation Progress</span>
                  <strong>{selectedCase.progress}%</strong>
                </div>
                <div style={{ height: '6px', background: 'rgba(30,41,59,0.5)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${selectedCase.progress}%`, background: 'var(--accent-cyan)' }}></div>
                </div>
              </div>

              {/* Officer Assign dropdown */}
              {!isGuest && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}><UserCheck size={12} /> Assign Investigator:</span>
                  <select
                    className="input-cyber"
                    style={{ padding: '6px 10px' }}
                    value={selectedCase.assigned_officer}
                    onChange={(e) => handleAssignOfficer(selectedCase.id, e.target.value)}
                  >
                    <option value="Unassigned">Unassigned</option>
                    {officers.map(off => (
                      <option key={off.id} value={off.name}>{off.name} ({off.rank})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Case Diary Timelines */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--panel-border)', paddingBottom: '4px' }}><Clock size={12} /> CASE DIARY ENTRIES</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {selectedCase.diary && selectedCase.diary.map((d: any, idx: number) => (
                    <div key={idx} style={{ background: 'rgba(7,11,19,0.3)', padding: '8px', borderLeft: '2px solid var(--accent-cyan)', borderRadius: '0 4px 4px 0', fontSize: '0.75rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: '2px' }}>
                        {new Date(d.date).toLocaleDateString()} {new Date(d.date).toLocaleTimeString()}
                      </span>
                      <p style={{ color: '#fff' }}>{d.entry}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add log form */}
              {!isGuest && (
                <form onSubmit={handleAddDiary} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                  <textarea
                    className="input-cyber"
                    rows={2}
                    placeholder="Log crime investigation progress mahazar..."
                    value={diaryInput}
                    onChange={(e) => setDiaryInput(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn-glass-primary" style={{ padding: '6px', fontSize: '0.8rem', justifyContent: 'center' }}>
                    Append Case Log
                  </button>
                </form>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Choose an investigation docket from the kanban board to review diaries, progress meters, and officer logs.</p>
          )}
        </div>
      </div>
    </div>
  );
}
