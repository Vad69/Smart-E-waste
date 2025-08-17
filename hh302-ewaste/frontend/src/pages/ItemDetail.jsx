import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function ItemDetail() {
	const { id } = useParams();
	const [item, setItem] = useState(null);
	const [events, setEvents] = useState([]);
	const [status, setStatus] = useState('');
	const [notes, setNotes] = useState('');

	function load() {
		fetch(`/api/items/${id}`).then(r => r.json()).then(d => setItem(d.item));
		fetch(`/api/items/${id}/events`).then(r => r.json()).then(d => setEvents(d.events));
	}
	useEffect(() => { load(); }, [id]);

	function updateStatus(e) {
		e.preventDefault();
		fetch(`/api/items/${id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, notes }) })
			.then(r => r.json()).then(load);
	}

	if (!item) return <div className="card">Loading...</div>;
	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Item #{item.id}</h3>
				<div><b>Name:</b> {item.name}</div>
				<div><b>Status:</b> {item.status}</div>
				<div><b>Category:</b> {item.category_key}</div>
				<div><b>Dept:</b> {item.department_id || '—'}</div>
				<div><b>Weight:</b> {item.weight_kg || 0} kg</div>
				<div className="row" style={{ marginTop: 8 }}>
					<img src={`/api/items/${item.id}/qr.svg`} alt="qr" style={{ width: 128, height: 128, background: '#fff', padding: 6, borderRadius: 6, border: '1px solid #e5e7eb' }} />
					<a className="btn" href={`/api/items/${item.id}/label.svg`} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>Print Label</a>
				</div>
			</div>

			<div className="card">
				<h3>Update Status</h3>
				<form onSubmit={updateStatus} className="row">
					<select value={status} onChange={e => setStatus(e.target.value)}>
						<option value="">Select...</option>
						{['reported','scheduled','picked_up','recycled'].map(s => <option key={s} value={s}>{s}</option>)}
					</select>
					<input className="input" placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
					<button className="btn" type="submit">Save</button>
				</form>
			</div>

			<div className="card">
				<h3>Events</h3>
				<table className="table">
					<thead>
						<tr>
							<th>Time</th>
							<th>Event</th>
							<th>Notes</th>
						</tr>
					</thead>
					<tbody>
						{events.map(ev => (
							<tr key={ev.id}>
								<td className="mono">{ev.created_at}</td>
								<td>{ev.event_type}</td>
								<td>{ev.notes}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}