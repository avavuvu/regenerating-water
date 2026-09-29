<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { resetStory } from '$lib/stories'
	import type { PageProps } from './$types'

	const { data }: PageProps = $props()

	function restart(story: string) {
		resetStory(story)
		goto(resolve('/play/[story]', { story }))
	}
</script>

<main>
	<ul>
		{#each data.stories as story (story.name)}
			<li>
				<h2>{story.name}</h2>
				<p>
					<a href={resolve('/play/[story]', { story: story.name })}>
						{story.started ? 'Continue' : 'Click here to begin'}
					</a>
				</p>
				{#if story.started}
					<p>
						<button onclick={() => restart(story.name)}>Start again</button>
					</p>
				{/if}
			</li>
		{/each}
	</ul>
</main>

<style>
	main {
		width: min(100%, 600px);
		margin: 0 auto;
		padding: 1em;
	}

	li {
		margin-bottom: 1.5em;
	}

	a,
	button {
		text-decoration: underline;
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
	}
</style>
