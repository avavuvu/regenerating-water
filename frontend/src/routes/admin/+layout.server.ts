import { hasSession } from '$lib/server/auth'
import { buildStatus } from '$lib/server/content'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ cookies, fetch, depends }) => {
	depends('admin:build')
	if (!(await hasSession(cookies))) return { build: null }
	return { build: await buildStatus(fetch) }
}
