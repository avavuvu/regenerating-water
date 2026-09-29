import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { getStore, type Store } from '@netlify/blobs'
import { env } from '$env/dynamic/private'
import { STORE_NAME } from '$lib/content'

export type Metadata = Record<string, unknown>

export interface StoredBytes {
	data: ArrayBuffer
	metadata: Metadata
	etag: string | null
}

export interface StoredText {
	text: string
	metadata: Metadata
	etag: string | null
}

export interface ContentStore {
	readonly kind: 'netlify' | 'local'
	getText(key: string): Promise<StoredText | null>
	getBytes(key: string): Promise<StoredBytes | null>
	getMetadata(key: string): Promise<Metadata | null>
	set(key: string, data: string | ArrayBuffer, metadata?: Metadata, ifMatch?: string | null): Promise<string | null>
	list(prefix: string): Promise<string[]>
	delete(key: string): Promise<void>
}


export class ConflictError extends Error {
	constructor() {
		super('Someone else saved this file after you opened it.')
		this.name = 'ConflictError'
	}
}

function netlifyStore(store: Store): ContentStore {
	return {
		kind: 'netlify',
		async getText(key) {
			const found = await store.getWithMetadata(key, { type: 'text', consistency: 'strong' })
			return found ? { text: found.data, metadata: found.metadata, etag: found.etag ?? null } : null
		},
		async getBytes(key) {
			const found = await store.getWithMetadata(key, { type: 'arrayBuffer', consistency: 'strong' })
			return found ? { data: found.data, metadata: found.metadata, etag: found.etag ?? null } : null
		},
		async getMetadata(key) {
			const found = await store.getMetadata(key, { consistency: 'strong' })
			return found?.metadata ?? null
		},
		async set(key, data, metadata = {}, ifMatch) {
			if (ifMatch) {
				const result = await store.set(key, data, { metadata, onlyIfMatch: ifMatch })
				if (!result.modified) throw new ConflictError()
				return result.etag ?? null
			}
			const result = await store.set(key, data, { metadata })
			return result.etag ?? null
		},
		async list(prefix) {
			const keys: string[] = []
			for await (const page of store.list({ prefix, paginate: true })) {
				keys.push(...page.blobs.map((b) => b.key))
			}
			return keys
		},
		async delete(key) {
			await store.delete(key)
		}
	}
}

function hash(data: string | ArrayBuffer | Uint8Array): string {
	return createHash('sha1')
		.update(typeof data === 'string' ? data : new Uint8Array(data))
		.digest('hex')
}

function localStore(root: string): ContentStore {
	const pathFor = (key: string) => {
		const path = resolve(root, key)
		if (!path.startsWith(root + sep)) throw new Error(`invalid key "${key}"`)
		return path
	}
	const metaFor = (key: string) => `${pathFor(key)}.meta.json`

	async function readMeta(key: string): Promise<Metadata> {
		try {
			return JSON.parse(await readFile(metaFor(key), 'utf8')) as Metadata
		} catch {
			return {}
		}
	}

	async function exists(key: string): Promise<Buffer | null> {
		try {
			return await readFile(pathFor(key))
		} catch {
			return null
		}
	}

	async function walk(dir: string): Promise<string[]> {
		let entries
		try {
			entries = await readdir(dir, { withFileTypes: true })
		} catch {
			return []
		}
		const files: string[] = []
		for (const entry of entries) {
			const path = join(dir, entry.name)
			if (entry.isDirectory()) files.push(...(await walk(path)))
			else if (!entry.name.endsWith('.meta.json')) files.push(relative(root, path).split(sep).join('/'))
		}
		return files
	}

	return {
		kind: 'local',
		async getText(key) {
			const data = await exists(key)
			if (!data) return null
			return { text: data.toString('utf8'), metadata: await readMeta(key), etag: hash(data) }
		},
		async getBytes(key) {
			const data = await exists(key)
			if (!data) return null
			const bytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
			return { data: bytes, metadata: await readMeta(key), etag: hash(data) }
		},
		async getMetadata(key) {
			return (await exists(key)) ? readMeta(key) : null
		},
		async set(key, data, metadata = {}, ifMatch) {
			if (ifMatch) {
				const current = await exists(key)
				if (current && hash(current) !== ifMatch) throw new ConflictError()
			}
			const path = pathFor(key)
			await mkdir(dirname(path), { recursive: true })
			await writeFile(path, typeof data === 'string' ? data : new Uint8Array(data))
			await writeFile(metaFor(key), JSON.stringify(metadata))
			return hash(data)
		},
		async list(prefix) {
			return (await walk(root)).filter((key) => key.startsWith(prefix)).sort()
		},
		async delete(key) {
			await rm(pathFor(key), { force: true })
			await rm(metaFor(key), { force: true })
		}
	}
}

let local: ContentStore | null = null

function useLocal(): ContentStore {
	local ??= localStore(resolve('.content-dev'))
	return local
}

export function contentStore(): ContentStore {
	const mode = env.CONTENT_STORE
	if (mode === 'local') return useLocal()
	if (mode === 'netlify') return netlifyStore(getStore(STORE_NAME))
	try {
		return netlifyStore(getStore(STORE_NAME))
	} catch {
		return useLocal()
	}
}
