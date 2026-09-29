import { error } from '@sveltejs/kit'
import { isStoryName } from '$lib/content'
import { getScript } from '$lib/server/content'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	if (!isStoryName(params.story)) error(404, 'This story does not exist.')
	const script = await getScript(params.story)
	return { story: params.story, source: script?.text ?? '' }
}
