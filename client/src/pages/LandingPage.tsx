import React, { useState } from 'react';
import { Shield, Lock, User, Terminal, HelpCircle, Eye, EyeOff } from 'lucide-react';

interface LandingPageProps {
  onLogin: (token: string, user: any) => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const userToSubmit = customUser || username;
    const passToSubmit = customPass || password;

    if (!userToSubmit || !passToSubmit) {
      setError('Please provide all credentials.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userToSubmit, password: passToSubmit }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  const demoRoles = [
    { label: 'Administrator', user: 'admin', pass: 'admin123', desc: 'Full System Control & Audit Logs' },
    { label: 'SCRB Officer', user: 'scrb', pass: 'scrb123', desc: 'State-wide Crime Analysis & Imports' },
    { label: 'District Officer', user: 'district_blr', pass: 'blr123', desc: 'Bengaluru District Commander View' },
    { label: 'Station Officer', user: 'station_kor', pass: 'kor123', desc: 'Koramangala Precinct Supervisor' },
    { label: 'Crime Analyst', user: 'analyst', pass: 'analyst123', desc: 'Network Graphs & Forecaster Access' },
    { label: 'Guest Evaluator', user: 'guest', pass: 'guest123', desc: 'Interactive View-only Walkthrough' }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top Banner */}
      <header style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--panel-border)',
        background: 'rgba(7, 11, 19, 0.8)',
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield style={{ color: 'var(--accent-cyan)', width: '32px', height: '32px' }} />
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '1px' }}>KSP CRIME INTEL</h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '2px', fontFamily: 'var(--font-mono)' }}>GOVERNMENT OF KARNATAKA</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(6,182,212,0.1)', border: '1px solid var(--accent-cyan)', borderRadius: '20px', color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span className="pulse-cyan" style={{ width: '6px', height: '6px' }}></span> SECURE OPS PORTAL
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        padding: '40px',
        maxWidth: '1400px',
        margin: '0 auto',
        alignItems: 'center'
      }}>
        {/* Left Side: Pitch and Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1, background: 'linear-gradient(135deg, #ffffff, var(--accent-cyan), var(--accent-blue))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Predictive Policing & Crime Spatial Intelligence
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.6' }}>
            Transforming raw data into operational edge. The official intelligence gateway for Karnataka State Police (KSP) and the State Crime Records Bureau (SCRB).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
            <div className="glass-panel" style={{ padding: '16px' }}>
              <h3 style={{ color: 'var(--accent-cyan)', fontSize: '1.8rem', fontWeight: 800 }}>520+</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Relational Crimes Logged</p>
            </div>
            <div className="glass-panel" style={{ padding: '16px' }}>
              <h3 style={{ color: 'var(--accent-emerald)', fontSize: '1.8rem', fontWeight: 800 }}>10</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Active Police Districts</p>
            </div>
            <div className="glass-panel" style={{ padding: '16px' }}>
              <h3 style={{ color: 'var(--accent-amber)', fontSize: '1.8rem', fontWeight: 800 }}>0.85+</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>PageRank Centrality Scale</p>
            </div>
            <div className="glass-panel" style={{ padding: '16px' }}>
              <h3 style={{ color: 'var(--accent-blue)', fontSize: '1.8rem', fontWeight: 800 }}>AI</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Predictive policing forecast active</p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel glow-border" style={{ padding: '30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Terminal style={{ color: 'var(--accent-cyan)', width: '40px', height: '40px', margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>AUTHORIZED LOGIN</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>RESTRICTED ACCESS INTERNAL GATEWAY</p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '12px', top: '12px', width: '18px', height: '18px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Officer Username"
                  className="input-cyber"
                  style={{ paddingLeft: '40px' }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '12px', top: '12px', width: '18px', height: '18px', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Security Password"
                  className="input-cyber"
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-ruby)', color: '#fca5a5', padding: '10px', borderRadius: '6px', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-glass-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'AUTHENTICATING ENCRYPTED SHELL...' : 'ESTABLISH SECURE LINK'}
              </button>
            </form>
          </div>

          {/* Judge Demo Quick Login Card */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={16} /> JUDGE DEMO MODE PORTAL
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {demoRoles.map((role) => (
                <button
                  key={role.label}
                  onClick={(e) => handleLogin(e, role.user, role.pass)}
                  className="btn-glass"
                  style={{
                    fontSize: '0.8rem',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '8px 12px',
                    background: 'rgba(30, 41, 59, 0.3)'
                  }}
                >
                  <strong style={{ color: 'var(--accent-cyan)' }}>{role.label}</strong>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{role.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        padding: '20px 40px',
        textAlign: 'center',
        borderTop: '1px solid var(--panel-border)',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        background: 'rgba(7, 11, 19, 0.9)'
      }}>
        © 2026 State Crime Records Bureau (SCRB), Karnataka State Police. Classified Information System.
      </footer>
    </div>
  );
}
