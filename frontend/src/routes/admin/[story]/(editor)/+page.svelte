<script lang="ts">
	import { untrack } from 'svelte'
	import NodeList from '@/admin/NodeList.svelte'
	import Preview from '@/admin/Preview.svelte'
	import YarnEditor from '@/admin/YarnEditor.svelte'
	import { getStoryEditor } from '$lib/admin/story-editor.svelte'

	const editor = getStoryEditor()

	let cursorLine = $state(1)
	let code = $state<ReturnType<typeof YarnEditor>>()
	let preview = $state<ReturnType<typeof Preview>>()

	const currentNode = $derived(
		editor.analysis.nodes.find((n) => cursorLine >= n.line && cursorLine <= n.bodyEnd + 1)?.title ?? null
	)

	$effect(() => {
		const focus = editor.focus
		if (!focus || !code) return
		untrack(() => {
			code?.reveal(focus.line)
			if (focus.node) preview?.show(focus.node)
			editor.focus = null
		})
	})
</script>

<div class="panes">
	<aside class="side panel">
		<NodeList
			nodes={editor.analysis.nodes}
			diagnostics={editor.analysis.diagnostics}
			current={currentNode}
			onselect={(node) => (editor.focus = { line: node.line, node: node.title })}
			onproblem={(diagnostic) => (editor.focus = { line: diagnostic.line, node: null })}
		/>
	</aside>
	<section class="code panel">
		<YarnEditor
			bind:this={code}
			bind:value={editor.text}
			assets={() => editor.known}
			onsave={() => editor.save()}
			oncursor={(line) => (cursorLine = line)}
		/>
	</section>
	<aside class="phone panel">
		<Preview bind:this={preview} story={editor.story} source={editor.text} />
	</aside>
</div>

<style>
	.panes {
		display: grid;
		grid-template-columns: minmax(18ch, 26ch) minmax(0, 1fr) minmax(300px, 420px);
		min-height: 0;

		& > * {
			min-height: 0;
			border-width: 0 1px 0 0;
		}
	}

	@media (max-width: 1100px) {
		.panes {
			grid-template-columns: minmax(16ch, 22ch) minmax(0, 1fr);

			& .phone {
				display: none;
			}
		}
	}
</style>
