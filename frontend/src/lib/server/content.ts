import { env } from '$env/dynamic/private'
import {
	ASSET_KINDS,
	EXTENSIONS,
	assetKey,
	isAssetName,
	isStoryName,
	scriptKey,
	type AssetInfo,
	type AssetKind,
	type BuildStatus,
	type LiveManifest
} from '$lib/content'
import { analyseStory, type Diagnostic } from '$lib/yarn/validate'
import { contentStore, type Metadata } from './store'

type Fetch = typeof fetch

export interface Script {
	text: string
	etag: string | null
	updated: string | null
}

export interface BuildResult {
	mode: 'hook' | 'local'
	stories: string[]
}


export class ContentError extends Error {
	constructor(
		message: string,
		readonly status = 400
	) {
		super(message)
		this.name = 'ContentError'
	}
}

function now(): string {
	return new Date().toISOString()
}

function numberOrNull(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function stringOrNull(value: unknown): string | null {
	return typeof value === 'string' ? value : null
}

export function assertStory(story: string) {
	if (!isStoryName(story)) throw new ContentError(`"${story}" is not a valid story name.`)
}

export function assertAsset(kind: string, name: string): asserts kind is AssetKind {
	if (!(ASSET_KINDS as readonly string[]).includes(kind)) throw new ContentError(`"${kind}" is not a file type.`)
	if (!isAssetName(name)) throw new ContentError(`"${name}" is not a valid file name.`)
}

export async function liveManifest(fetch: Fetch): Promise<LiveManifest> {
	try {
		const response = await fetch('/stories/index.json', { cache: 'no-store' })
		if (response.ok) return (await response.json()) as LiveManifest
	} catch {}
	return { generated: '', stories: {} }
}

export async function draftStoryNames(): Promise<string[]> {
	const keys = await contentStore().list('stories/')
	return [
		...new Set(
			keys
				.filter((key) => key.endsWith('/story.yarn'))
				.map((key) => key.split('/')[1])
				.filter(isStoryName)
		)
	].sort()
}

export async function getScript(story: string): Promise<Script | null> {
	assertStory(story)
	const found = await contentStore().getText(scriptKey(story))
	if (!found) return null
	return { text: found.text, etag: found.etag, updated: stringOrNull(found.metadata.updated) }
}

export async function saveScript(story: string, text: string, etag: string | null): Promise<Script> {
	assertStory(story)
	const updated = now()
	const newEtag = await contentStore().set(scriptKey(story), text, { updated }, etag)
	return { text, etag: newEtag, updated }
}

export async function createStory(story: string, text: string) {
	assertStory(story)
	if (await contentStore().getMetadata(scriptKey(story))) {
		throw new ContentError(`A story with the name "${story}" already exists.`, 409)
	}
	await contentStore().set(scriptKey(story), text, { updated: now() })
}

function assetFromKey(key: string, metadata: Metadata): AssetInfo | null {
	const [, , kind, file] = key.split('/')
	if (!(ASSET_KINDS as readonly string[]).includes(kind) || !file) return null
	const extension = `.${EXTENSIONS[kind as AssetKind]}`
	if (!file.endsWith(extension)) return null
	return {
		kind: kind as AssetKind,
		name: file.slice(0, -extension.length),
		size: numberOrNull(metadata.size) ?? 0,
		updated: stringOrNull(metadata.updated),
		duration: numberOrNull(metadata.duration)
	}
}

export async function listAssets(story: string): Promise<AssetInfo[]> {
	assertStory(story)
	const store = contentStore()
	const assets: AssetInfo[] = []
	for (const kind of ASSET_KINDS) {
		for (const key of await store.list(`stories/${story}/${kind}/`)) {
			const asset = assetFromKey(key, (await store.getMetadata(key)) ?? {})
			if (asset) assets.push(asset)
		}
	}
	return assets.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
}

export async function getAsset(story: string, kind: string, name: string) {
	assertStory(story)
	assertAsset(kind, name)
	return contentStore().getBytes(assetKey(story, kind, name))
}

export async function deleteAsset(story: string, kind: string, name: string) {
	assertStory(story)
	assertAsset(kind, name)
	await contentStore().delete(assetKey(story, kind, name))
}

function uploadKey(upload: string, index: number): string {
	if (!/^[A-Za-z0-9-]{8,64}$/.test(upload)) throw new ContentError('The upload ID is not valid.')
	if (!Number.isInteger(index) || index < 0 || index > 999) throw new ContentError('The part number is not valid.')
	return `uploads/${upload}/${String(index).padStart(3, '0')}`
}

export async function putChunk(upload: string, index: number, data: ArrayBuffer) {
	await contentStore().set(uploadKey(upload, index), data, { updated: now() })
}

export async function commitUpload(
	story: string,
	kind: string,
	name: string,
	upload: string,
	parts: number,
	duration: number | null
): Promise<AssetInfo> {
	assertStory(story)
	assertAsset(kind, name)
	const store = contentStore()
	const chunks: Uint8Array[] = []
	for (let i = 0; i < parts; i++) {
		const found = await store.getBytes(uploadKey(upload, i))
		if (!found) throw new ContentError(`Part ${i + 1} of the upload is missing. Please upload again.`)
		chunks.push(new Uint8Array(found.data))
	}
	const size = chunks.reduce((sum, c) => sum + c.byteLength, 0)
	const data = new Uint8Array(size)
	let offset = 0
	for (const chunk of chunks) {
		data.set(chunk, offset)
		offset += chunk.byteLength
	}

	const updated = now()
	await store.set(assetKey(story, kind, name), data.buffer, { size, updated, duration })
	for (let i = 0; i < parts; i++) await store.delete(uploadKey(upload, i))
	return { kind, name, size, updated, duration }
}

export async function importLiveFile(fetch: Fetch, manifest: LiveManifest, story: string, path: string) {
	assertStory(story)
	const live = manifest.stories[story]
	if (!live) throw new ContentError(`The live site has no story "${story}".`, 404)

	const response = await fetch(`/stories/${story}/${path}`, { cache: 'no-store' })
	if (!response.ok) throw new ContentError(`The live file "${path}" did not load (${response.status}).`, 502)

	if (path === 'story.yarn') {
		const store = contentStore()
		if (await store.getMetadata(scriptKey(story))) return
		await store.set(scriptKey(story), await response.text(), { updated: now() })
		return
	}

	const asset = live.assets.find((a) => `${a.kind}/${a.name}.${EXTENSIONS[a.kind]}` === path)
	if (!asset) throw new ContentError(`The live site has no file "${path}".`, 404)
	const data = await response.arrayBuffer()
	await contentStore().set(assetKey(story, asset.kind, asset.name), data, {
		size: data.byteLength,
		updated: asset.updated ?? now(),
		duration: asset.duration
	})
}

export async function checkStory(story: string): Promise<Diagnostic[]> {
	const script = await getScript(story)
	if (!script) return [{ line: 1, severity: 'error', message: 'The story has no script.' }]
	const assets = await listAssets(story)
	return analyseStory(script.text, {
		audio: assets.filter((a) => a.kind === 'audio').map((a) => a.name),
		images: assets.filter((a) => a.kind === 'images').map((a) => a.name)
	}).diagnostics
}

function canBuild(): boolean {
	return !!env.NETLIFY_BUILD_HOOK_URL || contentStore().kind === 'local'
}

async function storyChanged(fetch: Fetch, manifest: LiveManifest, story: string, builtAt: number): Promise<boolean> {
	const live = manifest.stories[story]
	if (!live?.script) return true

	const [script, response] = await Promise.all([
		getScript(story),
		fetch(`/stories/${story}/story.yarn`, { cache: 'no-store' })
	])
	if (!response.ok || script?.text !== (await response.text())) return true

	const assets = await listAssets(story)
	const liveKeys = new Set(live.assets.map((a) => `${a.kind}/${a.name}`))
	return (
		assets.length !== live.assets.length ||
		assets.some((a) => !liveKeys.has(`${a.kind}/${a.name}`) || (a.updated !== null && Date.parse(a.updated) > builtAt))
	)
}

export async function buildStatus(fetch: Fetch): Promise<BuildStatus> {
	const manifest = await liveManifest(fetch)
	const builtAt = manifest.generated ? Date.parse(manifest.generated) : 0
	let pending = false
	for (const story of await draftStoryNames()) {
		if (await storyChanged(fetch, manifest, story, builtAt)) {
			pending = true
			break
		}
	}
	return { canBuild: canBuild(), lastBuild: manifest.generated || null, pending }
}

async function buildLocal(stories: string[]) {
	const { replaceStory, writeManifest } = await import('./static-content')
	const store = contentStore()
	for (const story of stories) {
		const prefix = `stories/${story}/`
		const files = []
		for (const key of await store.list(prefix)) {
			const found = await store.getBytes(key)
			if (found) files.push({ path: key.slice(prefix.length), data: new Uint8Array(found.data) })
		}
		await replaceStory(story, files)
	}
	await writeManifest()
}

export async function buildSite(): Promise<BuildResult> {
	const stories = await draftStoryNames()
	const problems: string[] = []
	for (const story of stories) {
		const errors = (await checkStory(story)).filter((d) => d.severity === 'error')
		if (errors.length > 0) problems.push(`${story}: ${errors.length} errors (first: line ${errors[0].line}, ${errors[0].message})`)
	}
	if (problems.length > 0) {
		throw new ContentError(`Fix these errors before you build the site. ${problems.join(' ')}`, 422)
	}

	const hook = env.NETLIFY_BUILD_HOOK_URL
	if (hook) {
		const response = await fetch(hook, { method: 'POST' })
		if (!response.ok) throw new ContentError(`Netlify did not accept the build request (${response.status}).`, 502)
		return { mode: 'hook', stories }
	}
	if (contentStore().kind === 'local') {
		await buildLocal(stories)
		return { mode: 'local', stories }
	}
	throw new ContentError('NETLIFY_BUILD_HOOK_URL is not set, so the dashboard cannot build the site.', 500)
}
