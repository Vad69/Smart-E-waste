import React, { useEffect, useState } from 'react';

export default function Settings() {
    const [s, setS] = useState({ facility_name: '', facility_address: '', facility_authorization_no: '', facility_contact_name: '', facility_contact_phone: '' });
    const [saving, setSaving] = useState(false);
    const [locked, setLocked] = useState(true);
    const [justSaved, setJustSaved] = useState(false);

    const [pwd1, setPwd1] = useState('');
    const [pwd2, setPwd2] = useState('');
    const [pwdSaving, setPwdSaving] = useState(false);
    const [pwdMsg, setPwdMsg] = useState('');

    function load() {
        fetch('/api/settings').then(r => r.json()).then(d => {
            setS(prev => ({ ...prev, ...(d.settings || {}) }));
            setLocked(true);
        });
    }
    useEffect(() => { load(); }, []);

    function save(e) {
        e.preventDefault();
        setSaving(true);
        fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) })
            .then(r => r.json())
            .then(() => {
                setSaving(false);
                setLocked(true);
                setJustSaved(true);
                setTimeout(() => setJustSaved(false), 2000);
            });
    }

    function updatePwd(e) {
        e.preventDefault();
        setPwdMsg('');
        if (!pwd1 || pwd1.length < 6) { setPwdMsg('Password must be at least 6 characters'); return; }
        if (pwd1 !== pwd2) { setPwdMsg('Passwords do not match'); return; }
        setPwdSaving(true);
        fetch('/api/settings/admin-password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_password: pwd1 }) })
            .then(r => r.json())
            .then(d => {
                if (!d.ok) throw new Error('Failed');
                setPwdMsg('Updated');
                setPwd1(''); setPwd2('');
            })
            .catch(() => setPwdMsg('Update failed'))
            .finally(() => setPwdSaving(false));
    }

    return (
        <div className="grid" style={{ gap: 16 }}>
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
            </div>

            <div className="card">
                <h3>Admin Password</h3>
                <div style={{ fontSize: 12, color: '#334155', marginBottom: 8 }}>Only the admin can update this.</div>
                {pwdMsg && <div className={pwdMsg === 'Updated' ? 'badge success' : 'badge error'} style={{ marginBottom: 8 }}>{pwdMsg}</div>}
                <form onSubmit={updatePwd} className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input className="input" type="password" placeholder="New password" value={pwd1} onChange={e => setPwd1(e.target.value)} disabled={pwdSaving} />
                    <input className="input" type="password" placeholder="Confirm new password" value={pwd2} onChange={e => setPwd2(e.target.value)} disabled={pwdSaving} />
                    <div style={{ gridColumn: '1 / span 2' }}>
                        <button className="btn" type="submit" disabled={pwdSaving}>{pwdSaving ? 'Updating…' : 'Update Admin Password'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

