<script lang="ts">
	import { enhance } from '$app/forms'
	import type { PageProps } from './$types'

	const { data, form }: PageProps = $props()

	let busy = $state(false)
</script>

<main>
	<h1>Log in</h1>

	{#if !data.configured}
		<p class="error">ADMIN_PASSWORD is not set. Add it to the Netlify environment variables (or to .env for local work).</p>
	{:else}
		<form
			method="POST"
			use:enhance={() => {
				busy = true
				return async ({ update }) => {
					await update()
					busy = false
				}
			}}
		>
			<label>
				<span>Password</span>
				<input type="password" name="password" autocomplete="current-password" required />
			</label>
			<button class="button primary" disabled={busy}>{busy ? 'checking...' : 'log in'}</button>
			{#if form?.message}
				<p class="error">{form.message}</p>
			{/if}
		</form>
	{/if}
</main>

<style>
	main {
		width: min(100%, 40ch);
		margin: 4rem auto;
		padding: 0 2ch;
	}

	h1 {
		margin-bottom: 1.5rem;
		font-size: 1.5em;
	}

	form {
		display: grid;
		gap: 1rem;
		justify-items: start;
	}

	label {
		display: grid;
		gap: 0.25rem;
		width: 100%;

		& input {
			width: 100%;
		}
	}
</style>
