import { createDialogue, type Dialogue } from './dialogue.svelte'

// every .yarn file in yarnspinner/data is a story, keyed by file name
const sources = import.meta.glob('../../../yarnspinner/data/*.yarn', {
	query: '?raw',
	import: 'default'
}) as Record<string, () => Promise<string>>

const dialogues = new Map<string, Dialogue>()

export function storyNames(): string[] {
	return Object.keys(sources).map((path) => path.replace(/^.*\//, '').replace(/\.yarn$/, ''))
}

export async function getDialogue(story: string): Promise<Dialogue | null> {
	const cached = dialogues.get(story)
	if (cached) return cached

	const load = sources[`../../../yarnspinner/data/${story}.yarn`]
	if (!load) return null

	const dialogue = createDialogue(story, await load())
	dialogues.set(story, dialogue)
	return dialogue
}
