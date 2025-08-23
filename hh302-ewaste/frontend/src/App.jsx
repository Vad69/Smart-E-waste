import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Login from './pages/Login.jsx';

export default function App() {
	const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
	if (!token) {
		return (
			<div className="app">
				<main className="content" style={{ width: '100%' }}>
					<header className="topbar">
						<h1>Smart E‑Waste Management</h1>
					</header>
					<div className="page">
						<Login />
					</div>
				</main>
			</div>
		);
	}
	return (
		<div className="app">
			<aside className="sidebar">
				<div className="logo">HH302</div>
				<nav>
					<NavLink to="/" end>Dashboard</NavLink>
					<NavLink to="/items">Items</NavLink>
					<NavLink to="/vendors">Vendors</NavLink>
					<NavLink to="/pickups">Pickups</NavLink>
					<NavLink to="/reports">Reports</NavLink>
					<NavLink to="/settings">Settings</NavLink>
					<NavLink to="/campaigns">Campaigns</NavLink>
					<NavLink to="/departments">Departments</NavLink>
					<NavLink to="/scan">Scan QR</NavLink>
				</nav>
			</aside>
			<main className="content">
				<header className="topbar">
					<h1>Smart E‑Waste Management</h1>
					<button className="btn secondary" onClick={() => { localStorage.removeItem('admin_token'); window.location.href = '/login'; }} style={{ marginLeft: 'auto' }}>Logout</button>
				</header>
				<div className="page">
					<Outlet />
				</div>
			</main>
		</div>
	);
}