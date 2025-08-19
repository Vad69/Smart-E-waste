import React, { useEffect, useMemo, useState } from 'react';

function Section({ title, children }) {
	return (
		<div className="card">
			<h3>{title}</h3>
			{children}
		</div>
	);
}

export default function Campaigns() {
	const [campaigns, setCampaigns] = useState([]);
	const [selected, setSelected] = useState('');
	const [leaderboard, setLeaderboard] = useState([]);

	const [form, setForm] = useState({ title: '', description: '', type: 'awareness', points: 0, start_date: '', end_date: '' });
	const [award, setAward] = useState({ user_id: '', user_name: '', department_name: '', points: '' });

	const [resources, setResources] = useState([]);
	const [resForm, setResForm] = useState({ title: '', content_type: 'article', points: 10 });
	const [completeForm, setCompleteForm] = useState({ resource_id: '', user_id: '', user_name: '', department_name: '' });

	const [drives, setDrives] = useState([]);
	const [driveForm, setDriveForm] = useState({ title: '', description: '', start_date: '', end_date: '', location: '', capacity: '', points: 20 });
	const [regForm, setRegForm] = useState({ drive_id: '', user_id: '', user_name: '', department_name: '' });
	const [attendForm, setAttendForm] = useState({ drive_id: '', user_id: '' });

	const [rewards, setRewards] = useState([]);
	const [rewardForm, setRewardForm] = useState({ title: '', description: '', cost_points: '', stock: '' });
	const [redeemForm, setRedeemForm] = useState({ reward_id: '', user_id: '', user_name: '', department_name: '' });
	const [balanceUserId, setBalanceUserId] = useState('');
	const [balance, setBalance] = useState(null);

	function loadCampaigns() { fetch('/api/campaigns').then(r => r.json()).then(d => setCampaigns(d.campaigns)); }
	function loadLeaderboard() {
		if (selected) fetch(`/api/campaigns/${selected}/scores`).then(r => r.json()).then(d => setLeaderboard(d.leaderboard));
		else fetch('/api/campaigns/scoreboard/all').then(r => r.json()).then(d => setLeaderboard(d.leaderboard));
	}
	function loadEducation() { if (!selected) { setResources([]); return; } fetch(`/api/campaigns/${selected}/education`).then(r => r.json()).then(d => setResources(d.resources)); }
	function loadDrives() { if (!selected) { setDrives([]); return; } fetch(`/api/campaigns/${selected}/drives`).then(r => r.json()).then(d => setDrives(d.drives)); }
	function loadRewards() {
		if (!selected) { setRewards([]); return; }
		fetch(`/api/campaigns/${selected}/rewards`).then(r => r.json()).then(d => setRewards(d.rewards));
	}

	useEffect(() => { loadCampaigns(); loadLeaderboard(); }, []);
	useEffect(() => { loadLeaderboard(); loadEducation(); loadDrives(); loadRewards(); }, [selected]);

	function submitCampaign(e) {
		e.preventDefault();
		const payload = { ...form, points: Number(form.points) || 0 };
		fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			.then(() => { setForm({ title: '', description: '', type: 'awareness', points: 0, start_date: '', end_date: '' }); loadCampaigns(); });
	}
	function givePoints(e) {
		e.preventDefault(); if (!selected) return;
		const payload = { ...award, points: Number(award.points || 0) };
		fetch(`/api/campaigns/${selected}/award`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			.then(() => { setAward({ user_id: '', user_name: '', department_name: '', points: '' }); loadLeaderboard(); });
	}
	function addResource(e) {
		e.preventDefault(); if (!selected) return;
		const payload = { ...resForm, points: Number(resForm.points || 0) };
		fetch(`/api/campaigns/${selected}/education`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			.then(() => { setResForm({ title: '', content_url: '', content_type: 'article', points: 10 }); loadEducation(); });
	}
	function completeResource(e) {
		e.preventDefault(); if (!completeForm.resource_id) return;
		fetch(`/api/campaigns/education/${completeForm.resource_id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: completeForm.user_id, user_name: completeForm.user_name, department_name: completeForm.department_name }) })
			.then(() => { setCompleteForm({ resource_id: '', user_id: '', user_name: '', department_name: '' }); loadLeaderboard(); });
	}
	function createDrive(e) {
		e.preventDefault(); if (!selected) return;
		const payload = { ...driveForm, capacity: driveForm.capacity ? Number(driveForm.capacity) : null, points: Number(driveForm.points || 0) };
		fetch(`/api/campaigns/${selected}/drives`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			.then(() => { setDriveForm({ title: '', description: '', start_date: '', end_date: '', location: '', capacity: '', points: 20 }); loadDrives(); });
	}
	function registerDrive(e) {
		e.preventDefault(); if (!regForm.drive_id) return;
		fetch(`/api/campaigns/drives/${regForm.drive_id}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: regForm.user_id, user_name: regForm.user_name, department_name: regForm.department_name }) })
			.then(() => setRegForm({ drive_id: '', user_id: '', user_name: '', department_name: '' }));
	}
	function attendDrive(e) {
		e.preventDefault(); if (!attendForm.drive_id) return;
		fetch(`/api/campaigns/drives/${attendForm.drive_id}/attend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: attendForm.user_id }) })
			.then(() => setAttendForm({ drive_id: '', user_id: '' }));
	}
	function addReward(e) {
		e.preventDefault();
		const payload = { ...rewardForm, cost_points: Number(rewardForm.cost_points || 0), stock: Number(rewardForm.stock || 0) };
		fetch(`/api/campaigns/${selected}/rewards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			.then(() => { setRewardForm({ title: '', description: '', cost_points: '', stock: '' }); loadRewards(); });
	}
	function redeemReward(e) {
		e.preventDefault(); if (!redeemForm.reward_id) return;
		fetch(`/api/campaigns/rewards/${redeemForm.reward_id}/redeem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: redeemForm.user_id, user_name: redeemForm.user_name, department_name: redeemForm.department_name }) })
			.then(() => setRedeemForm({ reward_id: '', user_id: '', user_name: '', department_name: '' }));
	}
	function checkBalance(e) {
		e.preventDefault();
		if (!balanceUserId) return;
		const path = selected ? `/api/campaigns/${selected}/user/${encodeURIComponent(balanceUserId)}/balance` : `/api/campaigns/user/${encodeURIComponent(balanceUserId)}/balance`;
		fetch(path).then(r => r.json()).then(d => setBalance(d.points ?? 0));
	}

	const selectedCampaign = useMemo(() => campaigns.find(c => String(c.id) === String(selected)), [campaigns, selected]);

	return (
		<div className="grid" style={{ gap: 16 }}>
			<Section title="Create Campaign">
				<form onSubmit={submitCampaign} className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
					<input className="input" placeholder="Title" value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} required />
					<input className="input" placeholder="Description" value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} />
					<select value={form.type} onChange={e => setForm(v => ({ ...v, type: e.target.value }))}>
						{['awareness','challenge'].map(t => <option key={t} value={t}>{t}</option>)}
					</select>
					<div style={{ display: 'flex', flexDirection: 'column' }}>
						<label className="muted" style={{ fontSize: 12 }}>Start Date</label>
						<input className="input" type="date" placeholder="Start Date" title="Start Date" value={form.start_date} onChange={e => setForm(v => ({ ...v, start_date: e.target.value }))} />
					</div>
					<div style={{ display: 'flex', flexDirection: 'column' }}>
						<label className="muted" style={{ fontSize: 12 }}>End Date</label>
						<input className="input" type="date" placeholder="End Date" title="End Date" value={form.end_date} onChange={e => setForm(v => ({ ...v, end_date: e.target.value }))} />
					</div>
					<button className="btn" type="submit">Create</button>
				</form>
				<div style={{ marginTop: 8 }}>
					<table className="table">
						<thead>
							<tr>
								<th>Title</th>
								<th>Type</th>
								<th>Start Date</th>
								<th>End Date</th>
								<th>Description</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{campaigns.map(c => (
								<tr key={c.id}>
									<td>{c.title}</td>
									<td className="mono">{c.type || '—'}</td>
									<td className="mono">{(c.start_date || '').slice(0,10) || '—'}</td>
									<td className="mono">{(c.end_date || '').slice(0,10) || '—'}</td>
									<td>{c.description || '—'}</td>
									<td>
										<button className="btn secondary" onClick={() => { if (confirm('Delete this campaign and all associated data?')) { fetch(`/api/campaigns/${c.id}`, { method: 'DELETE' }).then(() => { setCampaigns(prev => prev.filter(x => x.id !== c.id)); }); } }}>Delete</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Section>

			<Section title="Select Campaign">
				<div className="row" style={{ gap: 8 }}>
					<select value={selected} onChange={e => setSelected(e.target.value)}>
						<option value="">All campaigns</option>
						{campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
					</select>
					{selectedCampaign && <div className="muted">{selectedCampaign.description}</div>}
				</div>
			</Section>

			<Section title="Resources (Awareness & Engagement)">
				<form onSubmit={addResource} className="grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
					<input className="input" placeholder="Title" value={resForm.title} onChange={e => setResForm(v => ({ ...v, title: e.target.value }))} />
					<select value={resForm.content_type} onChange={e => setResForm(v => ({ ...v, content_type: e.target.value }))}>
						{['article','videography','photography','editor','volunteer','quiz','seminar'].map(t => <option key={t} value={t}>{t}</option>)}
					</select>
					<div style={{ display: 'flex', flexDirection: 'column' }}>
						<label className="muted" style={{ fontSize: 12 }}>Points</label>
						<input className="input" type="number" placeholder="Points" value={resForm.points} onChange={e => setResForm(v => ({ ...v, points: e.target.value }))} />
					</div>
					<button className="btn" type="submit" disabled={!selected}>Add Resource</button>
				</form>
				<div style={{ marginTop: 8 }}>
					{resources.length === 0 ? <div className="muted">No resources yet.</div> : (
						<table className="table">
							<thead>
								<tr>
									<th>Title</th>
									<th>Type</th>
									<th>Points</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{resources.map(r => (
									<tr key={r.id}>
										<td>{r.title}</td>
										<td className="mono">{r.content_type}</td>
										<td className="mono">{r.points || 0}</td>
										<td>
											<button className="btn secondary" onClick={() => { if (confirm('Delete this resource?')) { fetch(`/api/campaigns/education/${r.id}`, { method: 'DELETE' }).then(() => setResources(prev => prev.filter(x => x.id !== r.id))); } }}>Delete</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
				<form onSubmit={completeResource} className="row wrap" style={{ marginTop: 8, gap: 8 }}>
					<select value={completeForm.resource_id} onChange={e => setCompleteForm(v => ({ ...v, resource_id: e.target.value }))}>
						<option value="">Select resource to complete</option>
						{resources.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
					</select>
					<input className="input" placeholder="User ID" value={completeForm.user_id} onChange={e => setCompleteForm(v => ({ ...v, user_id: e.target.value }))} />
					<input className="input" placeholder="User Name" value={completeForm.user_name} onChange={e => setCompleteForm(v => ({ ...v, user_name: e.target.value }))} />
					<input className="input" placeholder="Department" value={completeForm.department_name} onChange={e => setCompleteForm(v => ({ ...v, department_name: e.target.value }))} />
					<button className="btn" type="submit">Mark Completed & Award</button>
				</form>
			</Section>

			<Section title="Collection Drives">
				<form onSubmit={createDrive} className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
					<input className="input" placeholder="Title" value={driveForm.title} onChange={e => setDriveForm(v => ({ ...v, title: e.target.value }))} />
					<input className="input" placeholder="Location" value={driveForm.location} onChange={e => setDriveForm(v => ({ ...v, location: e.target.value }))} />
					<input className="input" placeholder="Capacity" value={driveForm.capacity} onChange={e => setDriveForm(v => ({ ...v, capacity: e.target.value }))} />
					<input className="input" type="date" value={driveForm.start_date} onChange={e => setDriveForm(v => ({ ...v, start_date: e.target.value }))} />
					<input className="input" type="date" value={driveForm.end_date} onChange={e => setDriveForm(v => ({ ...v, end_date: e.target.value }))} />
					<input className="input" type="number" placeholder="Points" value={driveForm.points} onChange={e => setDriveForm(v => ({ ...v, points: e.target.value }))} />
					<button className="btn" type="submit" disabled={!selected}>Create Drive</button>
				</form>
				<div style={{ marginTop: 8 }}>
					{drives.length === 0 ? <div className="muted">No drives yet.</div> : (
						<table className="table">
							<thead>
								<tr>
									<th>Drive</th><th>Dates</th><th>Location</th><th>Points</th>
								</tr>
							</thead>
							<tbody>
								{drives.map(d => (
									<tr key={d.id}>
										<td>{d.title}</td>
										<td className="mono">{d.start_date || '—'} → {d.end_date || '—'}</td>
										<td>{d.location || '—'}</td>
										<td className="mono">{d.points || 0}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
				<form onSubmit={registerDrive} className="row wrap" style={{ marginTop: 8, gap: 8 }}>
					<select value={regForm.drive_id} onChange={e => setRegForm(v => ({ ...v, drive_id: e.target.value }))}>
						<option value="">Select drive</option>
						{drives.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
					</select>
					<input className="input" placeholder="User ID" value={regForm.user_id} onChange={e => setRegForm(v => ({ ...v, user_id: e.target.value }))} />
					<input className="input" placeholder="User Name" value={regForm.user_name} onChange={e => setRegForm(v => ({ ...v, user_name: e.target.value }))} />
					<input className="input" placeholder="Department" value={regForm.department_name} onChange={e => setRegForm(v => ({ ...v, department_name: e.target.value }))} />
					<button className="btn" type="submit">Register</button>
				</form>
				<form onSubmit={attendDrive} className="row wrap" style={{ marginTop: 8, gap: 8 }}>
					<select value={attendForm.drive_id} onChange={e => setAttendForm(v => ({ ...v, drive_id: e.target.value }))}>
						<option value="">Select drive</option>
						{drives.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
					</select>
					<input className="input" placeholder="User ID" value={attendForm.user_id} onChange={e => setAttendForm(v => ({ ...v, user_id: e.target.value }))} />
					<button className="btn" type="submit">Mark Attendance & Award</button>
				</form>
			</Section>

			<Section title="Rewards Store (incentives)">
				<form onSubmit={addReward} className="row wrap" style={{ gap: 8 }}>
					<input className="input" placeholder="Reward Title" value={rewardForm.title} onChange={e => setRewardForm(v => ({ ...v, title: e.target.value }))} />
					<input className="input" placeholder="Description" value={rewardForm.description} onChange={e => setRewardForm(v => ({ ...v, description: e.target.value }))} />
					<input className="input" type="number" placeholder="Cost points" value={rewardForm.cost_points} onChange={e => setRewardForm(v => ({ ...v, cost_points: e.target.value }))} />
					<input className="input" type="number" placeholder="Stock" value={rewardForm.stock} onChange={e => setRewardForm(v => ({ ...v, stock: e.target.value }))} />
					<button className="btn" type="submit">Add Reward</button>
				</form>
				<div style={{ marginTop: 8 }}>
					{rewards.length === 0 ? <div className="muted">No rewards yet.</div> : (
						<table className="table">
							<thead>
								<tr>
									<th>Title</th>
									<th>Cost</th>
									<th>Stock</th>
									<th>Description</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{rewards.map(r => (
									<tr key={r.id}>
										<td>{r.title}</td>
										<td className="mono">{r.cost_points} pts</td>
										<td className="mono">{r.stock}</td>
										<td className="muted">{r.description}</td>
										<td>
											<button className="btn secondary" onClick={() => { if (confirm('Delete this reward?')) { fetch(`/api/campaigns/rewards/${r.id}`, { method: 'DELETE' }).then(() => loadRewards()); } }}>Delete</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
				<form onSubmit={redeemReward} className="row wrap" style={{ marginTop: 8, gap: 8 }}>
					<select value={redeemForm.reward_id} onChange={e => setRedeemForm(v => ({ ...v, reward_id: e.target.value }))}>
						<option value="">Select reward</option>
						{rewards.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
					</select>
					<input className="input" placeholder="User ID" value={redeemForm.user_id} onChange={e => setRedeemForm(v => ({ ...v, user_id: e.target.value }))} />
					<input className="input" placeholder="User Name" value={redeemForm.user_name} onChange={e => setRedeemForm(v => ({ ...v, user_name: e.target.value }))} />
					<input className="input" placeholder="Department" value={redeemForm.department_name} onChange={e => setRedeemForm(v => ({ ...v, department_name: e.target.value }))} />
					<button className="btn" type="submit">Redeem</button>
				</form>
			</Section>

			<Section title="Student Balance">
				<form onSubmit={checkBalance} className="row wrap" style={{ gap: 8 }}>
					<input className="input" placeholder="Enter Student ID" value={balanceUserId} onChange={e => setBalanceUserId(e.target.value)} />
					<button className="btn" type="submit">Check Balance</button>
					{balance != null && <div className="mono">Points: {balance}</div>}
				</form>
			</Section>

			<Section title="Green Scoreboard (Leaderboard)">
				<table className="table">
					<thead>
						<tr>
							<th>User</th>
							<th>User ID</th>
							<th>Dept</th>
							<th>Points</th>
						</tr>
					</thead>
					<tbody>
						{leaderboard.map(e => (
							<tr key={e.user_id}>
								<td>{e.user_name || e.user_id}</td>
								<td className="mono">{e.user_id}</td>
								<td className="mono">{e.department_name || '—'}</td>
								<td className="mono">{e.points}</td>
							</tr>
						))}
					</tbody>
				</table>
			</Section>
		</div>
	);
}