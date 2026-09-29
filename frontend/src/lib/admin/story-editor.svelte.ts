import { getContext, setContext } from 'svelte'
import { invalidate } from '$app/navigation'
import type { AssetInfo } from '$lib/content'
import { analyseStory } from '$lib/yarn/validate'
import { ApiError, api, errorMessage } from './api'

export interface Focus {
	line: number
	node: string | null
}

export interface StoryEditorInit {
	story: string
	text: string
	etag: string | null
	assets: AssetInfo[]
}

function usersOf(nodes: ReturnType<typeof analyseStory>['nodes'], command: string): Map<string, string[]> {
	const map = new Map<string, string[]>()
	for (const node of nodes) {
		for (const use of node.commands) {
			const name = use.args[0]
			if (use.name !== command || !name) continue
			map.set(name, [...new Set([...(map.get(name) ?? []), node.title])])
		}
	}
	return map
}

export function createStoryEditor(init: StoryEditorInit) {
	const story = init.story
	let text = $state(init.text)
	let savedText = $state(init.text)
	let etag = $state(init.etag)
	let assets = $state<AssetInfo[]>(init.assets)
	let saving = $state(false)
	let saveError = $state('')
	let conflict = $state(false)

	let focus = $state<Focus | null>(null)

	const dirty = $derived(text !== savedText)
	const known = $derived({
		audio: assets.filter((a) => a.kind === 'audio').map((a) => a.name),
		images: assets.filter((a) => a.kind === 'images').map((a) => a.name)
	})
	const analysis = $derived(analyseStory(text, known))
	const errors = $derived(analysis.diagnostics.filter((d) => d.severity === 'error').length)
	const audioUsers = $derived(usersOf(analysis.nodes, 'recording'))
	const imageUsers = $derived(usersOf(analysis.nodes, 'flash'))


	async function save(force = false) {
		if (saving) return
		saving = true
		saveError = ''
		const sending = text
		try {
			const result = await api<{ etag: string | null }>(`/admin/api/stories/${story}/script`, {
				method: 'PUT',
				headers: {
					'content-type': 'text/plain; charset=utf-8',
					...(etag && !force ? { 'if-match': etag } : {})
				},
				body: sending
			})
			etag = result.etag
			savedText = sending
			conflict = false
			invalidate('admin:build')
		} catch (error) {
			if (error instanceof ApiError && error.status === 409) conflict = true
			saveError = errorMessage(error)
		} finally {
			saving = false
		}
	}

	async function loadSaved() {
		if (dirty && !confirm('Your unsaved changes will be lost. Continue?')) return
		try {
			const script = await api<{ text: string; etag: string | null }>(`/admin/api/stories/${story}/script`)
			text = script.text
			savedText = script.text
			etag = script.etag
			conflict = false
			saveError = ''
		} catch (error) {
			saveError = errorMessage(error)
		}
	}

	return {
		story,
		get text() {
			return text
		},
		set text(value: string) {
			text = value
		},
		get assets() {
			return assets
		},
		set assets(value: AssetInfo[]) {
			assets = value
			invalidate('admin:build')
		},
		get focus() {
			return focus
		},
		set focus(value: Focus | null) {
			focus = value
		},

		get dirty() {
			return dirty
		},
		get saving() {
			return saving
		},
		get saveError() {
			return saveError
		},
		get conflict() {
			return conflict
		},
		get known() {
			return known
		},
		get analysis() {
			return analysis
		},
		get errors() {
			return errors
		},
		get audioUsers() {
			return audioUsers
		},
		get imageUsers() {
			return imageUsers
		},

		save,
		loadSaved
	}
}

export type StoryEditor = ReturnType<typeof createStoryEditor>

const KEY = Symbol('story-editor')

export function setStoryEditor(editor: StoryEditor): StoryEditor {
	return setContext(KEY, editor)
}

export function getStoryEditor(): StoryEditor {
	const editor = getContext<StoryEditor | undefined>(KEY)
	if (!editor) throw new Error('getStoryEditor() needs the story editor layout')
	return editor
}
