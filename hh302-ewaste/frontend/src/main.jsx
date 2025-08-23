import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom';
import App from './App.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Items from './pages/Items.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import Vendors from './pages/Vendors.jsx';
import Pickups from './pages/Pickups.jsx';
import Reports from './pages/Reports.jsx';
import Campaigns from './pages/Campaigns.jsx';
import Departments from './pages/Departments.jsx';
import Scan from './pages/Scan.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import './styles.css';
import DriveDetail from './pages/DriveDetail.jsx';
import UserApp from './pages/UserApp.jsx';
import UserLogin from './pages/UserLogin.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import UserLeaderboard from './pages/UserLeaderboard.jsx';
import UserSettings from './pages/UserSettings.jsx';
import VendorApp from './pages/VendorApp.jsx';
import VendorDashboard from './pages/VendorDashboard.jsx';

function RequireAuth() {
	const location = useLocation();
	const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
	if (!token) {
		return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	}
	return <Outlet />;
}

function RequireUserAuth() {
	const location = useLocation();
	const token = typeof window !== 'undefined' ? localStorage.getItem('auth_user_token') : null;
	if (!token) {
		return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	}
	return <Outlet />;
}

function RequireVendorAuth() {
	const location = useLocation();
	const token = typeof window !== 'undefined' ? localStorage.getItem('auth_vendor_token') : null;
	if (!token) {
		return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	}
	return <Outlet />;
}

export function authFetch(input, init = {}) {
	const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
	const headers = new Headers(init.headers || {});
	if (token) headers.set('Authorization', `Bearer ${token}`);
	return fetch(input, { ...init, headers });
}

const router = createBrowserRouter([
	{ path: '/login', element: <Login /> },
	{ path: '/u/login', element: <UserLogin /> },
	{
		path: '/u',
		element: <RequireUserAuth />,
		children: [
			{
				path: '/u',
				element: <UserApp />,
				children: [
					{ index: true, element: <UserDashboard /> },
					{ path: 'leaderboard', element: <UserLeaderboard /> },
					{ path: 'settings', element: <UserSettings /> },
				]
			}
		]
	},
	{
		path: '/v',
		element: <RequireVendorAuth />,
		children: [
			{
				path: '/v',
				element: <VendorApp />,
				children: [
					{ index: true, element: <VendorDashboard /> },
				]
			}
		]
	},
	{
		path: '/',
		element: <RequireAuth />,
		children: [
			{
				path: '/',
				element: <App />,
				children: [
					{ index: true, element: <Dashboard /> },
					{ path: 'items', element: <Items /> },
					{ path: 'items/:id', element: <ItemDetail /> },
					{ path: 'drives/:id', element: <DriveDetail /> },
					{ path: 'vendors', element: <Vendors /> },
					{ path: 'pickups', element: <Pickups /> },
					{ path: 'reports', element: <Reports /> },
					{ path: 'settings', element: <Settings /> },
					{ path: 'campaigns', element: <Campaigns /> },
					{ path: 'departments', element: <Departments /> },
					{ path: 'scan', element: <Scan /> },
				]
			}
		]
	},
]);

createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
);