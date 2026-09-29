import { json } from '@sveltejs/kit'
import { respond } from '$lib/server/api'
import { listAssets } from '$lib/server/content'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = ({ params }) => respond(async () => json(await listAssets(params.story)))
