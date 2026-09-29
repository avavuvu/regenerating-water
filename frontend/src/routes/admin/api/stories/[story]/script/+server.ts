import { json } from '@sveltejs/kit'
import { respond } from '$lib/server/api'
import { ContentError, getScript, saveScript } from '$lib/server/content'
import type { RequestHandler } from './$types'

const MAX_SCRIPT_BYTES = 1024 * 1024

export const GET: RequestHandler = ({ params }) =>
	respond(async () => {
		const script = await getScript(params.story)
		if (!script) throw new ContentError('This story has no script yet.', 404)
		return json(script)
	})

export const PUT: RequestHandler = ({ params, request }) =>
	respond(async () => {
		const text = await request.text()
		if (text.length > MAX_SCRIPT_BYTES) throw new ContentError('The script is too large.', 413)
		const script = await saveScript(params.story, text, request.headers.get('if-match'))
		return json({ etag: script.etag, updated: script.updated })
	})
