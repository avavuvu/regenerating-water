<script lang="ts">
	import { page } from '$app/state'
	import './admin.css'

	const { children } = $props()

	const isPreview = $derived(page.url.pathname.endsWith('/preview'))
</script>

<svelte:head>
	<title>Dashboard</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if isPreview}
	{@render children()}
{:else}
	<div class="admin">
		{#key page.params.story ?? page.url.pathname}
			{@render children()}
		{/key}
	</div>
{/if}

<style>
	.admin {
		height: 100vh;
		height: 100dvh;
		overflow-y: auto;
	}
</style>
