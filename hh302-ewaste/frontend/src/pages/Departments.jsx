import React, { useEffect, useState } from 'react';

export default function Departments() {
	const [departments, setDepartments] = useState([]);
	const [name, setName] = useState('');

	function load() {
		fetch('/api/departments').then(r => r.json()).then(d => setDepartments(d.departments));
	}
	useEffect(() => { load(); }, []);

	function submit(e) {
		e.preventDefault();
		fetch('/api/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
			.then(r => r.json()).then(() => { setName(''); load(); });
	}

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Create Department</h3>
				<form onSubmit={submit} className="row">
					<input className="input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
					<button className="btn" type="submit">Create</button>
				</form>
			</div>
			<div className="card">
				<h3>Departments</h3>
				<table className="table">
					<thead>
						<tr>
							<th>ID</th>
							<th>Name</th>
						</tr>
					</thead>
					<tbody>
						{departments.map(d => (
							<tr key={d.id}>
								<td className="mono">{d.id}</td>
								<td>{d.name}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}