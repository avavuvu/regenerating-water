<script lang="ts">
	import { Loader, Pause, Play } from 'lucide-svelte'
	import { player } from '$lib/player.svelte'

	const { canContinue = false }: { canContinue?: boolean } = $props()

	const state = $derived(player.state)

	const formatSeconds = (seconds: number) => {
		const minutes = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${minutes}:${secs.toString().padStart(2, '0')}`
	}

	const playState: 'loading' | 'playing' | 'paused' = $derived.by(() => {
		if (state.playing && !state.loaded) return 'loading'
		if (state.playing) return 'playing'
		return 'paused'
	})

	const percentPlayed = $derived(
		state.duration > 0 ? `${(state.currentTime / state.duration) * 100}%` : '0%'
	)
</script>

{#if state.failed}
	<p>The recording did not load.{canContinue ? ' Tap the water to continue.' : ''}</p>
{:else if state.blocked}
	<p>Press play to listen...</p>
{:else if canContinue}
	<p>Tap the water to continue.</p>
{:else}
	<p>Listen...</p>
{/if}

<div class="player">
	<div class="progress" style:width={percentPlayed}></div>

	<button class="toggle" onclick={() => player.toggle()} disabled={!state.url}>
		<span class="state">
			{#if playState === 'loading'}
				<Loader />
			{:else if playState === 'paused'}
				<Play />
			{:else}
				<Pause />
			{/if}
		</span>
		<span class="time">
			<span>{formatSeconds(state.currentTime)}</span>
			<span>/</span>
			<span>{formatSeconds(state.duration)}</span>
		</span>
	</button>
</div>

<style>
	.player {
		position: relative;
		width: 100%;
		height: 3rem;
		display: grid;
		align-items: center;
	}
	.progress {
		position: absolute;
		inset: 0 auto 0 0;
		border: 1px solid var(--color-line);
		pointer-events: none;
	}
	.toggle {
		position: relative;
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		background: none;
		border: 0;
		font: inherit;
		color: inherit;
		cursor: pointer;
	}
	.toggle:disabled {
		cursor: default;
		opacity: var(--opacity-disabled);
	}
	.state {
		display: inline-flex;
	}
	.time {
		display: grid;
		grid-template-columns: 49% auto 49%;
		width: 8rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
</style>
