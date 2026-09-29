import { parseYarn } from './yarn/parse'
import { screen, start, step, type Functions, type ScreenItem, type State } from './yarn/interpreter'
import { createPresentation, publishedAssets, type StoryAssets } from './presentation.svelte'

export type Dialogue = ReturnType<typeof createDialogue>

export interface TranscriptEntry {
	id: string
	item: ScreenItem
}

export interface DialogueOptions {
	assets?: StoryAssets
	saved?: State | null
	onSave?: (state: State) => void
}

export function createDialogue(story: string, source: string, options: DialogueOptions = {}) {
	const program = parseYarn(source)
	const functions: Functions = {}
	const presentation = createPresentation(options.assets ?? publishedAssets(story))

	function present(from: State, previousNode: string | null): State {
		let s = from
		let node = previousNode
		for (;;) {
			if (s.node !== node) {
				presentation.beginNode()
				node = s.node
			}
			const sc = screen(program, s, functions)
			let blocking = false
			for (const item of sc.items) {
				if (item.kind === 'command' && presentation.handleCommand(item.command)) blocking = true
			}
			const hasLines = sc.items.some((i) => i.kind === 'line')
			if (hasLines || blocking || sc.ending.kind !== 'continue') return s
			s = step(program, sc.state, functions)
		}
	}

	function entriesFor(s: State): TranscriptEntry[] {
		const prefix = `${s.node}/${s.path?.join('.') ?? 'end'}`
		return screen(program, s, functions).items.map((item, i) => ({ id: `${prefix}/${i}`, item }))
	}

	function isValidSave(saved: State | null | undefined): saved is State {
		return (
			!!saved &&
			typeof saved.node === 'string' &&
			!!program.nodes[saved.node] &&
			Array.isArray(saved.path) &&
			typeof saved.variables === 'object' &&
			typeof saved.visited === 'object'
		)
	}

	function initialise(): { entry: State; shown: State } {
		if (isValidSave(options.saved)) {
			try {
				return { entry: options.saved, shown: present(options.saved, null) }
			} catch {}
		}
		const fresh = present(start(program, 'Start', functions), null)
		return { entry: fresh, shown: fresh }
	}

	const initial = initialise()

	let state = $state.raw(initial.shown)

	let transcript = $state.raw(entriesFor(initial.shown))

	const current = $derived(screen(program, state, functions))

	function show(next: State, keep: boolean) {
		const entries = entriesFor(next)
		transcript = keep && next.node === state.node ? [...transcript, ...entries] : entries
		state = next
	}

	// a node whose only content is a recording is a transition, not a place
	function isRecordingNode(node: string): boolean {
		if (!program.nodes[node]) return false
		const body = program.nodes[node].body
		return body.some((s) => s.type === 'command' && s.text[0]?.type === 'text' && s.text[0].text.startsWith('recording')) &&
			!body.some((s) => s.type === 'line')
	}

	// entry states of nodes already visited (past) and undone (future)
	let past = $state.raw<State[]>([])
	let future = $state.raw<State[]>([])
	let nodeEntry: State = initial.entry

	function enter(entry: State) {
		nodeEntry = entry
		if (!isRecordingNode(entry.node)) options.onSave?.(entry)
	}

	function restore(target: State) {
		show(present(target, null), false)
		enter(target)
	}


	function back() {
		const index = past.findLastIndex((s) => !isRecordingNode(s.node))
		if (index === -1) return
		const target = past[index]
		future = [nodeEntry, ...past.slice(index + 1).reverse(), ...future]
		past = past.slice(0, index)
		restore(target)
	}

	function forward() {
		const index = future.findIndex((s) => !isRecordingNode(s.node))
		if (index === -1) return
		const target = future[index]
		past = [...past, nodeEntry, ...future.slice(0, index)]
		future = future.slice(index + 1)
		restore(target)
	}

	return {
		story,
		get state() {
			return state
		},
		get scene() {
			return state.node
		},
		get headers() {
			return program.nodes[state.node].headers
		},
		hasScene(scene: string) {
			return !!program.nodes[scene]
		},
		isRecordingScene(scene: string) {
			return isRecordingNode(scene)
		},
		get screen() {
			return current
		},
		get presentation() {
			return presentation.state
		},
		get transcript() {
			return transcript
		},
		get waiting() {
			return presentation.state.recording !== null && !presentation.state.recording.finished
		},
		finishRecording() {
			presentation.finishRecording()
		},
		get canGoBack() {
			return past.some((s) => !isRecordingNode(s.node))
		},
		get canGoForward() {
			return future.some((s) => !isRecordingNode(s.node))
		},
		back,
		forward,
		advance(choice?: number) {
			const next = present(step(program, current.state, functions, choice), state.node)
			if (next.node !== state.node) {
				past = [...past, nodeEntry]
				future = []
				enter(next)
			}
			show(next, true)
		},
		jump(scene: string) {
			const next = present(start(program, scene, functions, state.variables), null)
			if (next.node !== state.node) {
				past = [...past, nodeEntry]
				future = []
			}
			enter(next)
			show(next, false)
		},
		restore(saved: State) {
			past = []
			future = []
			restore(saved)
		}
	}
}
