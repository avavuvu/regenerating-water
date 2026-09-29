<script lang="ts">
	import { untrack } from 'svelte'
	import { beforeNavigate } from '$app/navigation'
	import { page } from '$app/state'
	import AdminBar from '@/admin/AdminBar.svelte'
	import { errorMessage, postJson } from '$lib/admin/api'
	import { createStoryEditor, setStoryEditor } from '$lib/admin/story-editor.svelte'
	import { EXTENSIONS } from '$lib/content'
	import type { LayoutProps } from './$types'

	const { data, children }: LayoutProps = $props()

	const editor = setStoryEditor(
		createStoryEditor(
			untrack(() => ({
				story: data.story,
				text: data.script?.text ?? '',
				etag: data.script?.etag ?? null,
				assets: data.assets
			}))
		)
	)

	const base = $derived(`/admin/${data.story}`)
	const tabs = $derived([
		{ href: base, label: 'script' },
		{ href: `${base}/flow`, label: 'flow' },
		{ href: `${base}/audio`, label: `audio (${editor.known.audio.length})` },
		{ href: `${base}/images`, label: `images (${editor.known.images.length})` }
	])

	let importing = $state(false)
	let importDone = $state(0)
	let importError = $state('')

	const liveFiles = $derived(
		data.live
			? [
					...(data.live.script ? ['story.yarn'] : []),
					...data.live.assets.map((a) => `${a.kind}/${a.name}.${EXTENSIONS[a.kind]}`)
				]
			: []
	)

	async function importLive() {
		importing = true
		importDone = 0
		importError = ''
		try {
			for (const path of [...liveFiles.filter((p) => p !== 'story.yarn'), 'story.yarn']) {
				await postJson(`/admin/api/stories/${data.story}/import`, { path })
				importDone++
			}
			location.reload()
		} catch (error) {
			importError = errorMessage(error)
			importing = false
		}
	}

	async function saveBeforeBuild(): Promise<boolean> {
		if (!editor.dirty) return true
		if (!confirm('You have unsaved changes. Save them and build the site?')) return false
		await editor.save()
		return !editor.dirty && !editor.saveError
	}


	function insideEditor(pathname: string | undefined): boolean {
		return !!pathname && (pathname === base || pathname.startsWith(`${base}/`))
	}

	beforeNavigate((navigation) => {
		if (insideEditor(navigation.to?.url.pathname)) return
		if (editor.dirty && !confirm('You have unsaved changes. Leave this page?')) navigation.cancel()
	})

	$effect(() => {
		function warn(event: BeforeUnloadEvent) {
			if (editor.dirty) event.preventDefault()
		}
		window.addEventListener('beforeunload', warn)
		return () => window.removeEventListener('beforeunload', warn)
	})
</script>

<svelte:head>
	<title>{editor.dirty ? '* ' : ''}{data.story} – Dashboard</title>
</svelte:head>

<div class="workspace">
	<AdminBar beforeBuild={saveBeforeBuild}>
		<a class="button" href="/admin" aria-label="all stories">&larr;</a>
		<h1>{data.story}</h1>
		{#if data.script}
			<nav class="tabs" aria-label="editor sections">
				{#each tabs as tab (tab.href)}
					<a
						href={tab.href}
						class:active={page.url.pathname === tab.href}
						aria-current={page.url.pathname === tab.href ? 'page' : undefined}
					>
						{tab.label}
					</a>
				{/each}
			</nav>
			<div class="status">
				{#if editor.saving}
					<span class="muted">saving...</span>
				{:else if editor.dirty}
					<span class="warning">unsaved</span>
				{:else}
					<span class="ok">saved</span>
				{/if}
				{#if editor.errors > 0}
					<span class="error">· {editor.errors} errors</span>
				{/if}
				<button class="button primary" onclick={() => editor.save()} disabled={editor.saving || !editor.dirty}>
					save
				</button>
			</div>
		{/if}
	</AdminBar>

	{#if !data.script}
		<main class="import">
			<button class="button primary" onclick={importLive} disabled={importing}>
				{importing ? `importing ${importDone} / ${liveFiles.length}...` : 'import the live story'}
			</button>
			{#if importing}
				<progress max={liveFiles.length} value={importDone}></progress>
			{/if}
			{#if importError}
				<p class="error">{importError}</p>
				<p class="muted">You can push the button again. Files that are already imported stay.</p>
			{/if}
		</main>
	{:else}
		{#if editor.saveError}
			<div class="banner">
				<span class="error">{editor.saveError}</span>
				{#if editor.conflict}
					<button class="button" onclick={() => editor.loadSaved()}>load the saved version</button>
					<button class="button danger" onclick={() => editor.save(true)}>overwrite with my version</button>
				{/if}
			</div>
		{/if}

		<div class="content">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.import {
		width: min(100%, 70ch);
		margin: 0 auto;
		padding: 2rem 2ch;
		display: grid;
		gap: 1rem;
		justify-items: start;

		& progress {
			width: 100%;
			accent-color: var(--color-foreground);
		}
	}

	.workspace {
		height: 100%;
		min-height: 30rem;
		display: flex;
		flex-direction: column;
	}

	h1 {
		font-size: 1.25em;
	}

	.tabs {
		display: flex;

		& a {
			padding: 0.25rem 1ch;
			border: 1px solid var(--color-foreground);
			margin-left: -1px;
			text-decoration: none;

			&.active {
				color: var(--color-surface);
				background: var(--color-foreground);
			}
		}
	}

	.status {
		display: flex;
		align-items: center;
		gap: 1ch;
	}

	.banner {
		display: flex;
		align-items: center;
		gap: 1ch;
		padding: 0.5rem 2ch;
		border-bottom: 1px solid var(--color-error);
	}

	.content {
		flex: 1;
		min-height: 0;
		display: grid;
	}
</style>
