import React, { useState } from 'react';

export default function Reports() {
	const [form6From, setForm6From] = useState('');
	const [form6To, setForm6To] = useState('');

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