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
	const [form, setForm] = useState({ name: '', description: '', department_id: '', condition: '', weight_kg: '' });

	function load() {
		const params = new URLSearchParams();
		if (q) params.set('q', q);
		if (status) params.set('status', status);
		if (department) params.set('department_id', department);
		if (category) params.set('category_key', category);
		fetch('/api/items?' + params.toString()).then(r => r.json()).then(d => {
			setItems(d.items);
			setTotal(d.total);
		});
	}

	useEffect(() => { load(); }, [q, status, department, category]);
	useEffect(() => { fetch('/api/departments').then(r => r.json()).then(d => setDepartments(d.departments)); }, []);

	function submit(e) {
		e.preventDefault();
		const payload = {
			...form,
			weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : 0,
			department_id: form.department_id ? Number(form.department_id) : null
		};
		fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			.then(r => r.json())
			.then(() => {
				setForm({ name: '', description: '', department_id: '', condition: '', weight_kg: '' });
				load();
			});
	}

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Report E‑Waste Item</h3>
				<form onSubmit={submit} className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
					<input className="input" placeholder="Name" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} required />
					<input className="input" placeholder="Description" value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} />
					<select value={form.department_id} onChange={e => setForm(v => ({ ...v, department_id: e.target.value }))}>
						<option value="">Department</option>
						{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
					</select>
					<input className="input" placeholder="Condition (e.g., good/poor)" value={form.condition} onChange={e => setForm(v => ({ ...v, condition: e.target.value }))} />
					<input className="input" placeholder="Weight (kg)" value={form.weight_kg} onChange={e => setForm(v => ({ ...v, weight_kg: e.target.value }))} />
					<button className="btn" type="submit">Submit</button>
				</form>
			</div>

			<div className="card">
				<div className="row wrap" style={{ gap: 8, marginBottom: 8 }}>
					<input className="input" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} />
					<select value={status} onChange={e => setStatus(e.target.value)}>
						<option value="">Status</option>
						{['reported','scheduled','picked_up','recycled'].map(s => <option key={s} value={s}>{s}</option>)}
					</select>
					<select value={department} onChange={e => setDepartment(e.target.value)}>
						<option value="">Department</option>
						{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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
							<th>Weight</th>
							<th>QR</th>
						</tr>
					</thead>
					<tbody>
						{items.map(i => (
							<tr key={i.id}>
								<td className="mono"><Link to={`/items/${i.id}`}>{i.id}</Link></td>
								<td>{i.name}</td>
								<td>{i.department_id || '—'}</td>
								<td>{i.status}</td>
								<td>{i.category_key}</td>
								<td>{i.weight_kg || 0}</td>
								<td><a href={`/api/items/${i.id}/qr.svg`} target="_blank" rel="noreferrer">QR</a></td>
							</tr>
						))}
					</tbody>
				</table>
				<div style={{ marginTop: 8 }}>Total: {total}</div>
			</div>
		</div>
	);
}