import { useState, useEffect } from 'react';
import { Shield, Sparkles, MapPin, Target, Eye, BarChart, ChevronDown, ChevronUp } from 'lucide-react';

export default function AiPredictive() {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchForecast() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/ai/forecast', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setForecasts(data);
        if (data.length > 0) setExpandedIndex(0);
      } catch (err) {
        console.error('Error fetching forecasts:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchForecast();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Initiating predictive policing neural matrix...</div>;
  }

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>AI PREDICTIVE POLICING & LOGISTICS</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Machine learning models forecasting local crime probabilities, emerging category threats, and recommended patrol beats.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Left Column: District Risk Scorecards */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} /> DISTRICT PROPENSITY ANALYSIS
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Historical trends merged with socioeconomic indices generate risk forecasts. Confidence scores scale with local database counts.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {forecasts.map((fc, idx) => {
              const isExpanded = expandedIndex === idx;
              const isHigh = fc.riskScore === 'High';
              const isMedium = fc.riskScore === 'Medium';
              const pVal = parseInt(fc.probability);

              return (
                <div key={idx} style={{ border: '1px solid var(--panel-border)', borderRadius: '8px', overflow: 'hidden' }}>
                  {/* Collapsible header */}
                  <div
                    onClick={() => toggleExpand(idx)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 16px',
                      background: isExpanded ? 'rgba(6,182,212,0.06)' : 'rgba(30,41,59,0.15)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{fc.district} Limits</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                        Emerging Category: <strong style={{ color: 'var(--text-primary)' }}>{fc.emergingCategory}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: isHigh ? 'var(--accent-ruby)' : (isMedium ? 'var(--accent-amber)' : 'var(--accent-emerald)'),
                          background: isHigh ? 'rgba(239,68,68,0.15)' : (isMedium ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)'),
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: `1px solid ${isHigh ? 'var(--accent-ruby)' : (isMedium ? 'var(--accent-amber)' : 'var(--accent-emerald)')}`
                        }}>
                          {fc.riskScore} Risk
                        </span>
                        <strong style={{ fontSize: '1.1rem', display: 'block', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{fc.probability}</strong>
                      </div>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Collapsible body */}
                  {isExpanded && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--panel-border)', background: 'rgba(7,11,19,0.2)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Resource Logistics</span>
                          <strong>{fc.resourceRequirement}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Confidence Index Margin</span>
                          <strong>{fc.confidence} confidence</strong>
                        </div>
                      </div>

                      {/* Probability bar */}
                      <div style={{ marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Crime Occurrence Propensity</span>
                          <strong>{fc.probability}</strong>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(30,41,59,0.6)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: fc.probability, background: isHigh ? 'var(--accent-ruby)' : (isMedium ? 'var(--accent-amber)' : 'var(--accent-emerald)') }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: AI Explanations & Patrol Route beats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Explainable AI block */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart size={18} /> EXPLAINABLE FORECASTS (XAI)
            </h3>
            {expandedIndex !== null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Model Weights supporting risk prediction for <strong>{forecasts[expandedIndex].district}</strong>:
                </span>
                {forecasts[expandedIndex].explanations.map((exp: any, idx: number) => (
                  <div key={idx} style={{ background: 'rgba(30,41,59,0.3)', border: '1px solid var(--panel-border)', padding: '10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>{exp.feature}</span>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{exp.weight}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expand a district on the left panel to inspect its model feature correlations.</p>
            )}
          </div>

          {/* Patrol Route Checkpoints */}
          <div className="glass-panel" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} /> RECOMMENDED PATROL BEATS
            </h3>
            {expandedIndex !== null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Tactical dispatch routes optimized for hotspot suppression:
                </span>
                
                {forecasts[expandedIndex].patrolRoutes.map((route: any[], rIdx: number) => (
                  <div key={rIdx} style={{ background: 'rgba(7,11,19,0.4)', border: '1px solid var(--panel-border)', padding: '12px', borderRadius: '6px' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', display: 'block', marginBottom: '6px' }}>
                      Beat Unit #{rIdx + 1}
                    </strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                      {route.map((pt, pIdx) => (
                        <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', borderLeft: '2px solid var(--accent-cyan)', paddingLeft: '8px', margin: '2px 0' }}>
                          <span>{pt.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ({pt.lat.toFixed(4)}, {pt.lon.toFixed(4)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select a district limits sector to configure optimized dispatch beats.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
