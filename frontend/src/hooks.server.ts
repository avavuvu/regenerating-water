import { json, redirect, type Handle } from '@sveltejs/kit'
import { hasSession } from '$lib/server/auth'

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login'])

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url
	const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')

	if (isAdmin && !PUBLIC_ADMIN_PATHS.has(pathname) && !(await hasSession(event.cookies))) {
		if (pathname.startsWith('/admin/api/')) {
			return json({ message: 'Please log in again.' }, { status: 401 })
		}
		redirect(303, '/admin/login')
	}

	const response = await resolve(event)
	if (isAdmin) {
		response.headers.set('cache-control', 'no-store')
		response.headers.set('x-robots-tag', 'noindex')
	}
	return response
}
