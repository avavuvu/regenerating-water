<script lang="ts">
	import CodeMirror from 'svelte-codemirror-editor'
	import { EditorSelection } from '@codemirror/state'
	import { EditorView, type KeyBinding } from '@codemirror/view'
	import { yarn, yarnHighlighter, yarnTools } from '$lib/admin/yarn'
	import '$lib/admin/yarn/editor.css'
	import type { KnownAssets } from '$lib/yarn/validate'

	let {
		value = $bindable(),
		assets,
		onsave,
		oncursor
	}: {
		value: string
		assets: () => KnownAssets
		onsave: () => void
		oncursor?: (line: number) => void
	} = $props()

	let view: EditorView | undefined

	const lang = yarn(() => assets())
	const extensions = [
		...yarnTools(() => assets()),
		EditorView.updateListener.of((update) => {
			if (update.selectionSet || update.docChanged) {
				oncursor?.(update.state.doc.lineAt(update.state.selection.main.head).number)
			}
		})
	]
	const keybindings: KeyBinding[] = [
		{
			key: 'Mod-s',
			preventDefault: true,
			run: () => {
				onsave()
				return true
			}
		}
	]

	export function reveal(line: number) {
		if (!view) return
		const target = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines))
		view.dispatch({
			selection: EditorSelection.cursor(target.from),
			effects: EditorView.scrollIntoView(target.from, { y: 'start', yMargin: 48 })
		})
		view.focus()
	}
</script>

<CodeMirror
	bind:value
	{lang}
	{extensions}
	{keybindings}
	class="yarn-editor"
	tabSize={4}
	lineWrapping
	nodebounce
	syntaxHighlighting={{ highlighter: yarnHighlighter, fallback: false }}
	onready={(editorView) => (view = editorView)}
/>
