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
	const [events, setEvents] = useState([]);
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
			return fetch(`/api/items/${data.item.id}/events`);
		}).then(async r => {
			if (r) {
				const d = await r.json();
				setEvents(d.events || []);
			}
		}).catch(() => setError('Item not found'));
	}
	function onScanError(err) {}

	const ageDays = computeAgeDays(result);

	function findAt(type) {
		return events.find(e => e.event_type === type)?.created_at || null;
	}
	const reportedAt = findAt('reported') || result?.created_at;
	const scheduledAt = findAt('scheduled_for_pickup');
	const pickedAt = findAt('status_picked_up');
	const recycledAt = findAt('status_recycled');
	const refurbAt = findAt('status_refurbished');
	const disposedAt = findAt('status_disposed');
	const processedLabel = recycledAt ? 'Recycled' : refurbAt ? 'Refurbished' : disposedAt ? 'Disposed' : null;
	const processedAt = recycledAt || refurbAt || disposedAt || null;

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
					<div style={{ marginTop: 8 }}>
						<h4 style={{ margin: '8px 0' }}>Timeline</h4>
						<div className="mono" style={{ fontSize: 12 }}>Reported: {reportedAt || '—'}</div>
						<div className="mono" style={{ fontSize: 12 }}>Scheduled: {scheduledAt || '—'}</div>
						<div className="mono" style={{ fontSize: 12 }}>Picked up: {pickedAt || '—'}</div>
						<div className="mono" style={{ fontSize: 12 }}>{processedLabel || 'Processed'}: {processedAt || '—'}</div>
					</div>
				</div>
			)}
		</div>
	);
}