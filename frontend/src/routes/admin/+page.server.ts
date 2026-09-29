import { draftStoryNames, liveManifest } from '$lib/server/content'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch }) => {
	const [drafts, live] = await Promise.all([draftStoryNames(), liveManifest(fetch)])
	const names = [...new Set([...drafts, ...Object.keys(live.stories)])].sort()

	return {
		stories: names.map((name) => ({
			name,
			draft: drafts.includes(name),
			live: name in live.stories
		}))
	}
}
