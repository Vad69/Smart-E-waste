import React, { useEffect, useMemo, useState } from 'react';
import { authFetch } from '../main.jsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend, Brush } from 'recharts';

export default function Dashboard() {
	const [summary, setSummary] = useState(null);
	const [campaignsCount, setCampaignsCount] = useState(0);
	const [dailyTrends, setDailyTrends] = useState([]);
	const [dailyStatusTrends, setDailyStatusTrends] = useState([]);
	const [dailyImpactTrends, setDailyImpactTrends] = useState([]);
	const [monthlyTrends, setMonthlyTrends] = useState([]);
	const [monthlyStatusTrends, setMonthlyStatusTrends] = useState([]);
	const [monthlyImpactTrends, setMonthlyImpactTrends] = useState([]);
	const [granularity, setGranularity] = useState('month');
	const [selectedMonth, setSelectedMonth] = useState(() => {
		const d = new Date();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		return `${d.getFullYear()}-${m}`;
	});
	const [segments, setSegments] = useState({ byDept: [], byCategory: [] });
	const [impact, setImpact] = useState(null);
	const [sustainability, setSustainability] = useState(null);

	function monthRange(ym) {
		const [y, m] = ym.split('-').map(Number);
		const start = new Date(y, m - 1, 1);
		const end = new Date(y, m, 0);
		const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		return { from: `${iso(start)}T00:00:00Z`, to: `${iso(end)}T23:59:59Z` };
	}

	async function fetchMonthly() {
		const [t, s, i] = await Promise.all([
			authFetch(`/api/analytics/trends?granularity=month`).then(r => r.json()).catch(() => ({})),
			authFetch(`/api/analytics/status-trends?granularity=month`).then(r => r.json()).catch(() => ({})),
			authFetch(`/api/analytics/impact-trends?granularity=month`).then(r => r.json()).catch(() => ({}))
		]);
		setMonthlyTrends(t.monthly || []);
		setMonthlyStatusTrends(s.monthly || []);
		setMonthlyImpactTrends(i.monthly || []);
	}

	async function fetchDaily() {
		const { from, to } = monthRange(selectedMonth);
		const qs = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
		const [t, s, i] = await Promise.all([
			authFetch(`/api/analytics/trends?granularity=day&${qs}`).then(r => r.json()).catch(() => ({})),
			authFetch(`/api/analytics/status-trends?granularity=day&${qs}`).then(r => r.json()).catch(() => ({})),
			authFetch(`/api/analytics/impact-trends?granularity=day&${qs}`).then(r => r.json()).catch(() => ({}))
		]);
		setDailyTrends(t.daily || []);
		setDailyStatusTrends(s.daily || []);
		setDailyImpactTrends(i.daily || []);
	}

	// Initial load
	useEffect(() => {
		authFetch('/api/analytics/summary').then(r => r.json()).then(setSummary).catch(() => setSummary(null));
		fetchMonthly();
		authFetch('/api/analytics/segments').then(r => r.json()).then(setSegments).catch(() => setSegments({ byDept: [], byCategory: [] }));
		authFetch('/api/analytics/impact').then(r => r.json()).then(setImpact).catch(() => setImpact(null));
		authFetch('/api/analytics/sustainability').then(r => r.json()).then(setSustainability).catch(() => setSustainability(null));
		authFetch('/api/campaigns').then(r => r.json()).then(d => setCampaignsCount(Array.isArray(d.campaigns) ? d.campaigns.length : 0)).catch(() => setCampaignsCount(0));
	}, []);

	// Refetch monthly whenever toggled back to Month view
	useEffect(() => {
		if (granularity === 'month') fetchMonthly();
		if (granularity === 'day') fetchDaily();
	}, [granularity]);

	// Fetch daily whenever month changes
	useEffect(() => {
		fetchDaily();
	}, [selectedMonth]);

	const xKey = granularity === 'day' ? 'd' : 'ym';

	function computeMax(data, keys) {
		let max = 0;
		for (const row of data || []) {
			for (const k of keys) {
				const v = Number(row?.[k]) || 0;
				if (v > max) max = v;
			}
		}
		return max;
	}
	function niceMax(v) {
		if (!isFinite(v) || v <= 0) return 10;
		const padded = v * 1.1;
		const mag = Math.pow(10, Math.floor(Math.log10(padded)));
		return Math.ceil(padded / mag) * mag;
	}
	function fmt(n, d = 2) {
		const num = Number(n);
		if (!isFinite(num)) return '—';
		return num.toFixed(d);
	}

	const trendsData = granularity === 'day' ? dailyTrends : monthlyTrends;
	const statusData = granularity === 'day' ? dailyStatusTrends : monthlyStatusTrends;
	const impactData = granularity === 'day' ? dailyImpactTrends : monthlyImpactTrends;

	const countMax = useMemo(() => niceMax(computeMax(trendsData, ['c'])), [trendsData]);
	const weightMax = useMemo(() => niceMax(computeMax(trendsData, ['w'])), [trendsData]);
	const statusMax = useMemo(() => niceMax(computeMax(statusData, ['recycled_w','refurbished_w','disposed_w'])), [statusData]);
	const impactMax = useMemo(() => niceMax(computeMax(impactData, ['co2e','haz'])), [impactData]);

	return (
		<div className="grid">
			<div className="grid cols-3" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
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
				<div className="card">
					<h3>CO2e Saved (kg)</h3>
					<div style={{ fontSize: 28, fontWeight: 700 }}>{impact?.co2eSavedKg?.toFixed?.(1) ?? '—'}</div>
				</div>
				<div className="card">
					<h3>Hazardous Prevented (kg)</h3>
					<div style={{ fontSize: 28, fontWeight: 700 }}>{impact?.hazardousPreventedKg?.toFixed?.(1) ?? '—'}</div>
				</div>
				<div className="card">
					<h3>Total Departments</h3>
					<div style={{ fontSize: 28, fontWeight: 700 }}>{summary?.departmentsCount ?? '—'}</div>
				</div>
				<div className="card">
					<h3>Campaigns</h3>
					<div style={{ fontSize: 28, fontWeight: 700 }}>{campaignsCount}</div>
				</div>
			</div>

			<div className="grid cols-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
				<div className="card">
					<h3>Recycled</h3>
					<div style={{ fontSize: 28, fontWeight: 700 }}>{summary?.recycledCount ?? 0}</div>
				</div>
				<div className="card">
					<h3>Refurbished</h3>
					<div style={{ fontSize: 28, fontWeight: 700 }}>{summary?.refurbishedCount ?? 0}</div>
				</div>
				<div className="card">
					<h3>Disposed</h3>
					<div style={{ fontSize: 28, fontWeight: 700 }}>{summary?.disposedCount ?? 0}</div>
				</div>
			</div>

			<div className="card" style={{ height: 380, marginBottom: 16 }}>
				<div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
					<h3 style={{ margin: 0 }}>{granularity === 'day' ? 'Daily Trends' : 'Monthly Trends'}</h3>
					<div className="row" style={{ gap: 8, alignItems: 'center' }}>
						{granularity === 'day' && (
							<>
								<input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
								<button className="btn secondary" onClick={fetchDaily}>Refresh</button>
							</>
						)}
						<label className="row" style={{ gap: 6 }}>
							<input type="radio" name="gran" checked={granularity === 'day'} onChange={() => setGranularity('day')} /> Day
						</label>
						<label className="row" style={{ gap: 6 }}>
							<input type="radio" name="gran" checked={granularity === 'month'} onChange={() => setGranularity('month')} /> Month
						</label>
						{granularity === 'month' && (
							<button className="btn secondary" onClick={fetchMonthly}>Refresh</button>
						)}
					</div>
				</div>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={trendsData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
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

			<div className="card" style={{ height: 360, marginBottom: 16 }}>
				<h3>Status Outcomes Over Time (Weight)</h3>
				{granularity === 'day' && (
					<div className="row" style={{ marginBottom: 8 }}>
						<input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
						<button className="btn secondary" onClick={fetchDaily}>Refresh</button>
					</div>
				)}
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={statusData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis dataKey={xKey} />
						<YAxis domain={[0, statusMax]} />
						<Tooltip />
						<Legend />
						<Line type="monotone" dataKey="recycled_w" name="Recycled (kg)" stroke="#10b981" dot={false} />
						<Line type="monotone" dataKey="refurbished_w" name="Refurbished (kg)" stroke="#8b5cf6" dot={false} />
						<Line type="monotone" dataKey="disposed_w" name="Disposed (kg)" stroke="#ef4444" dot={false} />
					</LineChart>
				</ResponsiveContainer>
			</div>

			<div className="grid cols-3">
				<div className="card" style={{ height: 320 }}>
					<h3>By Department</h3>
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie data={segments?.byDept ?? []} dataKey="c" nameKey="department" outerRadius={110}>
								{(segments?.byDept ?? []).map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
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
							<Pie data={segments?.byCategory ?? []} dataKey="c" nameKey="category" outerRadius={110}>
								{(segments?.byCategory ?? []).map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
							</Pie>
							<Tooltip />
							<Legend />
						</PieChart>
					</ResponsiveContainer>
				</div>
				<div className="card" style={{ height: 360 }}>
					<h3>Impact Over Time</h3>
					{granularity === 'day' && (
						<div className="row" style={{ marginBottom: 8 }}>
							<input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
							<button className="btn secondary" onClick={fetchDaily}>Refresh</button>
						</div>
					)}
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={impactData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey={xKey} />
							<YAxis domain={[0, impactMax]} />
							<Tooltip />
							<Legend />
							<Line type="monotone" dataKey="co2e" name="CO2e saved (kg)" stroke="#2563eb" dot={false} />
							<Line type="monotone" dataKey="haz" name="Hazardous prevented (kg)" stroke="#14b8a6" dot={false} />
						</LineChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* Sustainability section */}
			<div className="grid cols-3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 16 }}>
				<div className="card">
					<h3>Recycled — Sustainability impact</h3>
					<div>CO2e prevented (kg): <b>{fmt(sustainability?.recycled?.co2eKg)}</b></div>
					<div>Greenhouse gases prevented (kg): <b>{fmt(sustainability?.recycled?.greenhouseGasesKg)}</b></div>
					<div>Acidification avoided (kg): <b>{fmt(sustainability?.recycled?.acidificationKg, 3)}</b></div>
					<div>Eutrophication avoided (kg): <b>{fmt(sustainability?.recycled?.eutrophicationKg, 3)}</b></div>
					<div>Heavy metals prevented (kg): <b>{fmt(sustainability?.recycled?.heavyMetalsKg)}</b></div>
				</div>
				<div className="card">
					<h3>Refurbished — Sustainability impact</h3>
					<div>CO2e prevented (kg): <b>{fmt(sustainability?.refurbished?.co2eKg)}</b></div>
					<div>Greenhouse gases prevented (kg): <b>{fmt(sustainability?.refurbished?.greenhouseGasesKg)}</b></div>
					<div>Acidification avoided (kg): <b>{fmt(sustainability?.refurbished?.acidificationKg, 3)}</b></div>
					<div>Eutrophication avoided (kg): <b>{fmt(sustainability?.refurbished?.eutrophicationKg, 3)}</b></div>
					<div>Heavy metals prevented (kg): <b>{fmt(sustainability?.refurbished?.heavyMetalsKg)}</b></div>
				</div>
				<div className="card">
					<h3>Disposed — Sustainability impact</h3>
					<div>CO2e prevented (kg): <b>{fmt(sustainability?.disposed?.co2eKg)}</b></div>
					<div>Greenhouse gases prevented (kg): <b>{fmt(sustainability?.disposed?.greenhouseGasesKg)}</b></div>
					<div>Acidification avoided (kg): <b>{fmt(sustainability?.disposed?.acidificationKg, 3)}</b></div>
					<div>Eutrophication avoided (kg): <b>{fmt(sustainability?.disposed?.eutrophicationKg, 3)}</b></div>
					<div>Heavy metals prevented (kg): <b>{fmt(sustainability?.disposed?.heavyMetalsKg)}</b></div>
				</div>
			</div>
		</div>
	);
}

const COLORS = ['#0ea5e9', '#f97316', '#84cc16', '#a855f7', '#ef4444', '#14b8a6', '#eab308'];