import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend, Brush } from 'recharts';

export default function Dashboard() {
	const [summary, setSummary] = useState(null);
	const [trends, setTrends] = useState([]);
	const [granularity, setGranularity] = useState('month');
	const [segments, setSegments] = useState({ byDept: [], byCategory: [] });
	const [impact, setImpact] = useState(null);

	useEffect(() => {
		fetch('/api/analytics/summary').then(r => r.json()).then(setSummary);
		fetch(`/api/analytics/trends?granularity=${granularity}`).then(r => r.json()).then(d => setTrends(d.daily || d.monthly || []));
		fetch('/api/analytics/segments').then(r => r.json()).then(setSegments);
		fetch('/api/analytics/impact').then(r => r.json()).then(setImpact);
	}, [granularity]);

	const xKey = granularity === 'day' ? 'd' : 'ym';

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

			<div className="card" style={{ height: 380 }}>
				<div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
					<h3 style={{ margin: 0 }}>{granularity === 'day' ? 'Daily Trends' : 'Monthly Trends'}</h3>
					<div className="row" style={{ gap: 8 }}>
						<label className="row" style={{ gap: 6 }}>
							<input type="radio" name="gran" checked={granularity === 'day'} onChange={() => setGranularity('day')} /> Day
						</label>
						<label className="row" style={{ gap: 6 }}>
							<input type="radio" name="gran" checked={granularity === 'month'} onChange={() => setGranularity('month')} /> Month
						</label>
					</div>
				</div>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={trends} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey={xKey} />
						<YAxis yAxisId="left" allowDecimals={false} domain={[dataMin => Math.max(0, Math.floor((dataMin || 0) * 0.9)), dataMax => Math.ceil((dataMax || 10) * 1.1)]} />
						<YAxis yAxisId="right" orientation="right" domain={[dataMin => Math.max(0, (dataMin || 0) * 0.9), dataMax => (dataMax || 10) * 1.2]} />
						<Tooltip />
						<Legend />
						<Line yAxisId="left" type="monotone" dataKey="c" name="Items" stroke="#2563eb" dot={false} />
						<Line yAxisId="right" type="monotone" dataKey="w" name="Weight (kg)" stroke="#059669" dot={false} />
						<Brush dataKey={xKey} height={20} travellerWidth={10} />
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
					<div>Refurbished devices: <b>{impact?.refurbishedCount ?? '—'}</b></div>
					<div>Reusable potential (reported reusable): <b>{impact?.reusablePotentialCount ?? '—'}</b></div>
					<div>People impacted (all time): <b>{impact?.impactedUsers ?? '—'}</b></div>
					<div>People impacted (30 days): <b>{impact?.impactedUsers30d ?? '—'}</b></div>
				</div>
			</div>
		</div>
	);
}

const COLORS = ['#0ea5e9', '#f97316', '#84cc16', '#a855f7', '#ef4444', '#14b8a6', '#eab308'];