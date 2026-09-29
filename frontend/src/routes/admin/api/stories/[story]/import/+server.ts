import { json } from '@sveltejs/kit'
import { readJson, respond } from '$lib/server/api'
import { importLiveFile, liveManifest } from '$lib/server/content'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = ({ params, request, fetch }) =>
	respond(async () => {
		const { path } = await readJson<{ path?: string }>(request)
		await importLiveFile(fetch, await liveManifest(fetch), params.story, String(path ?? ''))
		return json({ imported: path })
	})
