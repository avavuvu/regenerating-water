<script lang="ts">
	import type { Snippet } from 'svelte'
	import { invalidate } from '$app/navigation'
	import { page } from '$app/state'
	import { errorMessage, postJson } from '$lib/admin/api'
	import type { BuildStatus } from '$lib/content'

	const {
		children,
		beforeBuild
	}: {
		children: Snippet
		beforeBuild?: () => Promise<boolean>
	} = $props()

	const BUILD_POLL_MS = 15_000
	const BUILD_TIMEOUT_MS = 10 * 60_000

	const status = $derived(page.data.build as BuildStatus | null | undefined)

	let building = $state(false)
	let buildError = $state('')

	async function waitForDeploy(previous: string | null) {
		const until = Date.now() + BUILD_TIMEOUT_MS
		while (Date.now() < until) {
			await new Promise((resolve) => setTimeout(resolve, BUILD_POLL_MS))
			try {
				const response = await fetch('/stories/index.json', { cache: 'no-store' })
				const manifest = response.ok ? ((await response.json()) as { generated?: string }) : null
				if (manifest?.generated && manifest.generated !== previous) return
			} catch {}
		}
		throw new Error('The build did not finish in 10 minutes. Check the deploy log in Netlify.')
	}

	async function build() {
		buildError = ''
		if (beforeBuild && !(await beforeBuild())) return
		building = true
		try {
			const previous = status?.lastBuild ?? null
			const result = await postJson<{ mode: 'hook' | 'local' }>('/admin/api/build', {})
			if (result.mode === 'hook') await waitForDeploy(previous)
			await invalidate('admin:build')
		} catch (error) {
			buildError = errorMessage(error)
		} finally {
			building = false
		}
	}
</script>

<div class="bar">
	<header>
		{@render children()}
		<div class="site">
			{#if building}
				<span class="muted">building...</span>
			{:else if status?.pending}
				<span class="warning">not built</span>
			{/if}
			<button
				class="button"
				class:primary={status?.pending}
				onclick={build}
				disabled={building || !status?.canBuild}
				title={status?.canBuild ? undefined : 'NETLIFY_BUILD_HOOK_URL is not set'}
			>
				{status?.pending ? 'build site' : 'rebuild site'}
			</button>
			<a href="/" target="_blank" rel="noreferrer">live site</a>
		</div>
	</header>
	{#if buildError}
		<div class="notice">
			<span class="error">{buildError}</span>
			<button class="button" onclick={() => (buildError = '')}>close</button>
		</div>
	{/if}
</div>

<style>
	.bar {
		position: sticky;
		top: 0;
		z-index: var(--layer-controls);
		background: var(--color-surface);
	}

	header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 2ch;
		padding: 0.5rem 2ch;
		border-bottom: 1px solid var(--color-line);
	}

	.site {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 1ch;

		& a {
			margin-left: 1ch;
		}
	}

	.notice {
		display: flex;
		align-items: center;
		gap: 1ch;
		padding: 0.5rem 2ch;
		border-bottom: 1px solid var(--color-error);
	}
</style>
