import React, { useState, useEffect, useRef } from 'react';
import { Share2, GitBranch, Shield, Zap, Search } from 'lucide-react';

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  label: string;
  type: string;
  subtext: string;
  mugshot?: string;
  group: string;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
}

export default function NetworkAnalysis() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Suspect info
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Shortest Path Solver
  const [sourceSuspect, setSourceSuspect] = useState('');
  const [targetSuspect, setTargetSuspect] = useState('');
  const [shortestPath, setShortestPath] = useState<any[]>([]);
  const [pathMessage, setPathMessage] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulationRef = useRef<number | null>(null);

  const fetchNetworkData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [netRes, metRes] = await Promise.all([
        fetch('/api/graph/network', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/graph/metrics', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const netData = await netRes.json();
      const metData = await metRes.json();

      setMetrics(metData);

      // Initialize coordinates and speeds for nodes in the center of the canvas
      const width = 640;
      const height = 480;
      const initializedNodes = netData.nodes.map((n: any) => ({
        ...n,
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0
      }));

      setNodes(initializedNodes);
      setEdges(netData.edges);
    } catch (err) {
      console.error('Error fetching network graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
    return () => {
      if (simulationRef.current) cancelAnimationFrame(simulationRef.current);
    };
  }, []);

  // Force Directed Simulation Loop
  useEffect(() => {
    if (loading || nodes.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Simulation Constants
    const REPULSION = 400; // Node repulsion strength
    const ATTRACTION = 0.035; // Edge attraction strength
    const GRAVITY = 0.015; // Center gravity strength
    const DAMPING = 0.85; // Velocity damping factor

    const step = () => {
      // 1. Repulsion between all nodes (Newtonian push)
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < 280) {
            const force = REPULSION / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Attraction along Edges
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 120; // Preferred link length
          const force = (dist - targetDist) * ATTRACTION * edge.weight;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          sourceNode.vx += fx;
          sourceNode.vy += fy;
          targetNode.vx -= fx;
          targetNode.vy -= fy;
        }
      });

      // 3. Gravity and Update positions
      nodes.forEach(node => {
        const dx = width / 2 - node.x;
        const dy = height / 2 - node.y;
        
        node.vx += dx * GRAVITY;
        node.vy += dy * GRAVITY;

        node.x += node.vx;
        node.y += node.vy;

        node.vx *= DAMPING;
        node.vy *= DAMPING;

        // Wall collisions
        node.x = Math.max(25, Math.min(width - 25, node.x));
        node.y = Math.max(25, Math.min(height - 25, node.y));
      });

      // 4. Render
      ctx.clearRect(0, 0, width, height);

      // Draw Edges
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
          const isPathEdge = shortestPath.some((pNode, idx) => 
            idx > 0 && 
            ((pNode.id === sourceNode.id && shortestPath[idx-1].id === targetNode.id) ||
             (pNode.id === targetNode.id && shortestPath[idx-1].id === sourceNode.id))
          );

          if (isPathEdge) {
            ctx.strokeStyle = 'var(--accent-amber)';
            ctx.lineWidth = 4;
          } else {
            ctx.strokeStyle = edge.type === 'GangMember' ? 'rgba(239,68,68,0.25)' : 'rgba(148,163,184,0.18)';
            ctx.lineWidth = edge.weight;
          }

          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();
        }
      });

      // Draw Nodes
      nodes.forEach(node => {
        const isPathNode = shortestPath.some(p => p.id === node.id);
        const isSelected = selectedNode?.id === node.id;

        // Base glow ring
        if (isSelected || isPathNode) {
          ctx.strokeStyle = isSelected ? 'var(--accent-cyan)' : 'var(--accent-amber)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw node dot
        ctx.fillStyle = node.type === 'Suspect' ? 'var(--accent-cyan)' : 'rgba(148,163,184,0.4)';
        if (node.group === 'Deccan Chargers Gang') ctx.fillStyle = 'var(--accent-ruby)';
        if (node.group === 'Kalaburagi Syndicate') ctx.fillStyle = 'var(--accent-amber)';

        ctx.beginPath();
        ctx.arc(node.x, node.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'var(--bg-primary)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node text label
        ctx.fillStyle = 'var(--text-primary)';
        ctx.font = 'bold 9px var(--font-mono)';
        ctx.textAlign = 'center';
        ctx.fillText(node.subtext || node.label, node.x, node.y - 18);
      });

      simulationRef.current = requestAnimationFrame(step);
    };

    simulationRef.current = requestAnimationFrame(step);

    return () => {
      if (simulationRef.current) cancelAnimationFrame(simulationRef.current);
    };
  }, [loading, nodes, edges, selectedNode, shortestPath]);

  // Handle canvas click to select node
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find node clicked
    const clicked = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= 18;
    });

    if (clicked) {
      setSelectedNode(clicked);
    } else {
      setSelectedNode(null);
    }
  };

  const handleSolvePath = async (e: React.FormEvent) => {
    e.preventDefault();
    setPathMessage('');
    setShortestPath([]);

    if (!sourceSuspect || !targetSuspect) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/graph/shortest-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sourceId: sourceSuspect, targetId: targetSuspect })
      });
      const data = await res.json();
      if (data.path && data.path.length > 0) {
        setShortestPath(data.path);
      } else {
        setPathMessage(data.message || 'No direct pathway detected.');
      }
    } catch (err) {
      console.error(err);
      setPathMessage('Error routing connection path.');
    }
  };

  const suspects = metrics.map(m => ({ id: m.id, name: m.name, alias: m.alias }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>CRIMINAL NETWORK ANALYSIS</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Interactive force-directed graph tracking suspect associations, PageRank hubs, and accomplice matrices.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Network Area */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Path solver deck */}
          <form onSubmit={handleSolvePath} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(30,41,59,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '4px' }}><GitBranch size={16} /> Shortest Path Routing:</span>
            
            <select className="input-cyber" style={{ width: '160px', padding: '6px' }} value={sourceSuspect} onChange={(e) => setSourceSuspect(e.target.value)}>
              <option value="">Select Suspect A</option>
              {suspects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.alias})</option>)}
            </select>

            <select className="input-cyber" style={{ width: '160px', padding: '6px' }} value={targetSuspect} onChange={(e) => setTargetSuspect(e.target.value)}>
              <option value="">Select Suspect B</option>
              {suspects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.alias})</option>)}
            </select>

            <button type="submit" className="btn-glass" style={{ borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)', padding: '6px 12px' }}>
              Solve Relay Route
            </button>

            {shortestPath.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                Relay solved: {shortestPath.length} hops
              </span>
            )}
          </form>

          {/* Canvas Graph */}
          <div style={{ width: '100%', height: '480px', background: '#070b13', border: '1px solid rgba(51, 65, 85, 0.4)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              onClick={handleCanvasClick}
              style={{ width: '100%', height: '100%' }}
            />
            
            {/* Legend Overlay */}
            <div style={{ position: 'absolute', bottom: '15px', left: '15px', background: 'rgba(7, 11, 19, 0.8)', border: '1px solid var(--panel-border)', borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }}></span> Suspect Node
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-ruby)' }}></span> Deccan Chargers Gang
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)' }}></span> Kalaburagi Syndicate
              </div>
            </div>
          </div>

          {/* Shortest Path details */}
          {shortestPath.length > 0 && (
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid var(--accent-amber)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem' }}>
              <strong>Relay Pathway:</strong>{' '}
              {shortestPath.map((item, idx) => (
                <span key={item.id}>
                  {idx > 0 && <span style={{ color: 'var(--accent-amber)', fontWeight: 800 }}> ➜ [{item.relation}] ➜ </span>}
                  <strong style={{ color: '#fff' }}>{item.name} ({item.alias})</strong>
                </span>
              ))}
            </div>
          )}

          {pathMessage && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid var(--accent-ruby)', color: '#fca5a5', padding: '12px', borderRadius: '6px', fontSize: '0.8rem' }}>
              {pathMessage}
            </div>
          )}
        </div>

        {/* Sidebar panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selected Node Details */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={16} /> PROFILE INSPECTOR</h3>
            {selectedNode && selectedNode.type === 'Suspect' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <img src={selectedNode.mugshot} alt={selectedNode.label} style={{ width: '50px', height: '50px', border: '1px solid var(--panel-border)', borderRadius: '6px', background: 'rgba(30,41,59,0.3)' }} />
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{selectedNode.label}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>Alias: "{selectedNode.subtext}"</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Syndicate Gang:</span>
                    <strong>{selectedNode.group}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>PageRank score:</span>
                    <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      {(parseFloat(metrics.find(m => m.id === selectedNode.id)?.pagerank || '0')).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click a suspect node on the graph map to pull their profile and network indicators.</p>
            )}
          </div>

          {/* Centrality Metrics table */}
          <div className="glass-panel" style={{ padding: '20px', flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={16} /> SYNDICATE INFLUENCE</h3>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--panel-border)' }}>
                  <th style={{ textAlign: 'left', paddingBottom: '6px' }}>Suspect (Alias)</th>
                  <th style={{ textAlign: 'center', paddingBottom: '6px' }}>PageRank</th>
                  <th style={{ textAlign: 'center', paddingBottom: '6px' }}>Betweenness</th>
                </tr>
              </thead>
              <tbody>
                {metrics.slice(0, 8).map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid rgba(51,65,85,0.1)', cursor: 'pointer' }} onClick={() => {
                    const nodeMatch = nodes.find(n => n.id === m.id);
                    if (nodeMatch) setSelectedNode(nodeMatch);
                  }}>
                    <td style={{ padding: '6px 0', fontWeight: 600 }}>{m.name} <span style={{ fontSize: '0.65rem', color: 'var(--accent-amber)' }}>("{m.alias}")</span></td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{m.pagerank}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{m.betweenness}</td>
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
