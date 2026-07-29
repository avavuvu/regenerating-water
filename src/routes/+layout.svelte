<script lang="ts">
	import '../app.css';
	import "leaflet/dist/leaflet.css"

	let { children } = $props();
</script>

<svelte:head>
	<title>Body Of Water</title>
	<link rel="icon" href="favicon.svg" />
</svelte:head>

<div class="max-w-[500px] mx-auto">
	{@render children()}
</div>

<style>
    :global(body) {
        background-color: black;
    }
</style>
