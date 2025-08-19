import React, { useEffect, useState } from 'react';

const COLORS = { reported: '#94a3b8', scheduled: '#0ea5e9', picked_up: '#f59e0b', recycled: '#10b981', refurbished: '#8b5cf6', disposed: '#ef4444' };

function BreakdownBar({ counts }) {
	const total = Object.values(counts || {}).reduce((a, b) => a + (b || 0), 0) || 1;
	const keys = ['reported','scheduled','picked_up','recycled','refurbished','disposed'];
	return (
		<div style={{ display: 'flex', width: 260, height: 12, borderRadius: 6, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f8fafc' }}>
			{keys.map(k => {
				const w = ((counts?.[k] || 0) / total) * 100;
				return <div key={k} title={`${k}: ${counts?.[k] || 0}`} style={{ width: `${w}%`, background: COLORS[k] }} />;
			})}
		</div>
	);
}

export default function Pickups() {
	const [suggested, setSuggested] = useState({ suggested_items: [], vendors: [] });
	const [vendorType, setVendorType] = useState('recycler');
	const [selectedVendor, setSelectedVendor] = useState('');
	const [selectedItems, setSelectedItems] = useState([]);
	const [date, setDate] = useState('');
	const [pickups, setPickups] = useState([]);

	function loadSuggest() {
		fetch(`/api/pickups/suggest?vendor_type=${vendorType}`).then(r => r.json()).then(setSuggested);
	}
	function loadPickups() {
		fetch('/api/pickups').then(r => r.json()).then(d => setPickups(d.pickups));
	}
	useEffect(() => { loadSuggest(); }, [vendorType]);
	useEffect(() => { loadPickups(); }, []);

	function toggleItem(id) {
		setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.concat(id));
	}

	function schedule(e) {
		e.preventDefault();
		const payload = { vendor_id: Number(selectedVendor), scheduled_date: date, item_ids: selectedItems };
		fetch('/api/pickups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			.then(r => r.json()).then(() => { setSelectedItems([]); setDate(''); loadPickups(); });
	}

	function updatePickupStatus(id, status) {
		fetch(`/api/pickups/${id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
			.then(r => r.json())
			.then(() => loadPickups());
	}

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Schedule Pickup</h3>
				<form onSubmit={schedule} className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
					<select value={vendorType} onChange={e => setVendorType(e.target.value)}>
						{['recycler','hazardous','refurbisher'].map(t => <option key={t} value={t}>{t}</option>)}
					</select>
					<select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)} required>
						<option value="">Select vendor</option>
						{suggested.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
					</select>
					<input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
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
							<th>Weight</th>
						</tr>
					</thead>
					<tbody>
						{suggested.suggested_items.map(i => (
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
				<table className="table">
					<thead>
						<tr>
							<th>ID</th>
							<th>Vendor</th>
							<th>Date</th>
							<th>Status</th>
							<th>Items</th>
							<th>Breakdown</th>
							<th>Last Update</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{pickups.map(p => (
							<tr key={p.id}>
								<td className="mono">{p.id}</td>
								<td>{p.vendor_name || p.vendor_id}</td>
								<td>{p.scheduled_date?.slice?.(0,10)}</td>
								<td>{p.status}</td>
								<td>{p.item_count}</td>
								<td><BreakdownBar counts={p.counts} /></td>
								<td className="mono">{p.last_item_update?.replace?.('T',' ').slice?.(0,16) || '—'}</td>
								<td>
									<button className="btn" onClick={() => updatePickupStatus(p.id, 'completed')} disabled={p.status !== 'scheduled'}>Complete</button>
									<button className="btn secondary" style={{ marginLeft: 6 }} onClick={() => updatePickupStatus(p.id, 'cancelled')} disabled={p.status !== 'scheduled'}>Cancel</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}