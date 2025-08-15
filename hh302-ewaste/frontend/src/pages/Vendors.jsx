import React, { useEffect, useState } from 'react';

export default function Vendors() {
	const [vendors, setVendors] = useState([]);
	const [types, setTypes] = useState(['recycler','hazardous','refurbisher']);
	const [typeFilter, setTypeFilter] = useState('');
	const [form, setForm] = useState({ name: '', type: 'recycler', license_no: '' });

	function load() {
		const q = typeFilter ? `?type=${typeFilter}` : '';
		fetch('/api/vendors' + q).then(r => r.json()).then(d => setVendors(d.vendors));
	}
	useEffect(() => { load(); }, [typeFilter]);

	function submit(e) {
		e.preventDefault();
		fetch('/api/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
			.then(r => r.json()).then(() => { setForm({ name: '', type: 'recycler', license_no: '' }); load(); });
	}

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Add Vendor</h3>
				<form onSubmit={submit} className="row wrap">
					<input className="input" placeholder="Name" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} required />
					<select value={form.type} onChange={e => setForm(v => ({ ...v, type: e.target.value }))}>
						{types.map(t => <option key={t} value={t}>{t}</option>)}
					</select>
					<input className="input" placeholder="License No" value={form.license_no} onChange={e => setForm(v => ({ ...v, license_no: e.target.value }))} />
					<button className="btn" type="submit">Save</button>
				</form>
			</div>

			<div className="card">
				<div className="row" style={{ marginBottom: 8 }}>
					<select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
						<option value="">All types</option>
						{types.map(t => <option key={t} value={t}>{t}</option>)}
					</select>
				</div>
				<table className="table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Type</th>
							<th>License</th>
						</tr>
					</thead>
					<tbody>
						{vendors.map(v => (
							<tr key={v.id}>
								<td>{v.name}</td>
								<td>{v.type}</td>
								<td className="mono">{v.license_no || '—'}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}