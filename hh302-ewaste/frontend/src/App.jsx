import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function App() {
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
				</header>
				<div className="page">
					<Outlet />
				</div>
			</main>
		</div>
	);
}