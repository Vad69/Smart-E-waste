export function authUserFetch(input, init = {}) {
	const token = typeof window !== 'undefined' ? localStorage.getItem('auth_user_token') : null;
	const headers = new Headers(init.headers || {});
	if (token) headers.set('Authorization', `Bearer ${token}`);
	return fetch(input, { ...init, headers });
}