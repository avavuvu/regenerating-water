import { json } from '@sveltejs/kit'
import { STARTER_SCRIPT } from '$lib/content'
import { respond, readJson } from '$lib/server/api'
import { createStory } from '$lib/server/content'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = ({ request }) =>
	respond(async () => {
		const { name } = await readJson<{ name?: string }>(request)
		const story = String(name ?? '').trim().toLowerCase()
		await createStory(story, STARTER_SCRIPT)
		return json({ story }, { status: 201 })
	})
