import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export default function DriveDetail() {
	const { id } = useParams();
	const [drive, setDrive] = useState(null);
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);

	function load() {
		setLoading(true);
		Promise.all([
			fetch(`/api/drives/${id}`).then(r => r.json()).then(d => setDrive(d.drive)),
			fetch(`/api/drives/${id}/items`).then(r => r.json()).then(d => setItems(d.items || []))
		]).finally(() => setLoading(false));
	}
	useEffect(() => { load(); }, [id]);

	async function setItemStatus(itemId, newStatus) {
		let body = { status: newStatus, notes: 'inline update' };
		if (['picked_up','recycled','refurbished','disposed'].includes(newStatus)) {
			const manual = window.prompt('Enter time for this status (YYYY-MM-DD HH:mm)');
			if (!manual) return;
			body.manual_time = manual;
		}
		const res = await fetch(`/api/items/${itemId}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			return alert(err.error || 'Failed to update status');
		}
		await res.json();
		load();
	}

	const openItems = useMemo(() => items.filter(i => i.status !== 'recycled' && i.status !== 'refurbished' && i.status !== 'disposed'), [items]);
	const completedItems = useMemo(() => items.filter(i => i.status === 'recycled' || i.status === 'refurbished' || i.status === 'disposed'), [items]);

	if (loading) return <div className="card">Loading...</div>;
	if (!drive) return <div className="card">Drive not found</div>;

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Drive #{drive.id}</h3>
				<div><b>Title:</b> {drive.title}</div>
				<div><b>Description:</b> {drive.description || '—'}</div>
				<div className="row" style={{ gap: 16, marginTop: 8 }}>
					<div><b>Items:</b> {drive.stats?.total ?? 0}</div>
					<div><b>Recyclable:</b> {drive.stats?.recyclable ?? 0}</div>
					<div><b>Refurbishable:</b> {drive.stats?.reusable ?? 0}</div>
					<div><b>Disposable:</b> {drive.stats?.hazardous ?? 0}</div>
					<div><b>Open:</b> {drive.stats?.open ?? 0}</div>
					<div><b>Completed:</b> {drive.stats?.completed ?? 0}</div>
				</div>
				<div className="row" style={{ marginTop: 8 }}>
					<img src={`/api/drives/${drive.id}/qr.svg`} alt="qr" style={{ width: 128, height: 128, background: '#fff', padding: 6, borderRadius: 6, border: '1px solid #e5e7eb' }} />
					<a className="btn" href={`/api/drives/${drive.id}/label.svg?size=600`} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>Print Label</a>
				</div>
			</div>

			<div className="card">
				<h3>Drive Items</h3>
				<table className="table">
					<thead>
						<tr>
							<th>ID</th>
							<th>Name</th>
							<th>Dept</th>
							<th>Status</th>
							<th>Category</th>
							<th>Condition</th>
							<th>Description</th>
							<th>Weight in kg</th>
							<th>QR</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{openItems.map(i => (
							<tr key={i.id}>
								<td className="mono"><Link to={`/items/${i.id}`}>{i.id}</Link></td>
								<td>{i.name}</td>
								<td>{i.department_id || '—'}</td>
								<td>{i.status}</td>
								<td>{i.category_key}</td>
								<td>{i.condition || '—'}</td>
								<td>{i.description?.slice?.(0, 50) || '—'}</td>
								<td>{i.weight_kg || 0}</td>
								<td><a href={`/api/items/${i.id}/label.svg?size=600`} target="_blank" rel="noreferrer">Label</a></td>
								<td className="row">
									<button className="btn" onClick={() => setItemStatus(i.id, 'picked_up')} disabled={i.status !== 'scheduled'}>Pick up</button>
									<button className="btn secondary" onClick={() => setItemStatus(i.id, 'recycled')} disabled={i.status !== 'picked_up'}>Recycle</button>
									<button className="btn secondary" onClick={() => setItemStatus(i.id, 'refurbished')} disabled={i.status !== 'picked_up'}>Refurbish</button>
									<button className="btn secondary" onClick={() => setItemStatus(i.id, 'disposed')} disabled={i.status !== 'picked_up'}>Dispose</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				<div style={{ marginTop: 8 }}>Open total: {openItems.length}</div>
			</div>

			<div className="card">
				<h3>Completed Items</h3>
				<table className="table">
					<thead>
						<tr>
							<th>ID</th>
							<th>Name</th>
							<th>Dept</th>
							<th>Status</th>
							<th>Category</th>
							<th>Condition</th>
							<th>Description</th>
							<th>Weight in kg</th>
							<th>QR</th>
						</tr>
					</thead>
					<tbody>
						{completedItems.map(i => (
							<tr key={i.id}>
								<td className="mono"><Link to={`/items/${i.id}`}>{i.id}</Link></td>
								<td>{i.name}</td>
								<td>{i.department_id || '—'}</td>
								<td>{i.status}</td>
								<td>{i.category_key}</td>
								<td>{i.condition || '—'}</td>
								<td>{i.description?.slice?.(0, 50) || '—'}</td>
								<td>{i.weight_kg || 0}</td>
								<td><a href={`/api/items/${i.id}/label.svg?size=600`} target="_blank" rel="noreferrer">Label</a></td>
							</tr>
						))}
					</tbody>
				</table>
				<div style={{ marginTop: 8 }}>Completed total: {completedItems.length}</div>
			</div>
		</div>
	);
}