<script lang="ts">
	import { goto } from '$app/navigation'
	import AdminBar from '@/admin/AdminBar.svelte'
	import { errorMessage, postJson } from '$lib/admin/api'
	import { isStoryName } from '$lib/content'
	import type { PageProps } from './$types'

	const { data }: PageProps = $props()

	let newName = $state('')
	let creating = $state(false)
	let createError = $state('')


	const nameValid = $derived(isStoryName(newName.trim().toLowerCase()))

	async function create(event: SubmitEvent) {
		event.preventDefault()
		creating = true
		createError = ''
		try {
			const { story } = await postJson<{ story: string }>('/admin/api/stories', { name: newName })
			await goto(`/admin/${story}`)
		} catch (error) {
			createError = errorMessage(error)
		} finally {
			creating = false
		}
	}


</script>

<AdminBar>
	<h1>Stories</h1>
</AdminBar>

<main>
	<table>
		<thead>
			<tr>
				<th>Story</th>
				<th>Status</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.stories as story (story.name)}
				<tr>
					<td><a href="/admin/{story.name}">{story.name}</a></td>
					<td>
						{#if story.draft && story.live}
							<span class="ok">in the dashboard, live</span>
						{:else if story.draft}
							<span class="warning">in the dashboard, not live yet</span>
						{:else}
							<span class="muted">live, not imported yet</span>
						{/if}
					</td>
					<td class="actions">
						<a class="button" href="/admin/{story.name}">edit</a>
						{#if story.live}
							<a class="button" href="/play/{story.name}" target="_blank" rel="noreferrer">play</a>
						{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan="3" class="muted">There are no stories.</td></tr>
			{/each}
		</tbody>
	</table>

	<section class="panel">
		<h2>New story</h2>
		<form onsubmit={create}>
			<input type="text" bind:value={newName} placeholder="story-name" aria-label="story name" />
			<button class="button" disabled={!nameValid || creating}>{creating ? 'creating...' : 'create'}</button>
		</form>
		{#if createError}<p class="error">{createError}</p>{/if}
	</section>
</main>

<style>
	main {
		width: min(100%, 80ch);
		margin: 0 auto;
		padding: 2rem 2ch 4rem;
		display: grid;
		gap: 2rem;
	}

	h1 {
		font-size: 1.25em;
	}

	h2 {
		margin-bottom: 0.75rem;
	}

	.panel {
		padding: 1rem 2ch;
		display: grid;
		gap: 0.75rem;
		justify-items: start;
	}

	form {
		display: flex;
		gap: 1ch;
	}

	.actions {
		display: flex;
		gap: 1ch;
		justify-content: flex-end;
	}
</style>
