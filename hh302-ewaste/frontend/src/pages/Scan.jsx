import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

function computeAgeDays(item) {
	if (!item) return null;
	const base = item.purchase_date || item.created_at;
	if (!base) return null;
	const start = new Date(base).getTime();
	const now = Date.now();
	return Math.max(0, Math.floor((now - start) / (1000*60*60*24)));
}

export default function Scan() {
	const [result, setResult] = useState(null);
	const [error, setError] = useState('');
	const ref = useRef(null);
	const scannerRef = useRef(null);

	useEffect(() => {
		scannerRef.current = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 });
		scannerRef.current.render(onScanSuccess, onScanError);
		return () => { scannerRef.current?.clear?.().catch?.(() => {}); };
	}, []);

	function onScanSuccess(text) {
		setError('');
		fetch(`/api/items/scan/${encodeURIComponent(text)}`).then(async r => {
			if (!r.ok) throw new Error('Not found');
			const data = await r.json();
			setResult(data.item);
		}).catch(() => setError('Item not found'));
	}
	function onScanError(err) {
		// ignore frequent scan errors
	}

	const ageDays = computeAgeDays(result);

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Scan QR</h3>
				<div id="qr-reader" style={{ width: 320 }} ref={ref} />
				{error && <div style={{ color: 'tomato' }}>{error}</div>}
			</div>

			{result && (
				<div className="card">
					<h3>Item</h3>
					<div><b>ID:</b> {result.id}</div>
					<div><b>Name:</b> {result.name}</div>
					<div><b>Description:</b> {result.description || '—'}</div>
					<div><b>Condition:</b> {result.condition || '—'}</div>
					<div><b>Status:</b> {result.status}</div>
					<div><b>Category:</b> {result.category_key}</div>
					<div><b>Dept:</b> {result.department_id || '—'}</div>
					<div><b>Weight:</b> {result.weight_kg || 0} kg</div>
					<div><b>Age:</b> {ageDays != null ? `${ageDays} day(s)` : '—'}</div>
				</div>
			)}
		</div>
	);
}