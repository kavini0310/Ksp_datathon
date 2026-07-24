import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Layers, Shield, Eye, MapPin, Search, AlertCircle, Compass } from 'lucide-react';

export default function GisIntelligence() {
  const [pins, setPins] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Layers Toggles
  const [showCrimes, setShowCrimes] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showCctv, setShowCctv] = useState(true);
  const [showHeatmaps, setShowHeatmaps] = useState(true);

  // Replay Animation
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeIndex, setTimeIndex] = useState(100); // 0 to 100 percentage
  const animationRef = useRef<number | null>(null);

  // Interactivity / Click Coordinate Query
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbyData, setNearbyData] = useState<any>(null);
  const [fenceStatus, setFenceStatus] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Coordinate mapping variables for Karnataka Box
  const LAT_MIN = 11.5;
  const LAT_MAX = 18.5;
  const LON_MIN = 74.0;
  const LON_MAX = 78.5;

  const fetchGisData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/gis/pins', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPins(data.pins);
      setStations(data.stations);
    } catch (err) {
      console.error('Error fetching GIS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGisData();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Animation Loop
  useEffect(() => {
    if (isPlaying) {
      const step = () => {
        setTimeIndex(prev => {
          if (prev >= 100) return 0;
          return prev + 0.4;
        });
        animationRef.current = requestAnimationFrame(step);
      };
      animationRef.current = requestAnimationFrame(step);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  // Handle Nearby Query
  const queryCoordinates = async (lat: number, lon: number) => {
    setSelectedCoords({ lat, lon });
    try {
      const token = localStorage.getItem('token');
      
      const [nearbyRes, fenceRes] = await Promise.all([
        fetch(`/api/gis/nearby?lat=${lat}&lon=${lon}&radius=20`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/gis/check-geofence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ latitude: lat, longitude: lon })
        })
      ]);

      const nData = await nearbyRes.json();
      const fData = await fenceRes.json();
      
      setNearbyData(nData);
      setFenceStatus(fData);
    } catch (err) {
      console.error('Error querying coordinates:', err);
    }
  };

  // Canvas drawing
  useEffect(() => {
    if (loading || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw grid
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid Lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const mapCoords = (lat: number, lon: number) => {
      const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * canvas.width;
      const y = canvas.height - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * canvas.height;
      return { x, y };
    };

    // Draw District Outline (Mesh connections)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.lineWidth = 1.5;
    stations.forEach(s1 => {
      stations.forEach(s2 => {
        if (s1.district === s2.district && s1.id !== s2.id) {
          const pt1 = mapCoords(s1.latitude, s1.longitude);
          const pt2 = mapCoords(s2.latitude, s2.longitude);
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        }
      });
    });

    // Draw Heatmap under-glow
    if (showHeatmaps) {
      pins.forEach(pin => {
        const pt = mapCoords(pin.latitude, pin.longitude);
        const radius = pin.severity === 'Critical' ? 45 : 25;
        const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
        const color = pin.severity === 'Critical' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(6, 182, 212, 0.06)';
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Filter crimes based on timeIndex slider (chronological replay)
    const sortedPins = [...pins].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const stopIndex = Math.floor((timeIndex / 100) * sortedPins.length);
    const visiblePins = sortedPins.slice(0, stopIndex);

    // Draw Crime Incident pins
    if (showCrimes) {
      visiblePins.forEach(pin => {
        const pt = mapCoords(pin.latitude, pin.longitude);
        ctx.fillStyle = pin.severity === 'Critical' ? 'var(--accent-ruby)' : 'var(--accent-cyan)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing rings for critical spikes
        if (pin.severity === 'Critical') {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 10 + Math.sin(Date.now() / 150) * 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }

    // Draw Police Station hubs
    if (showStations) {
      stations.forEach(s => {
        const pt = mapCoords(s.latitude, s.longitude);
        ctx.fillStyle = 'var(--accent-blue)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // Draw Target Coordinate click pointer
    if (selectedCoords) {
      const pt = mapCoords(selectedCoords.lat, selectedCoords.lon);
      ctx.strokeStyle = 'var(--accent-amber)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pt.x - 20, pt.y); ctx.lineTo(pt.x + 20, pt.y);
      ctx.moveTo(pt.x, pt.y - 20); ctx.lineTo(pt.x, pt.y + 20);
      ctx.stroke();
    }
  }, [loading, pins, stations, showCrimes, showStations, showCctv, showHeatmaps, timeIndex, selectedCoords]);

  // Click on Canvas to query
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixels to coordinates
    const lon = LON_MIN + (x / canvas.width) * (LON_MAX - LON_MIN);
    const lat = LAT_MIN + ((canvas.height - y) / canvas.height) * (LAT_MAX - LAT_MIN);

    queryCoordinates(lat, lon);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>GEOSPATIAL SPATIAL INTELLIGENCE (GIS)</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Command center map layering district limits, crime coordinate concentrations, and tactical tracking grids.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
        {/* Map Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', padding: '16px' }}>
          {/* Layer Controls Float overlay */}
          <div style={{ position: 'absolute', top: '30px', left: '30px', background: 'rgba(7, 11, 19, 0.85)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10, backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}><Layers size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> VECTOR LAYERS</span>
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showCrimes} onChange={(e) => setShowCrimes(e.target.checked)} /> Crime Pins
            </label>
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showStations} onChange={(e) => setShowStations(e.target.checked)} /> Police Station Centroids
            </label>
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showHeatmaps} onChange={(e) => setShowHeatmaps(e.target.checked)} /> Density Heat-glow
            </label>
          </div>

          {/* Interactive Canvas Map */}
          <div style={{ width: '100%', height: '480px', background: '#080c14', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.4)', overflow: 'hidden', cursor: 'crosshair', position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={700}
              height={480}
              onClick={handleCanvasClick}
              style={{ width: '100%', height: '100%' }}
            />
            {loading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Drawing spatial grids...</div>}
          </div>

          {/* Time Slider & Play controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(30,41,59,0.2)', padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
            <button onClick={() => setIsPlaying(!isPlaying)} className="btn-glass" style={{ padding: '6px 12px' }}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={timeIndex}
                onChange={(e) => setTimeIndex(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>Chronological Start</span>
                <span>Time-Lapse Replay Scale ({Math.round(timeIndex)}%)</span>
                <span>Latest Incident logs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Geofence Status */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Compass size={16} /> GEOFENCE GUARDIAN</h3>
            {fenceStatus ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span>Monitored status:</span>
                  <strong style={{ color: fenceStatus.inside ? 'var(--accent-ruby)' : 'var(--accent-emerald)' }}>
                    {fenceStatus.inside ? 'PENETRATION DETECTED' : 'SECURE'}
                  </strong>
                </div>
                {fenceStatus.inside && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-ruby)', padding: '10px', borderRadius: '6px', fontSize: '0.75rem', color: '#fca5a5' }}>
                    <strong>{fenceStatus.fenceName}</strong> violated. Threat Index: <span style={{ color: 'var(--accent-ruby)', fontWeight: 700 }}>{fenceStatus.riskLevel}</span>
                  </div>
                )}
                {!fenceStatus.inside && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pointer is located within open public boundary limits.</p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click anywhere on the tactical map grid to execute a geofence and boundary check query.</p>
            )}
          </div>

          {/* Nearby Entities Search */}
          <div className="glass-panel" style={{ padding: '20px', flex: 1, overflowY: 'auto', maxHeight: '350px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Search size={16} /> NEARBY TACTICAL ASSETS</h3>
            {selectedCoords ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                  COORD: Lat {selectedCoords.lat.toFixed(4)}, Lon {selectedCoords.lon.toFixed(4)}
                </div>

                {nearbyData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Police stations */}
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', borderBottom: '1px solid var(--panel-border)', paddingBottom: '4px', marginBottom: '4px' }}>POLICE STATIONS</span>
                      {nearbyData.policestations.slice(0, 2).map((ps: any) => (
                        <div key={ps.id} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>{ps.name} Precinct</span>
                          <span style={{ color: 'var(--accent-blue)' }}>{ps.distance} km</span>
                        </div>
                      ))}
                    </div>

                    {/* Crimes */}
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', borderBottom: '1px solid var(--panel-border)', paddingBottom: '4px', marginBottom: '4px' }}>CRIMES LOGGED</span>
                      {nearbyData.crimes.length === 0 ? <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No incidents logged nearby.</div> :
                        nearbyData.crimes.slice(0, 3).map((cr: any) => (
                          <div key={cr.id} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span>{cr.fir_number} ({cr.category})</span>
                            <span style={{ color: 'var(--accent-cyan)' }}>{cr.distance} km</span>
                          </div>
                        ))}
                    </div>

                    {/* CCTV feeds */}
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', borderBottom: '1px solid var(--panel-border)', paddingBottom: '4px', marginBottom: '4px' }}>CCTV NODES</span>
                      {nearbyData.cctv.slice(0, 3).map((cam: any) => (
                        <div key={cam.id} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span title={cam.camera_model}>{cam.camera_model.substring(0,18)}</span>
                          <span style={{ color: cam.status === 'Inactive' ? 'var(--accent-ruby)' : 'var(--accent-emerald)' }}>{cam.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem' }}>Querying regional telemetry...</div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select an incident spot or click a coordinate on the map grid to query nearby dispatch logs, police hubs, and active CCTV camera installations.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
