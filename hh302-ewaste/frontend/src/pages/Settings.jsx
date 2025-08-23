import React, { useEffect, useState } from 'react';
import { authFetch } from '../main';

export default function Settings() {
    const [s, setS] = useState({ facility_name: '', facility_address: '', facility_authorization_no: '', facility_contact_name: '', facility_contact_phone: '' });
    const [saving, setSaving] = useState(false);
    const [locked, setLocked] = useState(true);
    const [justSaved, setJustSaved] = useState(false);

    function load() {
        authFetch('/api/settings').then(r => r.json()).then(d => {
            setS(prev => ({ ...prev, ...(d.settings || {}) }));
            setLocked(true);
        });
    }
    useEffect(() => { load(); }, []);

    function save(e) {
        e.preventDefault();
        setSaving(true);
        authFetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) })
            .then(r => r.json())
            .then(() => {
                setSaving(false);
                setLocked(true);
                setJustSaved(true);
                setTimeout(() => setJustSaved(false), 2000);
            });
    }

    return (
        <div className="card">
            <h3>Facility Settings</h3>
            {justSaved && <div className="badge success" style={{ marginBottom: 8 }}>Saved</div>}
            {!locked ? (
                <form onSubmit={save} className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input className="input" placeholder="Facility Name" value={s.facility_name} onChange={e => setS(v => ({ ...v, facility_name: e.target.value }))} disabled={saving} />
                    <input className="input" placeholder="Authorization No" value={s.facility_authorization_no} onChange={e => setS(v => ({ ...v, facility_authorization_no: e.target.value }))} disabled={saving} />
                    <input className="input" placeholder="Contact Name" value={s.facility_contact_name} onChange={e => setS(v => ({ ...v, facility_contact_name: e.target.value }))} disabled={saving} />
                    <input className="input" placeholder="Contact Phone" value={s.facility_contact_phone} onChange={e => setS(v => ({ ...v, facility_contact_phone: e.target.value }))} disabled={saving} />
                    <textarea className="input" placeholder="Address" value={s.facility_address} onChange={e => setS(v => ({ ...v, facility_address: e.target.value }))} style={{ gridColumn: '1 / span 2', minHeight: 80 }} disabled={saving} />
                    <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
                </form>
            ) : (
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><strong>Name:</strong> {s.facility_name || '—'}</div>
                    <div><strong>Authorization:</strong> {s.facility_authorization_no || '—'}</div>
                    <div><strong>Contact:</strong> {s.facility_contact_name || '—'}</div>
                    <div><strong>Phone:</strong> {s.facility_contact_phone || '—'}</div>
                    <div style={{ gridColumn: '1 / span 2' }}><strong>Address:</strong><br />{s.facility_address || '—'}</div>
                    <div style={{ gridColumn: '1 / span 2' }}>
                        <button className="btn" onClick={() => setLocked(false)}>Edit</button>
                    </div>
                </div>
            )}

            <div className="divider" style={{ margin: '16px 0' }} />
        </div>
    );
}

