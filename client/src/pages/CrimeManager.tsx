import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, AlertCircle, FileText, Upload, RefreshCw, CheckCircle } from 'lucide-react';

export default function CrimeManager() {
  const [firs, setFirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [incidentTime, setIncidentTime] = useState('');
  const [category, setCategory] = useState('Cybercrime');
  const [modusOperandi, setModusOperandi] = useState('');
  const [district, setDistrict] = useState('Bengaluru City');
  const [policeStation, setPoliceStation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [status, setStatus] = useState('Under Investigation');
  const [description, setDescription] = useState('');
  const [weapon, setWeapon] = useState('None');
  const [vehicle, setVehicle] = useState('None');

  // Bulk Upload State
  const [bulkCsv, setBulkCsv] = useState('');

  const fetchFirs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crimes/firs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to load crimes database');
      const data = await res.json();
      setFirs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('role') || 'Guest';
    setUserRole(role);
    fetchFirs();
  }, []);

  const resetForm = () => {
    setIncidentTime('');
    setCategory('Cybercrime');
    setModusOperandi('');
    setDistrict('Bengaluru City');
    setPoliceStation('');
    setLatitude('');
    setLongitude('');
    setSeverity('Medium');
    setStatus('Under Investigation');
    setDescription('');
    setWeapon('None');
    setVehicle('None');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      incident_time: incidentTime,
      category,
      modus_operandi: modusOperandi,
      district,
      police_station: policeStation,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      severity,
      status,
      description,
      weapon,
      vehicle
    };

    try {
      const token = localStorage.getItem('token');
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/crimes/firs/${editingId}` : '/api/crimes/firs';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (res.status === 409) {
        // Duplicate detection
        setError(`ALERT: Possible Duplicate Crime Report detected! Matches existing record: ${data.duplicateFirId}`);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit FIR records');
      }

      setSuccess(editingId ? 'FIR record updated successfully.' : 'New FIR registered successfully and Case initialized.');
      setIsFormOpen(false);
      resetForm();
      fetchFirs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (fir: any) => {
    setEditingId(fir.id);
    // Format timestamp for datetime-local input
    const dateStr = fir.incident_time ? fir.incident_time.substring(0, 16) : '';
    setIncidentTime(dateStr);
    setCategory(fir.category);
    setModusOperandi(fir.modus_operandi);
    setDistrict(fir.district);
    setPoliceStation(fir.police_station);
    setLatitude(fir.latitude.toString());
    setLongitude(fir.longitude.toString());
    setSeverity(fir.severity);
    setStatus(fir.status);
    setDescription(fir.description);
    setWeapon(fir.weapon || 'None');
    setVehicle(fir.vehicle || 'None');
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete FIR record ${id}?`)) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/crimes/firs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete record');
      
      setSuccess('FIR file and associated investigation case deleted.');
      fetchFirs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkUpload = async () => {
    setError('');
    setSuccess('');
    
    if (!bulkCsv.trim()) {
      setError('Please paste CSV data to import.');
      return;
    }

    try {
      const res = await fetch('/api/crimes/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ csvData: bulkCsv })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed bulk upload');

      setSuccess(`Bulk import complete. Saved: ${data.inserted} entries. Skipped/Duplicates: ${data.skipped}`);
      setBulkCsv('');
      setIsBulkOpen(false);
      fetchFirs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isGuest = userRole === 'Guest Demo Mode';

  // Sample CSV string to guide users
  const csvTemplate = `category,modus_operandi,district,police_station,latitude,longitude,severity,status,description,weapon,vehicle
Cybercrime,Card Cloning,Bengaluru City,Koramangala,12.934,77.61,Medium,Under Investigation,Phishing hack at ATM,None,None
Robbery,Snatching at night,Mysuru,Devaraja,12.302,76.645,High,Solved,Gold chain snatch on street,Knife,Pulsar`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>CRIME DATA MANAGEMENT (FIR)</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Secure registry database containing all active FIR dockets, evidence links, and incident logs.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isGuest && (
            <>
              <button onClick={() => { setIsBulkOpen(true); setIsFormOpen(false); }} className="btn-glass" style={{ borderColor: 'var(--accent-blue)', color: 'var(--text-primary)' }}>
                <Upload size={16} /> Bulk CSV Import
              </button>
              <button onClick={() => { setIsFormOpen(true); setIsBulkOpen(false); resetForm(); }} className="btn-glass-primary">
                <Plus size={16} /> Register New FIR
              </button>
            </>
          )}
          <button onClick={fetchFirs} className="btn-glass" title="Refresh Database">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-ruby)', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid var(--accent-emerald)', color: '#a7f3d0', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Bulk Import Section */}
      {isBulkOpen && (
        <div className="glass-panel glow-border" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>BULK CSV DATASETS UPLOADER</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Paste standard comma-separated text values matching columns format. Duplicate checks are run on each row.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
            <textarea
              className="input-cyber"
              rows={8}
              placeholder="category,modus_operandi,district,police_station..."
              style={{ width: '100%', resize: 'none' }}
              value={bulkCsv}
              onChange={(e) => setBulkCsv(e.target.value)}
            />
            <div style={{ background: 'rgba(30,41,59,0.3)', border: '1px solid var(--panel-border)', padding: '15px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>CSV TEMPLATE / HEADERS DIRECTORY</span>
              <pre style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {csvTemplate}
              </pre>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={() => setIsBulkOpen(false)} className="btn-glass">Cancel</button>
            <button onClick={handleBulkUpload} className="btn-glass-primary">Initiate Bulk Injection</button>
          </div>
        </div>
      )}

      {/* Registration/Edit Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-panel glow-border" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {editingId ? `MODIFY DOCKET: ${editingId}` : 'CRIMINAL COMPLAINT REGISTRATION (FIRST INFORMATION REPORT)'}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Incident Timestamp</label>
              <input type="datetime-local" className="input-cyber" value={incidentTime} onChange={(e) => setIncidentTime(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Crime Category</label>
              <select className="input-cyber" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Cybercrime">Cybercrime</option>
                <option value="Murder">Murder</option>
                <option value="Robbery">Robbery</option>
                <option value="Dacoity">Dacoity</option>
                <option value="Rioting">Rioting</option>
                <option value="Drug Trafficking">Drug Trafficking</option>
                <option value="Women Harassment">Women Harassment</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Weapon Inherent</label>
              <select className="input-cyber" value={weapon} onChange={(e) => setWeapon(e.target.value)}>
                <option value="None">None</option>
                <option value="Knife">Knife</option>
                <option value="Sickle">Sickle</option>
                <option value="Pistol">Pistol</option>
                <option value="Revolver">Revolver</option>
                <option value="Iron Rod">Iron Rod</option>
                <option value="Wooden Staff">Wooden Staff</option>
                <option value="Acid">Acid</option>
                <option value="Country-made Bomb">Country-made Bomb</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Escape Vehicle</label>
              <select className="input-cyber" value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
                <option value="None">None</option>
                <option value="Hero Honda Splendor">Hero Honda Splendor</option>
                <option value="Bajaj Pulsar">Bajaj Pulsar</option>
                <option value="White Maruti Swift">White Maruti Swift</option>
                <option value="Black Mahindra Scorpio">Black Mahindra Scorpio</option>
                <option value="Yellow Auto Rickshaw">Yellow Auto Rickshaw</option>
                <option value="Royal Enfield Bullet">Royal Enfield Bullet</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>District Jurisdiction</label>
              <select className="input-cyber" value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="Bengaluru City">Bengaluru City</option>
                <option value="Mysuru">Mysuru</option>
                <option value="Belagavi">Belagavi</option>
                <option value="Hubballi-Dharwad">Hubballi-Dharwad</option>
                <option value="Mangaluru (Dakshina Kannada)">Mangaluru (Dakshina Kannada)</option>
                <option value="Kalaburagi">Kalaburagi</option>
                <option value="Shivamogga">Shivamogga</option>
                <option value="Tumakuru">Tumakuru</option>
                <option value="Udupi">Udupi</option>
                <option value="Kolar">Kolar</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Precinct/Police Station</label>
              <input type="text" className="input-cyber" placeholder="e.g. Koramangala" value={policeStation} onChange={(e) => setPoliceStation(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Latitude Coordinate</label>
              <input type="number" step="any" className="input-cyber" placeholder="e.g. 12.9716" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Longitude Coordinate</label>
              <input type="number" step="any" className="input-cyber" placeholder="e.g. 77.5946" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Severity Threat Index</label>
              <select className="input-cyber" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Docket Status</label>
              <select className="input-cyber" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Under Investigation">Under Investigation</option>
                <option value="Solved">Solved</option>
                <option value="Cold Case">Cold Case</option>
                <option value="Untraced">Untraced</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Modus Operandi Summary (Method of Entry/Escape)</label>
            <input type="text" className="input-cyber" placeholder="e.g. OTP interception scam using cloned landing page" value={modusOperandi} onChange={(e) => setModusOperandi(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Complaint Narration details</label>
            <textarea className="input-cyber" rows={4} placeholder="Full narrative statement from victim..." value={description} onChange={(e) => setDescription(e.target.value)} required></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => { setIsFormOpen(false); resetForm(); }} className="btn-glass">Cancel</button>
            <button type="submit" className="btn-glass-primary">{editingId ? 'Apply Amendments' : 'Inject FIR Record'}</button>
          </div>
        </form>
      )}

      {/* Database List */}
      <div className="glass-panel" style={{ flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading registry...</div>
        ) : firs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No records indexed. Register a new FIR to begin.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-cyber">
              <thead>
                <tr>
                  <th>FIR Number</th>
                  <th>Incident Date</th>
                  <th>Category</th>
                  <th>MO Style</th>
                  <th>District limits</th>
                  <th>Severity</th>
                  <th>Invest. Status</th>
                  {!isGuest && <th>Operations</th>}
                </tr>
              </thead>
              <tbody>
                {firs.map((fir) => (
                  <tr key={fir.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} /> {fir.fir_number}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(fir.incident_time).toLocaleDateString()}</td>
                    <td>{fir.category}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }} title={fir.modus_operandi}>
                      {fir.modus_operandi}
                    </td>
                    <td>{fir.district} ({fir.police_station})</td>
                    <td>
                      <span className={`badge-status ${fir.severity.toLowerCase()}`}>{fir.severity}</span>
                    </td>
                    <td>
                      <span style={{ color: fir.status === 'Solved' ? 'var(--accent-emerald)' : (fir.status === 'Cold Case' ? 'var(--text-muted)' : 'var(--accent-amber)') }}>
                        {fir.status}
                      </span>
                    </td>
                    {!isGuest && (
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleEdit(fir)} className="btn-glass" style={{ padding: '4px 8px' }} title="Modify record">
                            <Edit size={14} />
                          </button>
                          {userRole === 'Administrator' && (
                            <button onClick={() => handleDelete(fir.id)} className="btn-glass btn-glass-danger" style={{ padding: '4px 8px' }} title="Delete from ledger">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
