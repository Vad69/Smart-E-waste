import React, { useEffect, useState } from 'react';

export default function Campaigns() {
	const [campaigns, setCampaigns] = useState([]);
	const [leaderboard, setLeaderboard] = useState([]);
	const [selected, setSelected] = useState('');
	const [form, setForm] = useState({ title: '', description: '' });
	const [award, setAward] = useState({ user_id: '', user_name: '', points: '' });

	function load() {
		fetch('/api/campaigns').then(r => r.json()).then(d => setCampaigns(d.campaigns));
		fetch('/api/campaigns/scoreboard/all').then(r => r.json()).then(d => setLeaderboard(d.leaderboard));
	}
	useEffect(() => { load(); }, []);
	useEffect(() => {
		if (selected) fetch(`/api/campaigns/${selected}/scores`).then(r => r.json()).then(d => setLeaderboard(d.leaderboard));
	}, [selected]);

	function submit(e) {
		e.preventDefault();
		fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
			.then(r => r.json()).then(() => { setForm({ title: '', description: '' }); load(); });
	}

	function givePoints(e) {
		e.preventDefault();
		if (!selected) return;
		const payload = { ...award, points: Number(award.points) };
		fetch(`/api/campaigns/${selected}/award`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
			.then(r => r.json()).then(() => { setAward({ user_id: '', user_name: '', points: '' }); load(); });
	}

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card">
				<h3>Create Campaign</h3>
				<form onSubmit={submit} className="row wrap">
					<input className="input" placeholder="Title" value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} required />
					<input className="input" placeholder="Description" value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} />
					<button className="btn" type="submit">Create</button>
				</form>
			</div>

			<div className="card">
				<h3>Award Points</h3>
				<form onSubmit={givePoints} className="row wrap">
					<select value={selected} onChange={e => setSelected(e.target.value)}>
						<option value="">Select campaign</option>
						{campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
					</select>
					<input className="input" placeholder="User ID" value={award.user_id} onChange={e => setAward(v => ({ ...v, user_id: e.target.value }))} />
					<input className="input" placeholder="User Name" value={award.user_name} onChange={e => setAward(v => ({ ...v, user_name: e.target.value }))} />
					<input className="input" placeholder="Points" value={award.points} onChange={e => setAward(v => ({ ...v, points: e.target.value }))} />
					<button className="btn" type="submit" disabled={!selected}>Award</button>
				</form>
			</div>

			<div className="card">
				<h3>Leaderboard</h3>
				<table className="table">
					<thead>
						<tr>
							<th>User</th>
							<th>Points</th>
						</tr>
					</thead>
					<tbody>
						{leaderboard.map(e => (
							<tr key={e.user_id}>
								<td>{e.user_name || e.user_id}</td>
								<td className="mono">{e.points}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}