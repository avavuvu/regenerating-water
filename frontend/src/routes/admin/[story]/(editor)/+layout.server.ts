import { error } from '@sveltejs/kit'
import { isStoryName } from '$lib/content'
import { getScript, listAssets, liveManifest } from '$lib/server/content'
import { contentStore } from '$lib/server/store'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ params, fetch }) => {
	if (!isStoryName(params.story)) error(404, 'This story does not exist.')

	const [script, manifest] = await Promise.all([getScript(params.story), liveManifest(fetch)])
	const live = manifest.stories[params.story] ?? null
	if (!script && !live) error(404, 'This story does not exist.')


	return {
		story: params.story,
		script,
		assets: script ? await listAssets(params.story) : [],
		live,
		storeKind: contentStore().kind
	}
}
