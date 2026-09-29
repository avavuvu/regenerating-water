export type AssetKind = 'audio' | 'images'

export const ASSET_KINDS: readonly AssetKind[] = ['audio', 'images']

export const EXTENSIONS: Record<AssetKind, string> = {
	audio: 'm4a',
	images: 'webp'
}

export const CONTENT_TYPES: Record<AssetKind, string> = {
	audio: 'audio/mp4',
	images: 'image/webp'
}

export const CHUNK_BYTES = 4 * 1024 * 1024

export const STORE_NAME = 'river-walk-content'

export function scriptKey(story: string): string {
	return `stories/${story}/story.yarn`
}

export function assetKey(story: string, kind: AssetKind, name: string): string {
	return `stories/${story}/${kind}/${name}.${EXTENSIONS[kind]}`
}

export function isStoryFilePath(path: string): boolean {
	if (path === 'story.yarn') return true
	const [kind, file, ...rest] = path.split('/')
	if (rest.length > 0 || !file || !isAssetKind(kind)) return false
	const extension = `.${EXTENSIONS[kind]}`
	return file.endsWith(extension) && isAssetName(file.slice(0, -extension.length))
}

const STORY_NAME = /^[a-z0-9][a-z0-9_-]{0,63}$/
const ASSET_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/

const RESERVED_STORY_NAMES = new Set(['api', 'login'])

export function isStoryName(name: string): boolean {
	return STORY_NAME.test(name) && !RESERVED_STORY_NAMES.has(name)
}

export function isAssetName(name: string): boolean {
	return ASSET_NAME.test(name)
}

export function isAssetKind(kind: string): kind is AssetKind {
	return (ASSET_KINDS as readonly string[]).includes(kind)
}

export function assetNameFromFile(fileName: string): string {
	return fileName
		.replace(/\.[^.]+$/, '')
		.replace(/[^A-Za-z0-9_-]+/g, '_')
		.replace(/^[^A-Za-z0-9]+/, '')
		.slice(0, 100)
}

export function assetFileName(kind: AssetKind, name: string): string {
	return `${name}.${EXTENSIONS[kind]}`
}

export interface AssetInfo {
	kind: AssetKind
	name: string
	size: number
	updated: string | null
	duration: number | null
}

export interface LiveStory {
	script: boolean
	assets: AssetInfo[]
}

export interface BuildStatus {
	canBuild: boolean
	lastBuild: string | null
	pending: boolean
}

export interface LiveManifest {
	generated: string
	stories: Record<string, LiveStory>
}

export const STARTER_SCRIPT = `title: Start
display: screen
---
Welcome to a new walk.

-> Begin
    <<jump FirstStop>>
===

title: FirstStop
lat: -37.8136
long: 144.9631
---
<<map>>

Walk to the first stop.

Once you arrive, press play...
===
`
