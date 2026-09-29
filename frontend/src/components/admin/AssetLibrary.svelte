<script lang="ts">
	import { api, errorMessage, formatBytes, formatDuration } from '$lib/admin/api'
	import { prepareAudio, prepareImage, uploadAsset } from '$lib/admin/upload'
	import { assetNameFromFile, isAssetName, type AssetInfo, type AssetKind } from '$lib/content'

	const {
		story,
		kind,
		assets,
		usedBy,
		onchange
	}: {
		story: string
		kind: AssetKind
		assets: AssetInfo[]
		usedBy: Map<string, string[]>
		onchange: (assets: AssetInfo[]) => void
	} = $props()

	interface Job {
		id: number
		file: File
		name: string
		stage: 'waiting' | 'converting' | 'uploading' | 'done' | 'failed'
		progress: number
		message: string
	}

	let jobs = $state<Job[]>([])
	let nextJob = 0
	let running = false
	let previewing = $state<string | null>(null)
	let picker: HTMLInputElement
	let pickerTarget: string | null = null

	const isAudio = $derived(kind === 'audio')
	const label = $derived(isAudio ? 'audio' : 'image')
	const mine = $derived(assets.filter((a) => a.kind === kind))
	const names = $derived(new Set(mine.map((a) => a.name)))
	const missing = $derived([...usedBy.keys()].filter((name) => !names.has(name)).sort())

	function url(asset: AssetInfo): string {
		return `/admin/api/stories/${story}/assets/${kind}/${asset.name}?v=${encodeURIComponent(asset.updated ?? '')}`
	}

	function snippet(name: string): string {
		return isAudio ? `<<recording ${name} "label">>` : `<<flash ${name}>>`
	}

	function choose(target: string | null) {
		pickerTarget = target
		picker.value = ''
		picker.click()
	}

	function queue(files: FileList | null) {
		if (!files) return
		for (const file of files) {
			jobs.push({
				id: nextJob++,
				file,
				name: pickerTarget ?? assetNameFromFile(file.name),
				stage: 'waiting',
				progress: 0,
				message: ''
			})
		}
		if (pickerTarget) run()
		pickerTarget = null
	}

	async function process(job: Job) {
		job.stage = 'converting'
		job.progress = 0
		job.message = ''
		try {
			const prepared = isAudio
				? await prepareAudio(job.file, (p) => (job.progress = p))
				: await prepareImage(job.file)
			job.stage = 'uploading'
			job.progress = 0
			const asset = await uploadAsset(story, kind, job.name, prepared, (p) => (job.progress = p))
			onchange([...assets.filter((a) => !(a.kind === kind && a.name === asset.name)), asset])
			job.stage = 'done'
			job.message = `${formatBytes(asset.size)}${asset.duration ? `, ${formatDuration(asset.duration)}` : ''}`
		} catch (error) {
			job.stage = 'failed'
			job.message = errorMessage(error)
		}
	}

	async function run() {
		if (running) return
		running = true
		try {
			for (;;) {
				const job = jobs.find((j) => j.stage === 'waiting' && isAssetName(j.name))
				if (!job) break
				await process(job)
			}
		} finally {
			running = false
		}
	}

	async function remove(asset: AssetInfo) {
		const users = usedBy.get(asset.name) ?? []
		const warning = users.length > 0 ? `\n\nThese nodes use it: ${users.join(', ')}.` : ''
		if (!confirm(`Delete the ${label} "${asset.name}"?${warning}`)) return
		try {
			await api(`/admin/api/stories/${story}/assets/${kind}/${asset.name}`, { method: 'DELETE' })
			onchange(assets.filter((a) => !(a.kind === kind && a.name === asset.name)))
			if (previewing === asset.name) previewing = null
		} catch (error) {
			alert(errorMessage(error))
		}
	}

	function clearFinished() {
		jobs = jobs.filter((j) => j.stage !== 'done')
	}
</script>

<input
	class="picker"
	type="file"
	multiple
	accept={isAudio ? 'audio/*,.wav,.m4a,.mp3,.flac,.aiff' : 'image/*'}
	bind:this={picker}
	onchange={(event) => queue(event.currentTarget.files)}
/>

<div class="library">
	<header>
		<div>
			<h2>{isAudio ? 'Audio' : 'Images'}</h2>
		</div>
		<button class="button primary" onclick={() => choose(null)}>add {label} files</button>
	</header>

	{#if jobs.length > 0}
		<section class="panel jobs">
			<h3>Uploads</h3>
			<table>
				<tbody>
					{#each jobs as job (job.id)}
						<tr>
							<td class="file">{job.file.name}</td>
							<td>
								{#if job.stage === 'waiting'}
									<input type="text" bind:value={job.name} aria-label="file name in the script" />
									{#if !isAssetName(job.name)}
										<div class="error">Use letters, numbers, "-" and "_".</div>
									{:else if names.has(job.name)}
										<div class="warning">This replaces the existing file.</div>
									{/if}
								{:else}
									{job.name}
								{/if}
							</td>
							<td class="status">
								{#if job.stage === 'converting' || job.stage === 'uploading'}
									{job.stage} {Math.round(job.progress * 100)}%
									<progress max="1" value={job.progress}></progress>
								{:else if job.stage === 'done'}
									<span class="ok">done</span> <span class="muted">{job.message}</span>
								{:else if job.stage === 'failed'}
									<span class="error">failed: {job.message}</span>
								{:else}
									<span class="muted">waiting</span>
								{/if}
							</td>
							<td class="actions">
								{#if job.stage === 'failed'}
									<button class="button" onclick={() => ((job.stage = 'waiting'), run())}>retry</button>
								{/if}
								{#if job.stage === 'waiting' || job.stage === 'failed' || job.stage === 'done'}
									<button class="button" onclick={() => (jobs = jobs.filter((j) => j.id !== job.id))}>remove</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<div class="row">
				<button class="button primary" onclick={run} disabled={!jobs.some((j) => j.stage === 'waiting')}>
					upload all
				</button>
				<button class="button" onclick={clearFinished}>clear finished</button>
			</div>
		</section>
	{/if}

	{#if missing.length > 0}
		<section class="panel missing">
			<h3 class="error">Missing files</h3>
			<p class="muted">The script uses these names, but there is no file for them.</p>
			<ul>
				{#each missing as name (name)}
					<li>
						<code>{name}</code>
						<span class="muted">used by {usedBy.get(name)?.join(', ')}</span>
						<button class="button" onclick={() => choose(name)}>upload</button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<table>
		<thead>
			<tr>
				<th>Name</th>
				{#if isAudio}<th>Length</th>{/if}
				<th>Size</th>
				<th>Used by</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each mine as asset (asset.name)}
				<tr>
					<td>
						<div class="name">{asset.name}</div>
						<button class="snippet" title="copy" onclick={() => navigator.clipboard.writeText(snippet(asset.name))}>
							{snippet(asset.name)}
						</button>
					</td>
					{#if isAudio}<td>{formatDuration(asset.duration)}</td>{/if}
					<td>{formatBytes(asset.size)}</td>
					<td>
						{#if usedBy.get(asset.name)?.length}
							{usedBy.get(asset.name)?.join(', ')}
						{:else}
							<span class="warning">not used</span>
						{/if}
					</td>
					<td class="actions">
						<button class="button" onclick={() => (previewing = previewing === asset.name ? null : asset.name)}>
							{previewing === asset.name ? 'close' : isAudio ? 'listen' : 'view'}
						</button>
						<button class="button" onclick={() => choose(asset.name)}>replace</button>
						<button class="button danger" onclick={() => remove(asset)}>delete</button>
					</td>
				</tr>
				{#if previewing === asset.name}
					<tr class="preview">
						<td colspan={isAudio ? 5 : 4}>
							{#if isAudio}
								<audio controls autoplay src={url(asset)}></audio>
							{:else}
								<img src={url(asset)} alt={asset.name} />
							{/if}
						</td>
					</tr>
				{/if}
			{:else}
				<tr><td colspan={isAudio ? 5 : 4} class="muted">There are no {label} files yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.picker {
		display: none;
	}

	.library {
		display: grid;
		gap: 1.5rem;
		padding: 1.5rem 2ch 4rem;
		max-width: 120ch;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2ch;

		& h2 {
			font-size: 1.25em;
			margin-bottom: 0.25rem;
		}
	}

	.panel {
		padding: 1rem 2ch;
		display: grid;
		gap: 0.75rem;
	}

	.row {
		display: flex;
		gap: 1ch;
	}

	.file {
		word-break: break-all;
	}

	.status progress {
		display: block;
		width: 100%;
		accent-color: var(--color-foreground);
	}

	.actions {
		text-align: right;
		white-space: nowrap;

		& .button + .button {
			margin-left: 0.5ch;
		}
	}

	.missing ul {
		display: grid;
		gap: 0.5rem;

		& li {
			display: flex;
			gap: 1ch;
			align-items: baseline;
			flex-wrap: wrap;
		}
	}

	.name {
		font-weight: 700;
	}

	.snippet {
		font: inherit;
		font-size: 0.85em;
		color: var(--color-muted);
		background: none;
		border: 0;
		padding: 0;
		cursor: copy;

		&:hover {
			color: inherit;
		}
	}

	.preview {
		& audio {
			width: 100%;
		}

		& img {
			max-height: 50vh;
		}
	}
</style>
