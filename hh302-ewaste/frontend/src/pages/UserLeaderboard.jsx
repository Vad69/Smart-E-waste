import React, { useEffect, useState } from 'react';
import { authUserFetch } from '../userAuth';

export default function UserLeaderboard() {
	const [rows, setRows] = useState([]);
	useEffect(() => {
		authUserFetch('/api/user/leaderboard').then(r => r.json()).then(d => setRows(d.leaderboard || [])).catch(() => {});
	}, []);
	return (
		<div className="card">
			<h3>Leaderboard</h3>
			<table className="table">
				<thead>
					<tr>
						<th>User</th>
						<th>User ID</th>
						<th>Dept</th>
						<th>Redeemed</th>
						<th>Points</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(e => (
						<tr key={e.user_id}>
							<td>{e.user_name || e.user_id}</td>
							<td className="mono">{e.user_id}</td>
							<td className="mono">{e.department_name || '—'}</td>
							<td className="mono">{e.redeemed_points || 0}</td>
							<td className="mono">{e.points}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}