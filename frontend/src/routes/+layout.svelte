<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import "./reset.css"
	import "./app.css"

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>
	    Tarnuk Demo
	</title>
</svelte:head>

{@render children()}
