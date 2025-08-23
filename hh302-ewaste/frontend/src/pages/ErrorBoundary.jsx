import React from 'react';

export default class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error) {
		return { hasError: true, error };
	}

	componentDidCatch(error, info) {
		console.error('ErrorBoundary caught an error', error, info);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{ padding: 24 }}>
					<h2>Something went wrong.</h2>
					<pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error)}</pre>
					<button className="btn" onClick={() => this.setState({ hasError: false, error: null })}>Try Again</button>
				</div>
			);
		}
		return this.props.children;
	}
}