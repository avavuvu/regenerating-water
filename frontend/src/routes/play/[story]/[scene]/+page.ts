import { error } from '@sveltejs/kit'
import { getDialogue } from '$lib/stories'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
	const dialogue = await getDialogue(params.story)
	if (!dialogue) error(404, `story "${params.story}" does not exist`)

	if (dialogue.scene !== params.scene) {
		try {
			dialogue.jump(params.scene)
		} catch {
			error(404, `scene "${params.scene}" does not exist in "${params.story}"`)
		}
	}

	return { dialogue }
}
