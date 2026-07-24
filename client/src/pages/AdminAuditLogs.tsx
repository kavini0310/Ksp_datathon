import { useState, useEffect } from 'react';
import { ShieldCheck, Database, KeyRound, Terminal } from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 403) {
        setError('ACCESS DENIED: Role unauthorized for audit logging registry.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load audit logging records');
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('role') || 'Guest';
    setUserRole(role);
    if (role === 'Administrator') {
      fetchAuditLogs();
    } else {
      setLoading(false);
      setError('ACCESS DENIED: Role unauthorized for audit logging registry.');
    }
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading audit registries...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>SECURITY COMPLIANCE AUDIT LOG</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Comprehensive ledger recording authenticated sessions, database mutations, and administrative tasks.</p>
      </div>

      {error ? (
        <div className="glass-panel" style={{ borderColor: 'var(--accent-ruby)', background: 'rgba(239,68,68,0.03)', padding: '30px', textAlign: 'center' }}>
          <ShieldCheck style={{ width: '50px', height: '50px', color: 'var(--accent-ruby)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fca5a5', marginBottom: '8px' }}>ADMINISTRATIVE PRIVILEGES REQUIRED</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto' }}>
            Your account role (<strong>{userRole}</strong>) is restricted. Only officers with active **Administrator** credentials can retrieve cryptographic compliance ledgers.
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} style={{ color: 'var(--accent-emerald)' }} /> SECURITY MUTATION EVENTS
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>LOGGED ENTRIES: {logs.length}</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table-cyber" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'rgba(30,41,59,0.3)', borderBottom: '1px solid var(--panel-border)' }}>
                  <th>Timestamp</th>
                  <th>Operator</th>
                  <th>Credentials Role</th>
                  <th>Action Code</th>
                  <th>Client IP</th>
                  <th>Mutation Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(51,65,85,0.1)' }}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                    <td><strong>{log.username}</strong></td>
                    <td>{log.role}</td>
                    <td>
                      <span style={{
                        background: 'rgba(16,185,129,0.1)',
                        color: 'var(--accent-emerald)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(16,185,129,0.2)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{log.ip}</td>
                    <td style={{ color: '#fff' }}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
