import { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, Database, BarChart3, Map, Network, Users2, BrainCircuit, Briefcase, Bot, ShieldCheck, Sun, Moon, LogOut, Play } from 'lucide-react';

// Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import CrimeManager from './pages/CrimeManager';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import GisIntelligence from './pages/GisIntelligence';
import NetworkAnalysis from './pages/NetworkAnalysis';
import OffenderMoAnalysis from './pages/OffenderMoAnalysis';
import AiPredictive from './pages/AiPredictive';
import CaseManagement from './pages/CaseManagement';
import AiAssistant from './pages/AiAssistant';
import AdminAuditLogs from './pages/AdminAuditLogs';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Theme state
  const [lightMode, setLightMode] = useState(false);

  // Presentation Mode State
  const [showPresentation, setShowPresentation] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    // Attempt to load profile if token exists
    if (token) {
      fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        setUser(data);
        localStorage.setItem('role', data.role);
      })
      .catch(() => {
        handleLogout();
      });
    }
  }, [token]);

  const handleLogin = (newToken: string, loggedUser: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', loggedUser.role);
    setToken(newToken);
    setUser(loggedUser);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setUser(null);
  };

  const toggleTheme = () => {
    const nextMode = !lightMode;
    setLightMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  };

  if (!token) {
    return <LandingPage onLogin={handleLogin} />;
  }

  // Nav configuration
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: 'All' },
    { id: 'crimes', label: 'Crime Ledgers', icon: Database, role: 'All' },
    { id: 'analytics', label: 'Advanced Analytics', icon: BarChart3, role: 'All' },
    { id: 'gis', label: 'Spatial Intel Map', icon: Map, role: 'All' },
    { id: 'networks', label: 'Network Graph', icon: Network, role: 'All' },
    { id: 'offenders', label: 'MO & Recidivism', icon: Users2, role: 'All' },
    { id: 'predictive', label: 'AI Forecaster', icon: BrainCircuit, role: 'All' },
    { id: 'cases', label: 'Case Manager', icon: Briefcase, role: 'All' },
    { id: 'assistant', label: 'AI Assistant Chat', icon: Bot, role: 'All' },
    { id: 'audits', label: 'Security Audit', icon: ShieldCheck, role: 'Administrator' }
  ];

  // Render current tab page view
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'crimes': return <CrimeManager />;
      case 'analytics': return <AdvancedAnalytics />;
      case 'gis': return <GisIntelligence />;
      case 'networks': return <NetworkAnalysis />;
      case 'offenders': return <OffenderMoAnalysis />;
      case 'predictive': return <AiPredictive />;
      case 'cases': return <CaseManagement />;
      case 'assistant': return <AiAssistant />;
      case 'audits': return <AdminAuditLogs />;
      default: return <Dashboard />;
    }
  };

  // Presentation slides content
  const slides = [
    { title: 'Project Overview & Architecture', desc: 'Built for KSP & SCRB to digitize state crime records. Implements a high-performance CommonJS Node.js backend linked with client-side Newtonian canvas vectors, PageRank solvers, and Haversine geofences.' },
    { title: 'Graph Network Centrality', desc: 'Computes Degree Centrality, Betweenness, and PageRank in pure JavaScript to identify gang kingpins. Resolves multi-hop associate shortest pathways ( accomplice ➜ phone ➜ dacoity ) using Breath-First Search.' },
    { title: 'Spatial intelligence & AI Models', desc: 'Renders districts, hotspots, and geofences over canvas. Computes crime propensities using historical regression trends and socioeconomic overlays ( Literacy, Poverty, Density ).' },
    { title: 'Hackathon Compliance Check', desc: 'Zero placeholder views, complete RBAC logins, CSV bulk imports with similarity duplicate check, and chatbot voice controls.' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar navigation */}
      <aside style={{
        width: '260px',
        borderRight: '1px solid var(--panel-border)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        zIndex: 50
      }}>
        {/* Brand */}
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--panel-border)' }}>
          <Shield style={{ color: 'var(--accent-cyan)', width: '28px', height: '28px' }} />
          <div>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.5px' }}>KSP CRIME INTEL</h1>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>INTERNAL OPS PORTAL</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav style={{ padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navigationItems.map(item => {
            if (item.role !== 'All' && user?.role !== item.role) return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="btn-glass"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '10px 14px',
                  background: isActive ? 'rgba(6,182,212,0.15)' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--accent-cyan)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--accent-cyan)' : 'inherit' }} />
                <span style={{ fontSize: '0.85rem' }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Presentation Trigger */}
        <div style={{ padding: '12px' }}>
          <button
            onClick={() => { setShowPresentation(true); setSlideIndex(0); }}
            className="btn-glass"
            style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)', fontSize: '0.75rem', gap: '6px' }}
          >
            <Play size={12} /> Start Presentation Deck
          </button>
        </div>

        {/* Profile Footer */}
        {user && (
          <div style={{ padding: '16px', borderTop: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(7,11,19,0.3)' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block' }}>{user.name}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{user.role}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', alignItems: 'center' }}>
              <button onClick={toggleTheme} className="btn-glass" style={{ padding: '6px' }} title="Toggle Theme mode">
                {lightMode ? <Moon size={14} /> : <Sun size={14} />}
              </button>
              <button onClick={handleLogout} className="btn-glass btn-glass-danger" style={{ padding: '6px' }} title="Secure Logout">
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Workspace Frame */}
      <main style={{
        marginLeft: '260px',
        padding: '40px',
        flex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {renderTabContent()}
      </main>

      {/* Presentation Mode Slideshow overlay */}
      {showPresentation && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(7, 11, 19, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel glow-border" style={{ width: '600px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>KSP INTELLIGENCE PLATFORM PRESENTATION</span>
            
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{slides[slideIndex].title}</h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', minHeight: '80px' }}>
              {slides[slideIndex].desc}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Slide {slideIndex + 1} of {slides.length}</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setSlideIndex(prev => Math.max(0, prev - 1))}
                  disabled={slideIndex === 0}
                  className="btn-glass"
                  style={{ opacity: slideIndex === 0 ? 0.5 : 1 }}
                >
                  Prev
                </button>
                {slideIndex < slides.length - 1 ? (
                  <button
                    onClick={() => setSlideIndex(prev => prev + 1)}
                    className="btn-glass-primary"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => setShowPresentation(false)}
                    className="btn-glass"
                    style={{ borderColor: 'var(--accent-emerald)', color: 'var(--accent-emerald)' }}
                  >
                    Launch App Workspace
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
