import React, { useEffect, useState } from 'react';
import { authFetch } from '../main.jsx';

export default function Vendors() {
	const [vendors, setVendors] = useState([]);
	const [types, setTypes] = useState(['recycler','hazardous','refurbisher']);
	const [typeFilter, setTypeFilter] = useState('');
	const [includeInactive, setIncludeInactive] = useState(false);
	const [form, setForm] = useState({ name: '', type: 'recycler', license_no: '', authorization_no: '', auth_valid_from: '', auth_valid_to: '', gst_no: '', capacity_tpm: '', categories_handled: '', contact_name: '', phone: '', email: '', address: '' });

	function load() {
		const params = new URLSearchParams();
		if (typeFilter) params.set('type', typeFilter);
		if (includeInactive) params.set('include_inactive', '1');
		authFetch('/api/vendors?' + params.toString())
			.then(r => r.json())
			.then(d => setVendors((d && Array.isArray(d.vendors)) ? d.vendors : []))
			.catch(() => setVendors([]));
	}
	useEffect(() => { load(); }, [typeFilter, includeInactive]);

	function submit(e) {
		e.preventDefault();
		const capacity = form.capacity_tpm === '' ? null : Number(form.capacity_tpm);
		const payload = { ...form, capacity_tpm: capacity };
		authFetch('/api/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			.then(async r => {
				if (!r.ok) {
					const err = await r.json().catch(() => ({}));
					throw new Error(err?.error || 'Failed to save vendor');
				}
				return r.json();
			})
			.then(() => { setForm({ name: '', type: 'recycler', license_no: '', authorization_no: '', auth_valid_from: '', auth_valid_to: '', gst_no: '', capacity_tpm: '', categories_handled: '', contact_name: '', phone: '', email: '', address: '' }); load(); })
			.catch(e => {
				alert(e.message || 'Failed to save vendor');
			});
	}

	function removeVendor(id) { authFetch(`/api/vendors/${id}`, { method: 'DELETE' }).then(load); }
	function restoreVendor(id) { authFetch(`/api/vendors/${id}/restore`, { method: 'POST' }).then(load); }

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Add Vendor</h3>
				<form onSubmit={submit} className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
					<input className="input" placeholder="Name" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} required />
					<select value={form.type} onChange={e => setForm(v => ({ ...v, type: e.target.value }))}>
						{(types || []).map(t => <option key={t} value={t}>{t}</option>)}
					</select>
					<input className="input" placeholder="License No" value={form.license_no} onChange={e => setForm(v => ({ ...v, license_no: e.target.value }))} />
					<input className="input" placeholder="Authorization No" value={form.authorization_no} onChange={e => setForm(v => ({ ...v, authorization_no: e.target.value }))} />
					<input className="input" type="date" value={form.auth_valid_from} onChange={e => setForm(v => ({ ...v, auth_valid_from: e.target.value }))} />
					<input className="input" type="date" value={form.auth_valid_to} onChange={e => setForm(v => ({ ...v, auth_valid_to: e.target.value }))} />
					<input className="input" placeholder="GST No" value={form.gst_no} onChange={e => setForm(v => ({ ...v, gst_no: e.target.value }))} />
					<input className="input" type="number" min="0" step="0.1" placeholder="Capacity (TPM)" value={form.capacity_tpm} onChange={e => setForm(v => ({ ...v, capacity_tpm: e.target.value }))} />
					<input className="input" placeholder="Categories handled (codes)" value={form.categories_handled} onChange={e => setForm(v => ({ ...v, categories_handled: e.target.value }))} />
					<input className="input" placeholder="Contact Name" value={form.contact_name} onChange={e => setForm(v => ({ ...v, contact_name: e.target.value }))} />
					<input className="input" placeholder="Phone" value={form.phone} onChange={e => setForm(v => ({ ...v, phone: e.target.value }))} />
					<input className="input" placeholder="Email" value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} />
					<input className="input" placeholder="Address" value={form.address} onChange={e => setForm(v => ({ ...v, address: e.target.value }))} style={{ gridColumn: '1 / span 2' }} />
					<button className="btn" type="submit">Save</button>
				</form>
			</div>

			<div className="card">
				<div className="row" style={{ marginBottom: 8, gap: 8 }}>
					<select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
						<option value="">All types</option>
						{(types || []).map(t => <option key={t} value={t}>{t}</option>)}
					</select>
					<label className="row" style={{ gap: 6 }}>
						<input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} /> Include inactive
					</label>
				</div>
				<table className="table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Type</th>
							<th>Contact</th>
							<th>Phone</th>
							<th>Email</th>
							<th>Address</th>
							<th>License</th>
							<th>Auth No</th>
							<th>Validity</th>
							<th>GST</th>
							<th>Capacity (TPM)</th>
							<th>Categories</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{(vendors || []).map(v => (
							<tr key={v.id}>
								<td>{v.name}</td>
								<td>{v.type}</td>
								<td>{v.contact_name || '—'}</td>
								<td className="mono">{v.phone || '—'}</td>
								<td className="mono">{v.email || '—'}</td>
								<td style={{ maxWidth: 360, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{v.address || '—'}</td>
								<td className="mono">{v.license_no || '—'}</td>
								<td className="mono">{v.authorization_no || '—'}</td>
								<td className="mono">{v.auth_valid_from || '—'} to {v.auth_valid_to || '—'}</td>
								<td className="mono">{v.gst_no || '—'}</td>
								<td className="mono">{v.capacity_tpm || '—'}</td>
								<td className="mono">{v.categories_handled || '—'}</td>
								<td>{v.active ? 'active' : 'inactive'}</td>
								<td className="row">
									{v.active ? (
										<button className="btn secondary" onClick={() => removeVendor(v.id)}>Remove</button>
									) : (
										<button className="btn" onClick={() => restoreVendor(v.id)}>Restore</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}