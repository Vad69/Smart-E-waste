import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function Dashboard() {
	const [summary, setSummary] = useState(null);
	const [trends, setTrends] = useState([]);
	const [segments, setSegments] = useState({ byDept: [], byCategory: [] });
	const [impact, setImpact] = useState(null);

	useEffect(() => {
		fetch('/api/analytics/summary').then(r => r.json()).then(setSummary);
		fetch('/api/analytics/trends').then(r => r.json()).then(d => setTrends(d.monthly));
		fetch('/api/analytics/segments').then(r => r.json()).then(setSegments);
		fetch('/api/analytics/impact').then(r => r.json()).then(setImpact);
	}, []);

	return (
		<div className="grid">
			<div className="grid cols-3">
				<div className="card">
					<h3>Total Items</h3>
					<div style={{ fontSize: 28, fontWeight: 700 }}>{summary?.totalItems ?? '—'}</div>
				</div>
				<div className="card">
					<h3>Total Weight (kg)</h3>
					<div style={{ fontSize: 28, fontWeight: 700 }}>{summary?.totalWeight?.toFixed?.(1) ?? '—'}</div>
				</div>
				<div className="card">
					<h3>Recovery Rate</h3>
					<div style={{ fontSize: 28, fontWeight: 700 }}>{summary ? Math.round(summary.recoveryRate * 100) + '%' : '—'}</div>
				</div>
			</div>

			<div className="card" style={{ height: 300 }}>
				<h3>Monthly Trends</h3>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={trends} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey="ym" />
						<YAxis />
						<Tooltip />
						<Legend />
						<Line type="monotone" dataKey="c" name="Items" stroke="#2563eb" />
						<Line type="monotone" dataKey="w" name="Weight (kg)" stroke="#059669" />
					</LineChart>
				</ResponsiveContainer>
			</div>

			<div className="grid cols-3">
				<div className="card" style={{ height: 320 }}>
					<h3>By Department</h3>
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie data={segments.byDept} dataKey="c" nameKey="department" outerRadius={110}>
								{segments.byDept.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
							</Pie>
							<Tooltip />
							<Legend />
						</PieChart>
					</ResponsiveContainer>
				</div>
				<div className="card" style={{ height: 320 }}>
					<h3>By Category</h3>
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie data={segments.byCategory} dataKey="c" nameKey="category" outerRadius={110}>
								{segments.byCategory.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
							</Pie>
							<Tooltip />
							<Legend />
						</PieChart>
					</ResponsiveContainer>
				</div>
				<div className="card">
					<h3>Impact</h3>
					<div>CO2e saved: <b>{impact?.co2eSavedKg?.toFixed?.(1) ?? '—'}</b> kg</div>
					<div>Hazardous prevented: <b>{impact?.hazardousPreventedKg?.toFixed?.(1) ?? '—'}</b> kg</div>
				</div>
			</div>
		</div>
	);
}

const COLORS = ['#0ea5e9', '#f97316', '#84cc16', '#a855f7', '#ef4444', '#14b8a6', '#eab308'];