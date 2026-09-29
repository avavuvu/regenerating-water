import { hasProgress, storyNames } from '$lib/stories'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch }) => {
	const names = await storyNames(fetch)
	return { stories: names.map((name) => ({ name, started: hasProgress(name) })) }
}
