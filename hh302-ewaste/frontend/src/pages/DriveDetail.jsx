import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function DriveDetail() {
	const { id } = useParams();
	const [drive, setDrive] = useState(null);
	const [events, setEvents] = useState([]);

	function load() {
		fetch(`/api/drives/${id}`).then(r => r.json()).then(d => setDrive(d.drive));
		fetch(`/api/drives/${id}/events`).then(r => r.json()).then(d => setEvents(d.events));
	}
	useEffect(() => { load(); }, [id]);

	if (!drive) return <div className="card">Loading...</div>;
	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Drive #{drive.id}</h3>
				<div><b>Title:</b> {drive.title}</div>
				<div><b>Description:</b> {drive.description || '—'}</div>
				<div><b>Status:</b> {drive.status}</div>
				<div><b>When:</b> {drive.start_date || '—'}{drive.end_date ? ' → ' + drive.end_date : ''}</div>
				<div><b>Location:</b> {drive.location || '—'}</div>
				<div><b>Counts:</b> Rcy {drive.count_recyclable || 0} | Rfb {drive.count_refurbishable || 0} | Dsp {drive.count_disposable || 0}</div>
				<div className="row" style={{ marginTop: 8 }}>
					<img src={`/api/drives/${drive.id}/qr.svg`} alt="qr" style={{ width: 128, height: 128, background: '#fff', padding: 6, borderRadius: 6, border: '1px solid #e5e7eb' }} />
					<a className="btn" href={`/api/drives/${drive.id}/label.svg?size=600`} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>Print Label</a>
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