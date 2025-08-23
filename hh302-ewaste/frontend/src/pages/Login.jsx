import React, { useState } from 'react';

export default function Login() {
	const [username, setUsername] = useState('admin');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function submit(e) {
		e.preventDefault();
		setLoading(true);
		setError('');
		try {
			const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Login failed');
			}
			const data = await res.json();
			localStorage.setItem('admin_token', data.token);
			window.location.href = '/';
		} catch (e) {
			setError(e.message || 'Login failed');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="card" style={{ maxWidth: 400, margin: '40px auto' }}>
			<h3>Admin Login</h3>
			{error && <div className="badge error" style={{ marginBottom: 8 }}>{error}</div>}
			<form onSubmit={submit} className="grid" style={{ gridTemplateColumns: '1fr', gap: 8 }}>
				<input className="input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
				<input className="input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
				<button className="btn" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
			</form>
		</div>
	);
}