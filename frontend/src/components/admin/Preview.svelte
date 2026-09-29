<script lang="ts">
	import { RotateCcw } from 'lucide-svelte'

	const { story, source }: { story: string; source: string } = $props()

	let frame: HTMLIFrameElement
	let ready = $state(false)
	let scene = $state<string | null>(null)
	let problem = $state<string | null>(null)
	let timer: ReturnType<typeof setTimeout> | undefined
	let pendingNode: string | null = null

	export function show(node: string) {
		if (ready) send({ type: 'load', source, node })
		else pendingNode = node
	}

	function send(message: Record<string, unknown>) {
		if (ready) frame.contentWindow?.postMessage(message, location.origin)
	}

	function restart() {
		send({ type: 'load', source, node: 'Start' })
	}

	$effect(() => {
		const text = source
		if (!ready) return
		clearTimeout(timer)
		timer = setTimeout(() => send({ type: 'load', source: text }), 800)
		return () => clearTimeout(timer)
	})

	$effect(() => {
		function receive(event: MessageEvent) {
			if (event.origin !== location.origin || event.source !== frame.contentWindow) return
			const data = event.data as { type?: string; scene?: string; message?: string }
			if (data.type === 'ready') {
				ready = true
				send({ type: 'load', source, node: pendingNode ?? undefined })
				pendingNode = null
			} else if (data.type === 'scene') {
				scene = data.scene ?? null
				problem = null
			} else if (data.type === 'problem') {
				problem = data.message ?? 'The preview has a problem.'
			}
		}
		window.addEventListener('message', receive)
		return () => window.removeEventListener('message', receive)
	})
</script>

<div class="preview">
	<div class="bar">
		<span>{scene ? `${scene}` : ''}</span>
		<button class="button" onclick={restart} aria-label="restart the preview"><RotateCcw size={14} /> start</button>
	</div>
	<div class="phone">
		<iframe bind:this={frame} src="/admin/{story}/preview" title="phone preview"></iframe>
	</div>
	{#if problem}
		<p class="error">{problem}</p>
	{/if}
</div>

<style>
	.preview {
		height: 100%;
		display: grid;
		grid-template-rows: auto 1fr auto;
		gap: 0.5rem;
		padding: 0.75rem 1ch;
		min-height: 0;
	}

	.bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1ch;
	}

	.phone {
		min-height: 0;
		display: flex;
		justify-content: center;
	}

	iframe {
		width: 390px;
		max-width: 100%;
		height: 100%;
		max-height: 844px;
		border: 1px solid var(--color-foreground);
		background: var(--color-surface);
	}

	p {
		font-size: 0.85em;
	}
</style>
