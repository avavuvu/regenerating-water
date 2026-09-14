import { error, redirect } from '@sveltejs/kit'
import { resolve } from '$app/paths'
import { getDialogue } from '$lib/stories'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
	const dialogue = await getDialogue(params.story)
	if (!dialogue) error(404, `story "${params.story}" does not exist`)

	redirect(307, resolve('/play/[story]/[scene]', { story: params.story, scene: dialogue.scene }))
}
