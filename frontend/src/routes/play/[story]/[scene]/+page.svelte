<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'

	import Audio from '@/Audio.svelte'
	import Map from '@/Map.svelte'
	import Line from '@/Line.svelte'
	import { player } from '$lib/player.svelte'
	import Debug from '$lib/Debug.svelte'
	import { debug } from '$lib/debug-mode'
	import type { PageProps } from './$types'
    import { fade } from 'svelte/transition';
    import Water from '@/Water.svelte';
    import { toDMS } from "$lib/helpers"

	const { data, params }: PageProps = $props()

	const dialogue = $derived(data.dialogue)
	const screen = $derived(dialogue.screen)
	const presentation = $derived(dialogue.presentation)
	const colour = $derived(String(screen.state.variables.screen ?? '') || 'transparent')
	const headers = $derived(dialogue.headers)
	const year = $derived(headers.year)

	const center = $derived.by((): [number, number] | null => {
		if (!headers.lat || !headers.long) return null
		const lat = Number(headers.lat)
		const long = Number(headers.long)
		return Number.isFinite(lat) && Number.isFinite(long) ? [lat, long] : null
	})

	function advance(choice?: number) {
		dialogue.advance(choice)
		if (dialogue.scene !== params.scene) {
			goto(resolve('/play/[story]/[scene]', { story: params.story, scene: dialogue.scene }))
		}
	}

	function recordingDone() {
		dialogue.finishRecording()
		if (screen.ending.kind === 'continue') advance()
	}

	function skip() {
		if (dialogue.waiting) recordingDone()
		else if (screen.ending.kind === 'continue') advance()
		else if (screen.ending.kind === 'options') advance(0)
	}

	$effect(() => player.onEnded(recordingDone))
	$effect(() => player.onError(() => dialogue.finishRecording()))
</script>

{#if debug}
	<button class="skip" onclick={skip}>skip</button>
{/if}


<main style:background-color={colour}>

    <div class="content">
        {#if !presentation.recording}
            <hgroup>
                <p>{year}</p>
                {#if center}
                    <div>
                            <p>
                                [{toDMS(center[0], "lat")}, {toDMS(center[1], "long")}]
                            </p>
                    </div>
                {/if}
            </hgroup>
        {/if}

        <div class="dialogue">
           	{#each dialogue.transcript as entry (entry.id)}
          		{#if entry.item.kind === 'line'}
         			<p in:fade|global={{ duration: 2000 }}><Line text={entry.item.text} markup={entry.item.markup} /></p>
          		{/if}
           	{/each}

       	{#if presentation.recording}
      		<section class="recording">
     			<Audio />
      		</section>
       	{/if}
        </div>

        {#if presentation.map}
            <div class="map">
                {#if center}
                    <Map {center} />
                {:else}
                    <div class="placeholder">map: node has no lat / long headers</div>
                {/if}
            </div>
        {/if}

    </div>

    <div class="controls">
        <Water clear={screen.ending.kind !== 'continue' && !dialogue.waiting} />

        {#if screen.ending.kind === "continue"}
           	<button class="continue-button" aria-label="continue" disabled={dialogue.waiting} onclick={() => advance()}>
            </button>
        {:else if screen.ending.kind === 'options'}
      		<ul>
     			{#each screen.ending.options as option, index (index)}
    				<li in:fade|global={{ delay: 1500 + (500 * index)}}>
       					<button disabled={!option.available} onclick={() => advance(index)}>
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
	.skip {
		position: fixed;
		top: 0.5rem;
		right: 0.5rem;
		z-index: 10;
		padding: 0.25rem 0.5rem;
		font: inherit;
		font-size: 0.75rem;
		border: 1px dashed currentColor;
		background: none;
		color: inherit;
		cursor: pointer;
	}
	main {
		min-height: 100vh;
		width: min(100%, 500px);
		margin: 0 auto;

		transition: background-color 2s;
		display: grid;
		grid-template-rows: 60% auto;

		& .content {
			& > *:not(.map) {
				padding: 1em;
			}

			& .dialogue {
			    & :global(p) {
					margin-bottom: 1.2em;
				}
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
                padding: 2em;
                display: flex;
                flex-direction: column;
                gap: 1em;

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


	.map {
		height: 20rem;
		margin: 1rem 0;
	}
	.placeholder {
		padding: 1rem;
		border: 1px dashed currentColor;
		opacity: 0.6;
	}
	.recording {
		margin-top: 2rem;
	}
</style>
