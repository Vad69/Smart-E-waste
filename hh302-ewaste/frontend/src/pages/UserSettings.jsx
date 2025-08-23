import React, { useEffect, useState } from 'react';
import { authUserFetch } from '../userAuth';

export default function UserSettings() {
	const [me, setMe] = useState(null);
	const [current, setCurrent] = useState('');
	const [next, setNext] = useState('');
	const [msg, setMsg] = useState('');

	useEffect(() => {
		authUserFetch('/api/user/me').then(r => r.json()).then(setMe).catch(() => {});
	}, []);

	async function change(e) {
		e.preventDefault(); setMsg('');
		try {
			const r = await authUserFetch('/api/user/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: current, new_password: next }) });
			const d = await r.json().catch(() => ({}));
			if (!r.ok) throw new Error(d.error || 'Failed');
			setMsg('Password changed'); setCurrent(''); setNext('');
		} catch (e) { setMsg(e.message || 'Failed'); }
	}

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>My Details</h3>
				<div>User ID: <b>{me?.user?.username || '—'}</b></div>
				<div>Name: <b>{me?.user?.name || '—'}</b></div>
				<div>Department: <b>{me?.user?.department_name || '—'}</b></div>
				<div>Joined: <b>{me?.user?.created_at?.slice?.(0,10) || '—'}</b></div>
				<div>Total Points: <b>{me?.balance?.total ?? '—'}</b></div>
			</div>
			<div className="card">
				<h3>Change Password</h3>
				{msg && <div className="badge" style={{ marginBottom: 8 }}>{msg}</div>}
				<form onSubmit={change} className="grid" style={{ gridTemplateColumns: '1fr', gap: 8 }}>
					<input className="input" type="password" placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} />
					<input className="input" type="password" placeholder="New password" value={next} onChange={e => setNext(e.target.value)} />
					<button className="btn" type="submit">Update Password</button>
				</form>
			</div>
		</div>
	);
}