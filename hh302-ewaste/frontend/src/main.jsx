import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Items from './pages/Items.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import DriveDetail from './pages/DriveDetail.jsx';
import Vendors from './pages/Vendors.jsx';
import Pickups from './pages/Pickups.jsx';
import Reports from './pages/Reports.jsx';
import Campaigns from './pages/Campaigns.jsx';
import Departments from './pages/Departments.jsx';
import Scan from './pages/Scan.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import './styles.css';

// Attach Authorization header automatically
const origFetch = window.fetch;
window.fetch = async (input, init = {}) => {
	const token = localStorage.getItem('admin_token');
	const headers = new Headers(init.headers || {});
	if (token) headers.set('Authorization', `Bearer ${token}`);
	const res = await origFetch(input, { ...init, headers });
	if (res.status === 401) {
		localStorage.removeItem('admin_token');
		if (!String(location.pathname || '').startsWith('/login')) {
			location.href = '/login';
		}
	}
	return res;
};

const router = createBrowserRouter([
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
	},
	{ path: '/login', element: <Login /> }
]);

createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
);