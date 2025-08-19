import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function computeAgeDays(item) {
	if (!item) return null;
	const base = item.purchase_date || item.created_at;
	if (!base) return null;
	const start = new Date(base).getTime();
	const now = Date.now();
	const days = Math.max(0, Math.floor((now - start) / (1000*60*60*24)));
	return days;
}

export default function ItemDetail() {
	const { id } = useParams();
	const [item, setItem] = useState(null);
	const [events, setEvents] = useState([]);

	function load() {
		fetch(`/api/items/${id}`).then(r => r.json()).then(d => setItem(d.item));
		fetch(`/api/items/${id}/events`).then(r => r.json()).then(d => setEvents(d.events));
	}
	useEffect(() => { load(); }, [id]);

	if (!item) return <div className="card">Loading...</div>;
	const ageDays = computeAgeDays(item);
	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Item #{item.id}</h3>
				<div><b>Name:</b> {item.name}</div>
				<div><b>Description:</b> {item.description || '—'}</div>
				<div><b>Condition:</b> {item.condition || '—'}</div>
				<div><b>Status:</b> {item.status}</div>
				<div><b>Category:</b> {item.category_key}</div>
				<div><b>Dept:</b> {item.department_id || '—'}</div>
				<div><b>Weight:</b> {item.weight_kg || 0} kg</div>
				<div><b>Age:</b> {ageDays != null ? `${ageDays} day(s)` : '—'}</div>
				<div className="row" style={{ marginTop: 8 }}>
					<img src={`/api/items/${item.id}/qr.svg`} alt="qr" style={{ width: 128, height: 128, background: '#fff', padding: 6, borderRadius: 6, border: '1px solid #e5e7eb' }} />
					<a className="btn" href={`/api/items/${item.id}/label.svg?size=600`} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>Print Label</a>
				</div>
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