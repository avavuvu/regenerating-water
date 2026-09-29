<script lang="ts">
	import { fade } from 'svelte/transition'

	import Audio from '@/Audio.svelte'
	import Flash from '@/Flash.svelte'
	import Line from '@/Line.svelte'
	import Map from '@/Map.svelte'
	import Water from '@/Water.svelte'
	import Debug from '$lib/Debug.svelte'
	import type { Dialogue } from '$lib/dialogue.svelte'
	import { toDMS } from '$lib/helpers'
	import { player } from '$lib/player.svelte'

	const {
		dialogue,
		debug = false,
		onchange = () => {}
	}: { dialogue: Dialogue; debug?: boolean; onchange?: () => void } = $props()

	const screen = $derived(dialogue.screen)
	const presentation = $derived(dialogue.presentation)
	const colour = $derived(String(screen.state.variables.screen ?? '') || 'transparent')
	const headers = $derived(dialogue.headers)
	const year = $derived(headers.year)
	const canContinue = $derived(screen.ending.kind === 'continue' && !dialogue.waiting)

	const center = $derived.by((): [number, number] | null => {
		if (!headers.lat || !headers.long) return null
		const lat = Number(headers.lat)
		const long = Number(headers.long)
		return Number.isFinite(lat) && Number.isFinite(long) ? [lat, long] : null
	})

	function advance(choice?: number) {
		dialogue.advance(choice)
		onchange()
	}

	function back() {
		dialogue.back()
		onchange()
	}

	function forward() {
		dialogue.forward()
		onchange()
	}

	function skip() {
		if (dialogue.waiting) dialogue.finishRecording()
		else if (screen.ending.kind === 'continue') advance()
		else if (screen.ending.kind === 'options') advance(0)
	}

	$effect(() => player.onEnded(() => dialogue.finishRecording()))
	$effect(() => player.onError(() => dialogue.finishRecording()))
</script>

<svelte:head>
	<title>{dialogue.story}</title>
</svelte:head>

{#if debug}
	<button class="skip" onclick={skip}>skip</button>
{/if}

{#if presentation.flash}
	{#key presentation.flash.id}
		<Flash url={presentation.flash.url} seconds={presentation.flash.seconds} {colour} />
	{/key}
{/if}

<main style:background-color={colour}>
	<div class="content">
		{#if !presentation.recording}
			<hgroup>
				<h1>{dialogue.story}</h1>
				<p>{year}</p>
				{#if center}
					<p>[{toDMS(center[0], 'lat')}, {toDMS(center[1], 'long')}]</p>
				{/if}
			</hgroup>
		{/if}

		<div class="dialogue">
			{#each dialogue.transcript as entry (entry.id)}
				{#if entry.item.kind === 'line'}
					<p in:fade|global={{ duration: 2000 }}>
						<Line text={entry.item.text} markup={entry.item.markup} />
					</p>
				{/if}
			{/each}

			{#if presentation.recording}
				<section class="recording">
					<Audio {canContinue} />
				</section>
			{/if}
		</div>

		{#if presentation.map && center}
			<div class="map">
				<Map {center} />
			</div>
		{/if}
	</div>

	<nav class="history">
		<button onclick={back} disabled={!dialogue.canGoBack} aria-label="back">&larr;</button>
		<button onclick={forward} disabled={!dialogue.canGoForward} aria-label="forward">&rarr;</button>
	</nav>

	<div class="controls">
		<Water clear={screen.ending.kind !== 'continue' && !dialogue.waiting} />

		{#if screen.ending.kind === 'continue'}
			<button
				class="continue-button"
				aria-label="continue"
				disabled={dialogue.waiting}
				onclick={() => advance()}
			></button>
		{:else if screen.ending.kind === 'options'}
			<ul>
				{#each screen.ending.options as option, index (index)}
					<li in:fade|global={{ delay: 1500 + 500 * index }}>
						<button disabled={!option.available || dialogue.waiting} onclick={() => advance(index)}>
							<Line text={option.text} markup={option.markup} />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</main>

{#if debug}
	<Debug state={screen.state} />
{/if}

<style>
	.history {
		display: flex;
		justify-content: space-between;
		padding: 0 0.5rem;

		& button {
			padding: 0 0.25rem;
			font: inherit;
			border: 1px solid currentColor;
			background: none;
			color: inherit;
			cursor: pointer;

			&:disabled {
				opacity: var(--opacity-disabled);
				cursor: default;
			}
		}
	}

	.skip {
		position: fixed;
		top: 0.5rem;
		right: 0.5rem;
		z-index: var(--layer-controls);
		padding: 0.25rem 0.5rem;
		font: inherit;
		border: 1px dashed currentColor;
		background: none;
		color: inherit;
		cursor: pointer;
	}

	main {
		height: 100vh;
		height: 100dvh;
		width: min(100%, 40ch);
		font-size: 1.5em;
		margin: 0 auto;
		transition: background-color 2s;
		display: grid;
		grid-template-rows: 1fr auto 40%;

		& hgroup {
			font-size: 0.75em;
		}

		& .content {
			min-height: 0;
			overflow-y: auto;
			display: flex;
			flex-direction: column;

			& > * {
				padding: 2ch;
			}

			& .dialogue :global(p) {
				margin-bottom: 1ch;
			}

			& .map {
				flex: 1 0 12rem;
				padding-top: 0;
			}
		}

		& .controls {
			position: relative;

			& .continue-button {
				position: absolute;
				inset: 0;
				width: 100%;
				height: 100%;
			}

			& ul {
				position: absolute;
				inset: 0;
				width: 100%;
				height: 100%;
				padding: 1ch;
				display: flex;
				flex-direction: column;
				gap: 0.5em;
				font-size: 1.5em;

				& li {
					color: var(--color-surface);
					background-color: var(--color-foreground);
					text-align: center;

					& button {
						width: 100%;
					}
				}
			}
		}
	}

	.recording {
		margin-top: 2rem;
	}
</style>
