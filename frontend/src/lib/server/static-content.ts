import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { ALL_FORMATS, BufferSource, Input } from 'mediabunny'
import { ASSET_KINDS, EXTENSIONS, type AssetInfo, type LiveManifest, type LiveStory } from '../content'
import { analyseStory, type Diagnostic } from '../yarn/validate'

export const STORIES_DIR = resolve('static/stories')
export const MANIFEST_FILE = join(STORIES_DIR, 'index.json')

export interface StoryFile {
	path: string
	data: string | Uint8Array
}

async function list(dir: string): Promise<string[]> {
	try {
		return (await readdir(dir)).sort()
	} catch {
		return []
	}
}

async function exists(path: string): Promise<boolean> {
	try {
		await stat(path)
		return true
	} catch {
		return false
	}
}

export async function staticStoryNames(): Promise<string[]> {
	const names: string[] = []
	for (const name of await list(STORIES_DIR)) {
		if (await exists(join(STORIES_DIR, name, 'story.yarn'))) names.push(name)
	}
	return names
}

export async function replaceStory(story: string, files: StoryFile[]) {
	const dir = join(STORIES_DIR, story)
	await rm(dir, { recursive: true, force: true })
	for (const file of files) {
		const path = resolve(dir, file.path)
		if (!path.startsWith(dir + sep)) throw new Error(`invalid path "${file.path}"`)
		await mkdir(dirname(path), { recursive: true })
		await writeFile(path, file.data)
	}
}

export async function audioDuration(data: Uint8Array): Promise<number | null> {
	try {
		const input = new Input({ source: new BufferSource(data), formats: ALL_FORMATS })
		return await input.computeDuration()
	} catch {
		return null
	}
}

async function describeStory(story: string): Promise<LiveStory> {
	const dir = join(STORIES_DIR, story)
	const assets: AssetInfo[] = []
	for (const kind of ASSET_KINDS) {
		const extension = `.${EXTENSIONS[kind]}`
		for (const file of await list(join(dir, kind))) {
			if (!file.endsWith(extension)) continue
			const path = join(dir, kind, file)
			const info = await stat(path)
			assets.push({
				kind,
				name: file.slice(0, -extension.length),
				size: info.size,
				updated: info.mtime.toISOString(),
				duration: kind === 'audio' ? await audioDuration(await readFile(path)) : null
			})
		}
	}
	return { script: await exists(join(dir, 'story.yarn')), assets }
}

export async function writeManifest(): Promise<LiveManifest> {
	const manifest: LiveManifest = { generated: new Date().toISOString(), stories: {} }
	for (const story of await staticStoryNames()) {
		manifest.stories[story] = await describeStory(story)
	}
	await mkdir(STORIES_DIR, { recursive: true })
	await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, '\t'))
	return manifest
}

export async function validateStaticStories(manifest: LiveManifest): Promise<Record<string, Diagnostic[]>> {
	const results: Record<string, Diagnostic[]> = {}
	for (const [story, info] of Object.entries(manifest.stories)) {
		const source = await readFile(join(STORIES_DIR, story, 'story.yarn'), 'utf8')
		const { diagnostics } = analyseStory(source, {
			audio: info.assets.filter((a) => a.kind === 'audio').map((a) => a.name),
			images: info.assets.filter((a) => a.kind === 'images').map((a) => a.name)
		})
		results[story] = diagnostics
	}
	return results
}
