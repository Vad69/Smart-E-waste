import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

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
	const [pickup, setPickup] = useState(null);
	const [settings, setSettings] = useState(null);
	const [error, setError] = useState('');
	const ref = useRef(null);
	const scannerRef = useRef(null);

	useEffect(() => {
		try {
			if (!scannerRef.current) {
				scannerRef.current = new Html5QrcodeScanner('qr-reader', {
					fps: 10,
					qrbox: 250,
					supportedScanTypes: [
						Html5QrcodeScanType.SCAN_TYPE_CAMERA,
						Html5QrcodeScanType.SCAN_TYPE_FILE
					]
				}, false);
				scannerRef.current.render(onScanSuccess, onScanError);
			}
		} catch (e) {
			setError('Failed to initialize scanner');
		}
		return () => { scannerRef.current?.clear?.().catch?.(() => {}); };
	}, []);

	function onScanSuccess(text) {
		setError('');
		setResult(null);
		setEvents([]);
		setPickup(null);
		fetch(`/api/items/scan/${encodeURIComponent(text)}`).then(async r => {
			if (!r.ok) throw new Error('Not found');
			const data = await r.json();
			setResult(data.item);
			return Promise.all([
				fetch(`/api/items/${data.item.id}/events`).then(rr => rr.ok ? rr.json() : { events: [] }),
				fetch(`/api/items/${data.item.id}/pickup-info`).then(rr => rr.ok ? rr.json() : { pickup: null }),
				fetch('/api/settings').then(rr => rr.ok ? rr.json() : { settings: null })
			]);
		}).then(([ev, pi, st]) => {
			setEvents(ev?.events || []);
			setPickup(pi?.pickup || null);
			setSettings(st?.settings || null);
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
				<div className="muted" style={{ marginBottom: 8 }}>Use Camera or upload an image file.</div>
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

			{settings && (
				<div className="card">
					<h3>Facility</h3>
					<div><b>Name:</b> {settings.facility_name || '—'}</div>
					<div><b>Authorization:</b> {settings.facility_authorization_no || '—'}</div>
					<div><b>Contact:</b> {settings.facility_contact_name || '—'} {settings.facility_contact_phone ? `| ${settings.facility_contact_phone}` : ''}</div>
					<div><b>Address:</b> {settings.facility_address || '—'}</div>
				</div>
			)}

			{result && (
				<div className="card">
					<h3>Vendor & Transport</h3>
					<div><b>Vendor:</b> {pickup?.vendor_name || '—'} {pickup?.vendor_type ? `(${pickup.vendor_type})` : ''}</div>
					<div><b>License:</b> {pickup?.vendor_license || '—'}</div>
					<div><b>Authorization:</b> {pickup?.vendor_authorization_no || '—'}</div>
					<div><b>Validity:</b> {pickup?.vendor_auth_valid_from || '—'} to {pickup?.vendor_auth_valid_to || '—'}</div>
					<div><b>GST:</b> {pickup?.vendor_gst_no || '—'}</div>
					<div><b>Categories:</b> {pickup?.vendor_categories_handled || '—'}</div>
					<div><b>Capacity (TPM):</b> {pickup?.vendor_capacity_tpm ?? '—'}</div>
					<div><b>Contact:</b> {pickup?.vendor_contact_name || '—'} {pickup?.vendor_phone ? `| ${pickup.vendor_phone}` : ''} {pickup?.vendor_email ? `| ${pickup.vendor_email}` : ''}</div>
					<div><b>Address:</b> {pickup?.vendor_address || '—'}</div>
					<div><b>Manifest:</b> {pickup?.manifest_no || '—'}</div>
					<div><b>Transporter:</b> {pickup?.transporter_name || '—'} {pickup?.vehicle_no ? `| ${pickup.vehicle_no}` : ''} {pickup?.transporter_contact ? `| ${pickup.transporter_contact}` : ''}</div>
					<div><b>Scheduled:</b> {pickup?.scheduled_date || '—'}</div>
				</div>
			)}
		</div>
	);
}