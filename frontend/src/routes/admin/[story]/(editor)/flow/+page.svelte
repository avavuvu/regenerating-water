<script lang="ts">
	import { goto } from '$app/navigation'
	import FlowGraph from '@/admin/FlowGraph.svelte'
	import { getStoryEditor } from '$lib/admin/story-editor.svelte'
	import type { OutlineNode } from '$lib/yarn/validate'

	const editor = getStoryEditor()

	function open(node: OutlineNode) {
		editor.focus = { line: node.line, node: node.title }
		goto(`/admin/${editor.story}`)
	}
</script>

<section class="flow">
	<FlowGraph nodes={editor.analysis.nodes} diagnostics={editor.analysis.diagnostics} onselect={open} />
</section>

<style>
	.flow {
		min-height: 0;
		padding: 0.75rem 2ch;
	}
</style>
