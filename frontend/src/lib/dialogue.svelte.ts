import { parseYarn } from './yarn/parse'
import { screen, start, step, type Functions, type ScreenItem, type State } from './yarn/interpreter'
import { createPresentation } from './presentation.svelte'

export type Dialogue = ReturnType<typeof createDialogue>

export interface TranscriptEntry {
	id: string
	item: ScreenItem
}

export function createDialogue(story: string, source: string) {
	const program = parseYarn(source)
	const functions: Functions = {}
	const presentation = createPresentation(story)

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

	let state = $state.raw(present(start(program, 'Start', functions), null))

	let transcript = $state.raw(entriesFor(state))

	const current = $derived(screen(program, state, functions))

	function show(next: State, keep: boolean) {
		const entries = entriesFor(next)
		transcript = keep && next.node === state.node ? [...transcript, ...entries] : entries
		state = next
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
		advance(choice?: number) {
			show(present(step(program, current.state, functions, choice), state.node), true)
		},
		jump(scene: string) {
			show(present(start(program, scene, functions, state.variables), null), false)
		},
		restore(saved: State) {
			show(present(saved, null), false)
		}
	}
}
