import React, { useEffect, useState } from 'react';
import { authFetch } from '../main.jsx';

const COLORS = { reported: '#94a3b8', scheduled: '#0ea5e9', picked_up: '#f59e0b', recycled: '#10b981', refurbished: '#8b5cf6', disposed: '#ef4444' };

function BreakdownBar({ counts }) {
	const total = Object.values(counts || {}).reduce((a, b) => a + (b || 0), 0) || 1;
	const keys = ['scheduled','picked_up','recycled','refurbished','disposed'];
	return (
		<div style={{ display: 'flex', width: 260, height: 12, borderRadius: 6, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f8fafc' }}>
			{keys.map(k => {
				const w = ((counts?.[k] || 0) / total) * 100;
				return <div key={k} title={`${k}: ${counts?.[k] || 0}`} style={{ width: `${w}%`, background: COLORS[k] }} />;
			})}
		</div>
	);
}

function Legend() {
	const keys = ['scheduled','picked_up','recycled','refurbished','disposed'];
	return (
		<div className="row wrap" style={{ gap: 12, margin: '6px 0 12px 0' }}>
			{keys.map(k => (
				<div key={k} className="row" style={{ gap: 6, alignItems: 'center' }}>
					<span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: COLORS[k], border: '1px solid #cbd5e1' }} />
					<span style={{ fontSize: 12, color: '#334155' }}>{k}</span>
				</div>
			))}
		</div>
	);
}

export default function Pickups() {
	const [suggested, setSuggested] = useState({ suggested_items: [], vendors: [] });
	const [vendorType, setVendorType] = useState('recycler');
	const [selectedVendor, setSelectedVendor] = useState('');
	const [selectedItems, setSelectedItems] = useState([]);
	const [date, setDate] = useState('');
	const [manifest, setManifest] = useState({ manifest_no: '', transporter_name: '', vehicle_no: '', transporter_contact: '' });
	const [pickups, setPickups] = useState([]);

	function loadSuggest() {
		authFetch(`/api/pickups/suggest?vendor_type=${vendorType}`)
			.then(r => r.json())
			.then(d => setSuggested({ suggested_items: Array.isArray(d?.suggested_items) ? d.suggested_items : [], vendors: Array.isArray(d?.vendors) ? d.vendors : [] }))
			.catch(() => setSuggested({ suggested_items: [], vendors: [] }));
	}
	function loadPickups() {
		authFetch('/api/pickups')
			.then(r => r.json())
			.then(d => setPickups(Array.isArray(d?.pickups) ? d.pickups : []))
			.catch(() => setPickups([]));
	}
	useEffect(() => { loadSuggest(); }, [vendorType]);
	useEffect(() => { loadPickups(); }, []);

	function toggleItem(id) {
		setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.concat(id));
	}

	function schedule(e) {
		e.preventDefault();
		const payload = { vendor_id: Number(selectedVendor), scheduled_date: date, item_ids: selectedItems, ...manifest };
		authFetch('/api/pickups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			.then(r => r.json()).then(() => { setSelectedItems([]); setDate(''); setManifest({ manifest_no: '', transporter_name: '', vehicle_no: '', transporter_contact: '' }); loadPickups(); });
	}

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Schedule Pickup</h3>
				<form onSubmit={schedule} className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
					<select value={vendorType} onChange={e => setVendorType(e.target.value)}>
						{['recycler','hazardous','refurbisher'].map(t => <option key={t} value={t}>{t}</option>)}
					</select>
					<select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)} required>
						<option value="">Select vendor</option>
						{(suggested.vendors || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
					</select>
					<input className="input" type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required />
					<input className="input" placeholder="Manifest No" value={manifest.manifest_no} onChange={e => setManifest(m => ({ ...m, manifest_no: e.target.value }))} />
					<input className="input" placeholder="Transporter Name" value={manifest.transporter_name} onChange={e => setManifest(m => ({ ...m, transporter_name: e.target.value }))} required />
					<input className="input" placeholder="Vehicle No" value={manifest.vehicle_no} onChange={e => setManifest(m => ({ ...m, vehicle_no: e.target.value }))} />
					<input className="input" placeholder="Transporter Contact" value={manifest.transporter_contact} onChange={e => setManifest(m => ({ ...m, transporter_contact: e.target.value }))} />
					<button className="btn" type="submit" disabled={!selectedVendor || selectedItems.length === 0}>Schedule</button>
				</form>
			</div>

			<div className="card">
				<h3>Suggested Items</h3>
				<table className="table">
					<thead>
						<tr>
							<th></th>
							<th>ID</th>
							<th>Name</th>
							<th>Category</th>
							<th>Weight in kg</th>
						</tr>
					</thead>
					<tbody>
						{(suggested.suggested_items || []).map(i => (
							<tr key={i.id}>
								<td><input type="checkbox" checked={selectedItems.includes(i.id)} onChange={() => toggleItem(i.id)} /></td>
								<td className="mono">{i.id}</td>
								<td>{i.name}</td>
								<td>{i.category_key}</td>
								<td>{i.weight_kg || 0}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="card">
				<h3>All Pickups</h3>
				<Legend />
				<table className="table">
					<thead>
						<tr>
							<th>ID</th>
							<th>Vendor</th>
							<th>Date</th>
							<th>Items</th>
							<th>Breakdown</th>
							<th>Scheduled Items</th>
							<th>Manifest</th>
							<th>Last Update</th>
						</tr>
					</thead>
					<tbody>
						{(pickups || []).map(p => (
							<tr key={p.id}>
								<td className="mono">{p.id}</td>
								<td>{p.vendor_name || p.vendor_id}</td>
								<td>{p.scheduled_date?.replace?.('T',' ').slice?.(0,16)}</td>
								<td>{p.item_count}</td>
								<td><BreakdownBar counts={p.counts} /></td>
								<td style={{ maxWidth: 280 }}>
									{p.items?.map(it => <div key={it.id} className="mono">#{it.id} – {it.name}</div>)}
								</td>
								<td className="mono" style={{ maxWidth: 260 }}>
									<div>{p.manifest_no || '—'}</div>
									<div>{p.transporter_name || '—'} {p.vehicle_no ? `| ${p.vehicle_no}` : ''}</div>
									<div>{p.transporter_contact || ''}</div>
								</td>
								<td className="mono">{p.last_item_update?.replace?.('T',' ').slice?.(0,16) || '—'}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}