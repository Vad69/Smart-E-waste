import React, { useState } from 'react';

export default function Reports() {
	const [from, setFrom] = useState('');
	const [to, setTo] = useState('');
	const url = `/api/reports/compliance.pdf${from || to ? `?${new URLSearchParams({ from, to }).toString()}` : ''}`;
	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Compliance Report</h3>
				<div className="row" style={{ gap: 8 }}>
					<input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
					<input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
					<a className="btn" href={url} target="_blank" rel="noreferrer">Open PDF</a>
				</div>
			</div>
		</div>
	);
}