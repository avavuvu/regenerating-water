<script lang="ts">
	import { Loader, Pause, Play } from 'lucide-svelte'

	const { audioSource, autoplay, onAudioEnd, onAudioError, onAlmostFinished }: {
		audioSource: string
		autoplay: boolean
		onAudioEnd?: () => void
		onAudioError?: () => void
		onAlmostFinished?: () => void
	} = $props()

	let audioElement: HTMLAudioElement | undefined = $state(undefined)

	let volume = $state(0.75)
	let muted = $state(false)
	let hasLoaded = $state(false)
	let duration = $state(0)
	let currentTime = $state(0)
	// svelte-ignore state_referenced_locally
	let playHasBeenPressed = $state(autoplay)

	const formatSeconds = (seconds: number) => {
		const minutes = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${minutes}:${secs.toString().padStart(2, '0')}`
	}

	const playState: 'loading' | 'playing' | 'paused' = $derived.by(() => {
		if (playHasBeenPressed && !hasLoaded) return 'loading'
		if (playHasBeenPressed && hasLoaded) return 'playing'
		return 'paused'
	})

	const percentPlayed = $derived(duration > 0 ? `${(currentTime / duration) * 100}%` : '0%')

	const togglePlaying = async () => {
		if (!audioElement) return

		if (audioElement.paused) {
			playHasBeenPressed = true
			await audioElement.play()
		} else {
			audioElement.pause()
			playHasBeenPressed = false
		}
	}

	$effect(() => {
		const element = audioElement
		if (!element) return

		const handleLoadedMetadata = () => {
			duration = element.duration
			hasLoaded = true
		}
		const handleTimeUpdate = () => {
			currentTime = element.currentTime
		}

		element.addEventListener('loadedmetadata', handleLoadedMetadata)
		element.addEventListener('timeupdate', handleTimeUpdate)

		return () => {
			element.removeEventListener('loadedmetadata', handleLoadedMetadata)
			element.removeEventListener('timeupdate', handleTimeUpdate)
		}
	})

	$effect(() => {
		if (!onAlmostFinished) return
		if (currentTime / duration > 0.8) onAlmostFinished()
	})
</script>

<p>Listen...</p>


<div class="player">

	<div class="progress" style:width={percentPlayed}></div>

	<button class="toggle" onclick={togglePlaying} disabled={!audioSource}>
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
			<span>{formatSeconds(currentTime)}</span>
			<span>/</span>
			<span>{formatSeconds(duration)}</span>
		</span>
	</button>
</div>

<audio
	{autoplay}
	bind:volume
	bind:muted
	bind:this={audioElement}
	src={audioSource}
	onended={onAudioEnd}
	onerror={onAudioError}
></audio>

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
		border: 1px solid var(--color-foreground);
		pointer-events: none;
		opacity: 0.3;
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
		opacity: 0.5;
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
