<script lang="ts">
	import { untrack } from 'svelte'
	import Game from '@/Game.svelte'
	import { createDialogue, type Dialogue } from '$lib/dialogue.svelte'
	import { player } from '$lib/player.svelte'
	import type { StoryAssets } from '$lib/presentation.svelte'
	import type { PageProps } from './$types'

	const { data }: PageProps = $props()

	let dialogue = $state.raw<Dialogue | null>(null)
	let problem = $state<string | null>(null)

	function assets(story: string): StoryAssets {
		return {
			audio: (name) => `/admin/api/stories/${story}/assets/audio/${name}`,
			image: (name) => `/admin/api/stories/${story}/assets/images/${name}`
		}
	}

	function tell(message: Record<string, unknown>) {
		if (window.parent !== window) window.parent.postMessage(message, location.origin)
	}

	function load(source: string, node?: string) {
		const scene = node ?? dialogue?.scene
		player.stop()
		try {
			const next = createDialogue(data.story, source, { assets: assets(data.story) })
			if (scene && scene !== next.scene && next.hasScene(scene)) next.jump(scene)
			dialogue = next
			problem = null
			tell({ type: 'scene', scene: next.scene })
		} catch (error) {
			problem = error instanceof Error ? error.message : String(error)
			tell({ type: 'problem', message: problem })
		}
	}

	untrack(() => load(data.source))

	$effect(() => {
		function receive(event: MessageEvent) {
			if (event.origin !== location.origin) return
			const message = event.data as { type?: string; source?: string; node?: string }
			if (message.type === 'load' && typeof message.source === 'string') load(message.source, message.node)
		}
		window.addEventListener('message', receive)
		tell({ type: 'ready' })
		return () => window.removeEventListener('message', receive)
	})
</script>

{#if dialogue}
	{#key dialogue}
		<Game {dialogue} debug onchange={() => tell({ type: 'scene', scene: dialogue?.scene })} />
	{/key}
{/if}

{#if problem}
	<p class="problem">The preview stopped: {problem}</p>
{/if}

<style>
	.problem {
		position: fixed;
		inset: auto 0 0 0;
		z-index: var(--layer-alert);
		padding: 1ch;
		background: var(--color-error);
		color: var(--color-surface);
		font-size: 0.9em;
	}
</style>
