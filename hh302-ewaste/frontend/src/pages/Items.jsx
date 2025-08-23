import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Items() {
	const [items, setItems] = useState([]);
	const [total, setTotal] = useState(0);
	const [q, setQ] = useState('');
	const [status, setStatus] = useState('');
	const [department, setDepartment] = useState('');
	const [category, setCategory] = useState('');
	const [departments, setDepartments] = useState([]);
	const [form, setForm] = useState({ name: '', description: '', department_id: '', condition: '', weight_kg: '', category_key: '', reported_time: '', purchase_date: '' });

	// Drives state
	const [createMode, setCreateMode] = useState('item'); // 'item' | 'drive'
	const [viewMode, setViewMode] = useState('items'); // 'items' | 'drives'
	const [drives, setDrives] = useState([]);
	const [driveForm, setDriveForm] = useState({ title: '', description: '', department_id: '', recyclable: '', reusable: '', hazardous: '', item_name_prefix: '' });

	function load() {
		const params = new URLSearchParams();
		if (q) params.set('q', q);
		if (status) params.set('status', status);
		if (department) params.set('department_id', department);
		if (category) params.set('category_key', category);
		fetch('/api/items?' + params.toString()).then(r => r.json()).then(d => {
			setItems(Array.isArray(d?.items) ? d.items : []);
			setTotal(Number(d?.total) || 0);
		}).catch(() => { setItems([]); setTotal(0); });
	}

	function loadDrives() {
		const params = new URLSearchParams();
		if (q) params.set('q', q);
		fetch('/api/drives?' + params.toString()).then(r => r.json()).then(d => {
			setDrives(Array.isArray(d?.drives) ? d.drives : []);
		}).catch(() => setDrives([]));
	}

	useEffect(() => { load(); }, [q, status, department, category]);
	useEffect(() => { fetch('/api/departments').then(r => r.json()).then(d => setDepartments(Array.isArray(d?.departments) ? d.departments : [])).catch(() => setDepartments([])); }, []);
	useEffect(() => { if (viewMode === 'drives') loadDrives(); }, [viewMode, q]);

	function submit(e) {
		e.preventDefault();
		const payload = {
			...form,
			weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : 0,
			department_id: form.department_id ? Number(form.department_id) : null,
			category_key: form.category_key || undefined,
			reported_time: form.reported_time || undefined,
			purchase_date: form.purchase_date || undefined
		};
		fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			.then(r => r.json())
			.then(() => {
				setForm({ name: '', description: '', department_id: '', condition: '', weight_kg: '', category_key: '', reported_time: '', purchase_date: '' });
				load();
			});
	}

	function submitDrive(e) {
		e.preventDefault();
		const payload = {
			title: driveForm.title,
			description: driveForm.description,
			department_id: driveForm.department_id ? Number(driveForm.department_id) : null,
			counts: {
				recyclable: Number(driveForm.recyclable) || 0,
				reusable: Number(driveForm.reusable) || 0,
				hazardous: Number(driveForm.hazardous) || 0
			},
			item_name_prefix: driveForm.item_name_prefix || ''
		};
		fetch('/api/drives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			.then(r => r.json())
			.then(() => {
				setDriveForm({ title: '', description: '', department_id: '', recyclable: '', reusable: '', hazardous: '', item_name_prefix: '' });
				loadDrives();
				setViewMode('drives');
			});
	}

	async function setItemStatus(id, newStatus) {
		let body = { status: newStatus, notes: 'inline update' };
		if (['picked_up','recycled','refurbished','disposed'].includes(newStatus)) {
			const manual = window.prompt('Enter time for this status (YYYY-MM-DD HH:mm)');
			if (!manual) return;
			body.manual_time = manual;
		}
		const res = await fetch(`/api/items/${id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			return alert(err.error || 'Failed to update status');
		}
		await res.json();
		load();
	}

	async function deleteItem(id) {
		if (!window.confirm(`Delete item #${id}? This cannot be undone.`)) return;
		const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			return alert(err.error || 'Failed to delete');
		}
		load();
	}

	const openItems = useMemo(() => (items || []).filter(i => i.status !== 'recycled' && i.status !== 'refurbished' && i.status !== 'disposed'), [items]);
	const completedItems = useMemo(() => (items || []).filter(i => i.status === 'recycled' || i.status === 'refurbished' || i.status === 'disposed'), [items]);

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="row" style={{ gap: 8 }}>
				<select value={createMode} onChange={e => setCreateMode(e.target.value)}>
					<option value="item">Create: Single Item</option>
					<option value="drive">Create: Collection Drive</option>
				</select>
				<select value={viewMode} onChange={e => setViewMode(e.target.value)}>
					<option value="items">View: Items</option>
					<option value="drives">View: Drives</option>
				</select>
			</div>

			{createMode === 'item' ? (
				<div className="card">
					<h3>Report E‑Waste Item</h3>
					<form onSubmit={submit} className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
						<input className="input" placeholder="Name" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} required />
						<input className="input" placeholder="Description" value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} />
						<select value={form.department_id} onChange={e => setForm(v => ({ ...v, department_id: e.target.value }))}>
							<option value="">Department</option>
							{(departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
						</select>
						<select value={form.category_key} onChange={e => setForm(v => ({ ...v, category_key: e.target.value }))}>
							<option value="">Category (auto)</option>
							{['recyclable','reusable','hazardous'].map(c => <option key={c} value={c}>{c}</option>)}
						</select>
						<input className="input" placeholder="Condition (e.g., good/poor)" value={form.condition} onChange={e => setForm(v => ({ ...v, condition: e.target.value }))} />
						<input className="input" placeholder="Weight (kg)" value={form.weight_kg} onChange={e => setForm(v => ({ ...v, weight_kg: e.target.value }))} />
						<div style={{ gridColumn: 'span 2' }}>
							<div style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>Reported at (date & time)</div>
							<input className="input" type="datetime-local" value={form.reported_time} onChange={e => setForm(v => ({ ...v, reported_time: e.target.value }))} />
						</div>
						<div style={{ gridColumn: 'span 2' }}>
							<div style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>Purchase date (optional)</div>
							<input className="input" type="date" value={form.purchase_date} onChange={e => setForm(v => ({ ...v, purchase_date: e.target.value }))} />
						</div>
						<button className="btn" type="submit">Submit</button>
					</form>
				</div>
			) : (
				<div className="card">
					<h3>Create Collection Drive</h3>
					<form onSubmit={submitDrive} className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
						<input className="input" placeholder="Title" value={driveForm.title} onChange={e => setDriveForm(v => ({ ...v, title: e.target.value }))} required />
						<input className="input" placeholder="Description" value={driveForm.description} onChange={e => setDriveForm(v => ({ ...v, description: e.target.value }))} />
						<select value={driveForm.department_id} onChange={e => setDriveForm(v => ({ ...v, department_id: e.target.value }))}>
							<option value="">Department (optional)</option>
							{(departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
						</select>
						<input className="input" placeholder="Recyclable count" value={driveForm.recyclable} onChange={e => setDriveForm(v => ({ ...v, recyclable: e.target.value }))} />
						<input className="input" placeholder="Refurbishable count" value={driveForm.reusable} onChange={e => setDriveForm(v => ({ ...v, reusable: e.target.value }))} />
						<input className="input" placeholder="Disposable count" value={driveForm.hazardous} onChange={e => setDriveForm(v => ({ ...v, hazardous: e.target.value }))} />
						<div style={{ gridColumn: 'span 2' }}>
							<div style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>Item name prefix (optional)</div>
							<input className="input" placeholder="e.g., Dept Drive" value={driveForm.item_name_prefix} onChange={e => setDriveForm(v => ({ ...v, item_name_prefix: e.target.value }))} />
						</div>
						<button className="btn" type="submit">Create Drive</button>
					</form>
				</div>
			)}

			{viewMode === 'items' ? (
				<>
					<div className="card">
						<h3>Open Items</h3>
						<div className="row wrap" style={{ gap: 8, marginBottom: 8 }}>
							<input className="input" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} />
							<select value={status} onChange={e => setStatus(e.target.value)}>
								<option value="">Status</option>
								{['reported','scheduled','picked_up','recycled','refurbished','disposed'].map(s => <option key={s} value={s}>{s}</option>)}
							</select>
							<select value={department} onChange={e => setDepartment(e.target.value)}>
								<option value="">Department</option>
								{(departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
							</select>
							<select value={category} onChange={e => setCategory(e.target.value)}>
								<option value="">Category</option>
								{['recyclable','reusable','hazardous'].map(c => <option key={c} value={c}>{c}</option>)}
							</select>
						</div>

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
								{(openItems || []).map(i => (
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
											<button className="btn secondary" onClick={() => deleteItem(i.id)} style={{ marginLeft: 6 }}>Delete</button>
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
								{(completedItems || []).map(i => (
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
				</>
			) : (
				<div className="card">
					<h3>Drives</h3>
					<div className="row wrap" style={{ gap: 8, marginBottom: 8 }}>
						<input className="input" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} />
					</div>
					<table className="table">
						<thead>
							<tr>
								<th>ID</th>
								<th>Title</th>
								<th>Items</th>
								<th>Breakdown</th>
								<th>QR</th>
							</tr>
						</thead>
						<tbody>
							{(drives || []).map(d => (
								<tr key={d.id}>
									<td className="mono"><Link to={`/drives/${d.id}`}>{d.id}</Link></td>
									<td>{d.title}</td>
									<td>{d.stats?.total ?? 0}</td>
									<td>{`Rcy: ${d.stats?.recyclable ?? 0} | Ref: ${d.stats?.reusable ?? 0} | Dis: ${d.stats?.hazardous ?? 0}`}</td>
									<td><a href={`/api/drives/${d.id}/label.svg?size=600`} target="_blank" rel="noreferrer">Label</a></td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}