<script lang="ts">
	import favicon from '$lib/assets/favicon.svg'
	import './reset.css'
	import './theme.css'
	import './app.css'

	const { children } = $props()
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>River Walk</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Ubuntu+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}
