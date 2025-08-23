import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, Brush } from 'recharts';
import { authUserFetch } from '../userAuth';

export default function UserDashboard() {
	const [me, setMe] = useState(null);
	const [granularity, setGranularity] = useState('month');
	const [selectedMonth, setSelectedMonth] = useState(() => {
		const d = new Date();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		return `${d.getFullYear()}-${m}`;
	});
	const [monthlyTrends, setMonthlyTrends] = useState([]);
	const [dailyTrends, setDailyTrends] = useState([]);

	function monthRange(ym) {
		const [y, m] = ym.split('-').map(Number);
		const start = new Date(y, m - 1, 1);
		const end = new Date(y, m, 0);
		const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		return { from: `${iso(start)}T00:00:00Z`, to: `${iso(end)}T23:59:59Z` };
	}

	useEffect(() => {
		authUserFetch('/api/user/me').then(r => r.json()).then(setMe).catch(() => {});
		fetch('/api/analytics/trends?granularity=month').then(r => r.json()).then(d => setMonthlyTrends(d.monthly || [])).catch(() => {});
	}, []);

	useEffect(() => {
		if (granularity !== 'day') return;
		const { from, to } = monthRange(selectedMonth);
		const qs = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
		fetch(`/api/analytics/trends?granularity=day&${qs}`).then(r => r.json()).then(d => setDailyTrends(d.daily || [])).catch(() => {});
	}, [granularity, selectedMonth]);

	const data = granularity === 'day' ? dailyTrends : monthlyTrends;
	const xKey = granularity === 'day' ? 'd' : 'ym';
	const countMax = useMemo(() => Math.max(10, ...data.map(r => Number(r.c) || 0)) * 1.1, [data]);
	const weightMax = useMemo(() => Math.max(10, ...data.map(r => Number(r.w) || 0)) * 1.1, [data]);

	return (
		<div className="grid">
			<div className="card">
				<h3>Welcome</h3>
				<div>User: <b>{me?.user?.username || '—'}</b> | Name: <b>{me?.user?.name || '—'}</b> | Dept: <b>{me?.user?.department_name || '—'}</b></div>
				<div>Total Points: <b>{me?.balance?.total ?? '—'}</b></div>
			</div>

			<div className="card" style={{ height: 360 }}>
				<div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
					<h3 style={{ margin: 0 }}>{granularity === 'day' ? 'Daily Trends' : 'Monthly Trends'}</h3>
					<div className="row" style={{ gap: 8, alignItems: 'center' }}>
						{granularity === 'day' && (
							<input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
						)}
						<label className="row" style={{ gap: 6 }}>
							<input type="radio" name="gran" checked={granularity === 'day'} onChange={() => setGranularity('day')} /> Day
						</label>
						<label className="row" style={{ gap: 6 }}>
							<input type="radio" name="gran" checked={granularity === 'month'} onChange={() => setGranularity('month')} /> Month
						</label>
					</div>
				</div>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey={xKey} />
						<YAxis yAxisId="left" allowDecimals={false} domain={[0, countMax]} />
						<YAxis yAxisId="right" orientation="right" domain={[0, weightMax]} />
						<Tooltip />
						<Legend />
						<Line yAxisId="left" type="monotone" dataKey="c" name="Items" stroke="#2563eb" dot={false} />
						<Line yAxisId="right" type="monotone" dataKey="w" name="Weight (kg)" stroke="#059669" dot={false} />
						<Brush dataKey={xKey} height={20} travellerWidth={10} />
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}