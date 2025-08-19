import React, { useEffect, useState } from 'react';

export default function Settings() {
    const [s, setS] = useState({ facility_name: '', facility_address: '', facility_authorization_no: '', facility_contact_name: '', facility_contact_phone: '' });
    const [saving, setSaving] = useState(false);

    function load() {
        fetch('/api/settings').then(r => r.json()).then(d => {
            setS(prev => ({ ...prev, ...(d.settings || {}) }));
        });
    }
    useEffect(() => { load(); }, []);

    function save(e) {
        e.preventDefault();
        setSaving(true);
        fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) })
            .then(r => r.json())
            .then(() => setSaving(false));
    }

    return (
        <div className="card">
            <h3>Facility Settings</h3>
            <form onSubmit={save} className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input className="input" placeholder="Facility Name" value={s.facility_name} onChange={e => setS(v => ({ ...v, facility_name: e.target.value }))} />
                <input className="input" placeholder="Authorization No" value={s.facility_authorization_no} onChange={e => setS(v => ({ ...v, facility_authorization_no: e.target.value }))} />
                <input className="input" placeholder="Contact Name" value={s.facility_contact_name} onChange={e => setS(v => ({ ...v, facility_contact_name: e.target.value }))} />
                <input className="input" placeholder="Contact Phone" value={s.facility_contact_phone} onChange={e => setS(v => ({ ...v, facility_contact_phone: e.target.value }))} />
                <textarea className="input" placeholder="Address" value={s.facility_address} onChange={e => setS(v => ({ ...v, facility_address: e.target.value }))} style={{ gridColumn: '1 / span 2', minHeight: 80 }} />
                <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
            </form>
        </div>
    );
}

