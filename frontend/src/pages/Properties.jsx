import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProperties, deleteProperty, getLocations } from '../api';
import { Search, Edit2, Trash2, Plus, Filter, Share2, Download, FileText } from 'lucide-react';
import { PhotoGrid } from '../components/Gallery';
import toast from 'react-hot-toast';

const TYPE_BADGE = {
  'House':              { bg: '#dbeafe', color: '#1e40af' },
  'Shop':               { bg: '#fef3c7', color: '#92400e' },
  'Agriculture Land':   { bg: '#d1fae5', color: '#065f46' },
  'Site':               { bg: '#e9d5ff', color: '#6b21a8' },
  'Commercial Godown':  { bg: '#bfdbfe', color: '#1d4ed8' },
};

const TYPES = ['All Types', 'House', 'Shop', 'Agriculture Land', 'Site', 'Commercial Godown'];

export default function Properties() {
  const navigate = useNavigate();
  const [props, setProps]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState('table');
  const [search, setSearch]     = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterVillage, setFilterVillage] = useState('');
  const [states, setStates]     = useState([]);
  const [villages, setVillages] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  // load dropdown options
  useEffect(() => {
    getLocations()
      .then(r => {
        const data = r.data || [];
        setStates([...new Set(data.map(d => d.state).filter(Boolean))]);
        setVillages([...new Set(data.map(d => d.village).filter(Boolean))]);
      })
      .catch(() => {});
  }, []);

  const fetchProps = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)                               params.search        = search;
      if (filterType && filterType !== 'All Types') params.property_type = filterType;
      if (filterState && filterState !== 'All States')   params.state = filterState;
      if (filterVillage && filterVillage !== 'All Villages') params.village = filterVillage;
      const r = await getProperties(params);
      setProps(r.data);
    } catch { toast.error('Failed to load properties'); }
    finally { setLoading(false); }
  }, [search, filterType, filterState, filterVillage]);

  useEffect(() => { fetchProps(); }, [fetchProps]);

  const handleShare = async (p) => {
    let pName = p.property_name || 'Unnamed Property';
    let text = `Property: ${pName}\nType: ${p.property_type || 'N/A'}\nOwner: ${p.owner_name || 'N/A'}\nLocation: ${[p.village, p.mandal, p.district].filter(Boolean).join(', ') || 'N/A'}`;
    const filesArray = [];

    let baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    if (baseUrl.includes('localhost') && window.location.hostname !== 'localhost') {
      baseUrl = baseUrl.replace('localhost', window.location.hostname);
    }

    if (p.file_attachments && p.file_attachments.length > 0) {
      const toastId = toast.loading(`Fetching ${p.file_attachments.length} document(s)...`);
      for (const f of p.file_attachments) {
        try {
          const downloadUrl = `${baseUrl}/api/proxy-file/${f.public_id}?resource_type=${f.type === 'image' ? 'image' : 'raw'}`;
          
          let mime = 'application/octet-stream';
          if (f.name) {
            const name = f.name.toLowerCase();
            if (name.endsWith('.pdf')) mime = 'application/pdf';
            else if (name.endsWith('.png')) mime = 'image/png';
            else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mime = 'image/jpeg';
          }

          const res = await fetch(downloadUrl);
          if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
          const blob = await res.blob();
          const file = new File([blob], f.name || 'document', { type: mime });
          filesArray.push(file);
        } catch (e) { 
          console.error('Fetch failed:', e);
          toast.error(`Failed to fetch: ${f.name || 'File'}`, { id: toastId });
        }
      }
      toast.success('Documents ready!', { id: toastId });
    }

    if (navigator.share) {
      try { 
        if (filesArray.length > 0 && navigator.canShare && navigator.canShare({ files: filesArray })) {
          await navigator.share({ title: 'Property Details', text, files: filesArray });
        } else {
          if (filesArray.length > 0) toast.error('This browser does not support sharing files. Sharing text only.');
          await navigator.share({ title: 'Property Details', text });
        }
      } catch(err) { 
        console.error('Share error', err); 
        if (err.name !== 'AbortError') toast.error('Sharing failed: ' + err.message);
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Property details copied to clipboard!');
    }
  };

  const handleDownloadDocs = async (p) => {
    if (!p.file_attachments?.length) return;
    toast.loading('Starting downloads...');
    for (const f of p.file_attachments) {
      const link = document.createElement('a');
      link.href = f.url;
      link.target = '_blank';
      link.download = f.name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast.dismiss();
  };

  const handleDelete = async (id) => {
    try {
      await deleteProperty(id);
      toast.success('Property deleted');
      setDeleteId(null);
      fetchProps();
    } catch { toast.error('Delete failed'); }
  };

  /* ── badge ── */
  const Badge = ({ type }) => {
    const cfg = TYPE_BADGE[type] || { bg: '#f1f5f9', color: '#475569' };
    return (
      <span style={{
        display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
        fontSize: '11px', fontWeight: 700, background: cfg.bg, color: cfg.color,
        textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap',
      }}>{type}</span>
    );
  };

  /* ── select style ── */
  const selStyle = {
    padding: '9px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
    fontSize: '14px', background: '#fff', cursor: 'pointer', color: '#374151',
    minWidth: '140px', outline: 'none',
  };

  return (
    <div style={{ fontFamily: "'Inter',sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontSize: '28px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Properties</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Manage all your property records</p>
        </div>
        <button onClick={() => navigate('/add-property')} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 22px',
          background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px',
          cursor: 'pointer', fontSize: '14px', fontWeight: 600,
        }}>
          <Plus size={16} /> Add Property
        </button>
      </div>

      {/* ── Filter card ── */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        {/* Row 1: search + dropdowns */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
          {/* Search */}
          <div style={{ flex: '1 1 200px', position: 'relative', minWidth: '180px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by owner or khata..."
              style={{
                width: '100%', paddingLeft: '36px', padding: '9px 12px 9px 36px',
                borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box', color: '#374151',
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* State dropdown */}
          <select value={filterState} onChange={e => setFilterState(e.target.value)} style={selStyle}>
            <option value="">All States</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Village dropdown */}
          <select value={filterVillage} onChange={e => setFilterVillage(e.target.value)} style={selStyle}>
            <option value="">All Villages</option>
            {villages.map(v => <option key={v} value={v}>{v}</option>)}
          </select>

          {/* Type dropdown */}
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
            {TYPES.map(t => <option key={t} value={t === 'All Types' ? '' : t}>{t}</option>)}
          </select>
        </div>

        {/* Row 2: result count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px' }}>
          <Filter size={13} />
          <span>Showing {props.length} of {props.length} properties</span>
        </div>
      </div>

      {/* ── View toggle ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['table', 'card'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '9px 22px', borderRadius: '8px', border: '1px solid',
            borderColor: view === v ? '#3b82f6' : '#e2e8f0',
            background: view === v ? '#3b82f6' : '#fff',
            color: view === v ? '#fff' : '#374151',
            fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            {v === 'table' ? 'Table View' : 'Card View'}
          </button>
        ))}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          Loading properties...
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && props.length === 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <Plus size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '15px' }}>No properties found. Add your first one!</p>
        </div>
      )}

      {/* ══════════════ TABLE VIEW ══════════════ */}
      {!loading && view === 'table' && props.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                {['PROPERTY TYPE', 'PROPERTY NAME', 'DOOR NO.', 'OWNER NAME', 'KHATA NUMBER', 'LOCATION', 'AREA', 'REGISTRATION NO.', 'DOCUMENTS', 'ACTIONS'].map(h => (
                  <th key={h} style={{
                    padding: '14px 16px', textAlign: 'left',
                    fontSize: '11px', fontWeight: 700, color: '#64748b',
                    letterSpacing: '0.6px', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.map(p => (
                <tr key={p.id}
                  style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '14px 16px' }}><Badge type={p.property_type} /></td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{p.property_name || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.door_no || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{p.owner_name || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.khata_number || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', maxWidth: '180px' }}>
                    {[p.village, p.mandal, p.district, p.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {p.extent_value ? `${p.extent_value} ${p.extent_unit}` : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{p.document_number || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: p.file_attachments?.length ? '#3b82f6' : '#94a3b8' }}>
                    {p.file_attachments?.length ? `${p.file_attachments.length} file(s)` : 'No docs'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleShare(p)}
                        style={{ padding: '6px 8px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#10b981' }}
                        title="Share"
                      ><Share2 size={15} /></button>
                      {p.file_attachments?.length > 0 && (
                        <button
                          onClick={() => handleDownloadDocs(p)}
                          style={{ padding: '6px 8px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#6366f1' }}
                          title="Download All Docs"
                        ><Download size={15} /></button>
                      )}
                      <button
                        onClick={() => navigate(`/edit-property/${p.id}`)}
                        style={{ padding: '6px 8px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#3b82f6' }}
                        title="Edit"
                      ><Edit2 size={15} /></button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        style={{ padding: '6px 8px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }}
                        title="Delete"
                      ><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════ CARD VIEW ══════════════ */}
      {!loading && view === 'card' && props.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {props.map(p => (
            <div key={p.id} style={{
              background: '#fff', borderRadius: '14px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              borderLeft: '4px solid #3b82f6', overflow: 'hidden',
            }}>
              <div style={{ padding: '18px' }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <Badge type={p.property_type} />
                    <p style={{ margin: '8px 0 2px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                      {p.property_name || 'Unnamed Property'}
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      Door No: <strong>{p.door_no || '—'}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                    <button onClick={() => handleShare(p)}
                      title="Share"
                      style={{ padding: '6px', background: '#ecfdf5', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#10b981', display:'flex' }}>
                      <Share2 size={14} />
                    </button>
                    {p.file_attachments?.length > 0 && (
                      <button onClick={() => handleDownloadDocs(p)}
                        title="Download All Docs"
                        style={{ padding: '6px', background: '#eef2ff', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#6366f1', display:'flex' }}>
                        <Download size={14} />
                      </button>
                    )}
                    <button onClick={() => navigate(`/edit-property/${p.id}`)}
                      style={{ padding: '6px', background: '#eff6ff', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#3b82f6', display:'flex' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteId(p.id)}
                      style={{ padding: '6px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', display:'flex' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  {[
                    ['Owner',        p.owner_name],
                    ['Khata No.',    p.khata_number],
                    ['Reg. No.',     p.document_number],
                    ['Area',         p.extent_value ? `${p.extent_value} ${p.extent_unit}` : null],
                    ['Location',     [p.village, p.mandal, p.district].filter(Boolean).join(', ')],
                    ['Patta No.',    p.patta_number],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block' }}>{label}</span>
                      <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{val}</span>
                    </div>
                  ))}
                </div>

                {p.remarks && (
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px', lineHeight: '1.5', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    {p.remarks}
                  </p>
                )}

                <PhotoGrid files={p.file_attachments || []} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '360px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '52px', height: '52px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Trash2 size={22} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '18px', color: '#1e293b', margin: '0 0 8px', fontFamily: "'Manrope',sans-serif" }}>Delete Property?</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '22px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
