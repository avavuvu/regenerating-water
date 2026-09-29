import { isStoryName, type LiveManifest } from './content'
import { createDialogue, type Dialogue } from './dialogue.svelte'
import type { State } from './yarn/interpreter'

type Fetch = typeof fetch

const dialogues = new Map<string, Promise<Dialogue | null>>()

function progressKey(story: string): string {
	return `river-walk:progress:${story}`
}

export async function storyNames(fetchFn: Fetch = fetch): Promise<string[]> {
	try {
		const response = await fetchFn('/stories/index.json', { cache: 'no-cache' })
		if (!response.ok) return []
		const manifest = (await response.json()) as LiveManifest
		return Object.keys(manifest.stories).sort()
	} catch {
		return []
	}
}

export function loadProgress(story: string): State | null {
	try {
		const raw = localStorage.getItem(progressKey(story))
		return raw ? (JSON.parse(raw) as State) : null
	} catch {
		return null
	}
}

function saveProgress(story: string, state: State) {
	try {
		localStorage.setItem(progressKey(story), JSON.stringify(state))
	} catch {}
}

export function hasProgress(story: string): boolean {
	const saved = loadProgress(story)
	return !!saved && saved.node !== 'Start'
}

export function resetStory(story: string) {
	dialogues.delete(story)
	try {
		localStorage.removeItem(progressKey(story))
	} catch {}
}

async function createStory(story: string, fetchFn: Fetch): Promise<Dialogue | null> {
	const response = await fetchFn(`/stories/${encodeURIComponent(story)}/story.yarn`, { cache: 'no-cache' })
	if (response.status === 404) return null
	if (!response.ok) throw new Error(`the story "${story}" did not load (${response.status})`)
	return createDialogue(story, await response.text(), {
		saved: loadProgress(story),
		onSave: (state) => saveProgress(story, state)
	})
}

export function getDialogue(story: string, fetchFn: Fetch = fetch): Promise<Dialogue | null> {
	if (!isStoryName(story)) return Promise.resolve(null)
	let dialogue = dialogues.get(story)
	if (!dialogue) {
		dialogue = createStory(story, fetchFn)
		dialogues.set(story, dialogue)
		dialogue.catch(() => dialogues.delete(story))
	}
	return dialogue
}
