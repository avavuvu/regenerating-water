<script lang="ts">
	import { fade } from 'svelte/transition'

	const { url, seconds, colour = 'transparent' }: { url: string; seconds: number; colour?: string } =
		$props()

	let visible = $state(true)

	$effect(() => {
		const timer = setTimeout(() => (visible = false), seconds * 1000)
		return () => clearTimeout(timer)
	})
</script>

{#if visible}
	<button
		class="flash"
		style:background-color={colour}
		aria-label="close image"
		onclick={() => (visible = false)}
		in:fade={{ duration: 400 }}
		out:fade={{ duration: 2000 }}
	>
		<img src={url} alt="" />
	</button>
{/if}

<style>
	.flash {
		position: fixed;
		inset: 0;
		z-index: var(--layer-flash);
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		cursor: pointer;

		& img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}
</style>
