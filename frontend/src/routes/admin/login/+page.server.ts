import { fail, redirect } from '@sveltejs/kit'
import { checkPassword, hasSession, isConfigured, startSession } from '$lib/server/auth'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ cookies }) => {
	if (await hasSession(cookies)) redirect(303, '/admin')
	return { configured: isConfigured() }
}

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData()
		const password = String(data.get('password') ?? '')
		if (!(await checkPassword(password))) {
			await new Promise((resolve) => setTimeout(resolve, 750))
			return fail(401, { message: 'The password is not correct.' })
		}
		await startSession(cookies, url.protocol === 'https:')
		redirect(303, '/admin')
	}
}
