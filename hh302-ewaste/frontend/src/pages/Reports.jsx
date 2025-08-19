import React, { useState } from 'react';

export default function Reports() {
	const [daily, setDaily] = useState('');
	const [month, setMonth] = useState(''); // YYYY-MM
	const [from, setFrom] = useState('');
	const [to, setTo] = useState('');
	const [form6From, setForm6From] = useState('');
	const [form6To, setForm6To] = useState('');

	function dayRange(d) {
		if (!d) return null;
		return {
			from: `${d}T00:00:00Z`,
			to: `${d}T23:59:59Z`
		};
	}

	function monthRange(ym) {
		if (!ym) return null;
		const [y, m] = ym.split('-').map(Number);
		const start = new Date(y, m - 1, 1);
		const end = new Date(y, m, 0);
		const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
		return { from: `${iso(start)}T00:00:00Z`, to: `${iso(end)}T23:59:59Z` };
	}

	const dailyUrl = (() => {
		const r = dayRange(daily);
		if (!r) return '/api/reports/compliance.pdf';
		const qs = new URLSearchParams(r).toString();
		return `/api/reports/compliance.pdf?${qs}`;
	})();

	const monthlyUrl = (() => {
		const r = monthRange(month);
		if (!r) return '/api/reports/compliance.pdf';
		const qs = new URLSearchParams(r).toString();
		return `/api/reports/compliance.pdf?${qs}`;
	})();

	const rangeUrl = (() => {
		const params = new URLSearchParams();
		if (from) params.set('from', `${from}T00:00:00Z`);
		if (to) params.set('to', `${to}T23:59:59Z`);
		const qs = params.toString();
		return `/api/reports/compliance.pdf${qs ? `?${qs}` : ''}`;
	})();

	const form6Url = (() => {
		const params = new URLSearchParams();
		if (form6From) params.set('from', `${form6From}T00:00:00Z`);
		if (form6To) params.set('to', `${form6To}T23:59:59Z`);
		const qs = params.toString();
		return `/api/reports/form6.pdf${qs ? `?${qs}` : ''}`;
	})();

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Daily Compliance</h3>
				<div className="row" style={{ gap: 8 }}>
					<input className="input" type="date" value={daily} onChange={e => setDaily(e.target.value)} />
					<a className="btn" href={dailyUrl} target="_blank" rel="noreferrer">Open PDF</a>
				</div>
			</div>

			<div className="card">
				<h3>Monthly Compliance</h3>
				<div className="row" style={{ gap: 8 }}>
					<input className="input" type="month" value={month} onChange={e => setMonth(e.target.value)} />
					<a className="btn" href={monthlyUrl} target="_blank" rel="noreferrer">Open PDF</a>
				</div>
			</div>

			<div className="card">
				<h3>Custom Range</h3>
				<div className="row" style={{ gap: 8 }}>
					<input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
					<input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
					<a className="btn" href={rangeUrl} target="_blank" rel="noreferrer">Open PDF</a>
				</div>
			</div>

			<div className="card">
				<h3>Download CPCB Form-6 (Manifest)</h3>
				<div className="row" style={{ gap: 8 }}>
					<input className="input" type="date" value={form6From} onChange={e => setForm6From(e.target.value)} />
					<input className="input" type="date" value={form6To} onChange={e => setForm6To(e.target.value)} />
					<a className="btn" href={form6Url} target="_blank" rel="noreferrer">Open Form-6 PDF</a>
				</div>
			</div>
		</div>
	);
}