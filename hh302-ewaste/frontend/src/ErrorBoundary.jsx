import React from 'react';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';

export default function ErrorBoundary() {
	const error = useRouteError();
	let title = 'Something went wrong';
	let message = 'An unexpected error occurred. Please try again.';
	let details = '';

	if (isRouteErrorResponse(error)) {
		title = `${error.status} ${error.statusText}`;
		message = error.data?.message || message;
		details = typeof error.data === 'string' ? error.data : '';
	} else if (error instanceof Error) {
		message = error.message || message;
		details = error.stack || '';
	}

	return (
		<div className="grid" style={{ gap: 16 }}>
			<div className="card" style={{ borderColor: '#ef4444' }}>
				<h2 style={{ marginTop: 0 }}>⚠️ {title}</h2>
				<p className="muted" style={{ margin: '8px 0' }}>{message}</p>
				<div className="row" style={{ gap: 8 }}>
					<button className="btn" onClick={() => window.location.reload()}>Reload</button>
					<Link className="btn secondary" to="/">Go to Dashboard</Link>
				</div>
				{details && (
					<pre style={{ marginTop: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
						{details}
					</pre>
				)}
			</div>
		</div>
	);
}