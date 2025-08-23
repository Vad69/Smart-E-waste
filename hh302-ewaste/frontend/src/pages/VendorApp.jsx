import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function VendorApp() {
	return (
		<div className="app">
			<aside className="sidebar">
				<div className="logo">HH302</div>
				<nav>
					<NavLink to="/v" end>Dashboard</NavLink>
					<NavLink to="/v/pickups">Pickups</NavLink>
					<NavLink to="/v/settings">Settings</NavLink>
				</nav>
			</aside>
			<main className="content">
				<header className="topbar">
					<h1>Smart E‑Waste — Vendor</h1>
				</header>
				<div className="page">
					<Outlet />
				</div>
			</main>
		</div>
	);
}