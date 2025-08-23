import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
	const [username, setUsername] = useState('admin');
	const [password, setPassword] = useState('');
	const [role, setRole] = useState('admin');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const navigate = useNavigate();
	const location = useLocation();

	async function submit(e) {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			let endpoint = '/api/auth/login';
			let tokenKey = 'auth_token';
			let defaultRedirect = '/';
			if (role === 'user') {
				endpoint = '/api/auth/user-login';
				tokenKey = 'auth_user_token';
				defaultRedirect = '/u';
			} else if (role === 'vendor') {
				endpoint = '/api/auth/vendor-login';
				tokenKey = 'auth_vendor_token';
				defaultRedirect = '/v';
			}

			const r = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});
			if (!r.ok) {
				const d = await r.json().catch(() => ({}));
				throw new Error(d.error || 'Login failed');
			}
			const d = await r.json();
			localStorage.setItem(tokenKey, d.token);
			const redirectTo = (location.state && location.state.from) || defaultRedirect;
			navigate(redirectTo, { replace: true });
		} catch (err) {
			setError(err.message || 'Login failed');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="card" style={{ maxWidth: 420, margin: '64px auto' }}>
			<h3>Sign In</h3>
			{error && <div className="badge error" style={{ marginBottom: 8 }}>{error}</div>}
			<form onSubmit={submit} className="grid" style={{ gridTemplateColumns: '1fr', gap: 8 }}>
				<select className="input" value={role} onChange={e => setRole(e.target.value)} disabled={loading}>
					<option value="admin">Admin</option>
					<option value="user">User</option>
					<option value="vendor">Vendor</option>
				</select>
				<input className="input" placeholder={role === 'user' ? 'User ID' : 'Username'} value={username} onChange={e => setUsername(e.target.value)} disabled={loading} />
				<input className="input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
				<button className="btn" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
			</form>
		</div>
	);
}