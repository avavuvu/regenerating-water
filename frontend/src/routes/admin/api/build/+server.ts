import { json } from '@sveltejs/kit'
import { respond } from '$lib/server/api'
import { buildSite } from '$lib/server/content'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = () => respond(async () => json(await buildSite()))
