import { getStore, type Store } from '@netlify/blobs'
import { STORE_NAME, isStoryFilePath, isStoryName } from '../src/lib/content'
import {
	replaceStory,
	validateStaticStories,
	writeManifest,
	type StoryFile
} from '../src/lib/server/static-content'

const onNetlify = process.env.NETLIFY === 'true'

function openStore(): Store | null {
	try {
		return getStore(STORE_NAME)
	} catch {}
	const siteID = process.env.SITE_ID
	const token = process.env.NETLIFY_BLOBS_TOKEN
	if (siteID && token) return getStore({ name: STORE_NAME, siteID, token })
	return null
}

async function pull(store: Store) {
	const keys: string[] = []
	for await (const page of store.list({ prefix: 'stories/', paginate: true })) {
		keys.push(...page.blobs.map((b) => b.key))
	}

	const byStory = new Map<string, string[]>()
	for (const key of keys) {
		const [, story] = key.split('/')
		if (!story || !isStoryName(story)) continue
		byStory.set(story, [...(byStory.get(story) ?? []), key])
	}

	for (const [story, storyKeys] of byStory) {
		const prefix = `stories/${story}/`
		if (!storyKeys.includes(`${prefix}story.yarn`)) continue

		const files: StoryFile[] = []
		for (const key of storyKeys) {
			const path = key.slice(prefix.length)
			if (!isStoryFilePath(path)) continue
			const data = await store.get(key, { type: 'arrayBuffer', consistency: 'strong' })
			if (data) files.push({ path, data: new Uint8Array(data) })
		}
		await replaceStory(story, files)
		console.log(`content: "${story}" updated from the dashboard (${files.length} files)`)
	}
}

async function main() {
	if (process.env.CONTENT_SYNC !== 'off') {
		const store = openStore()
		if (store) {
			await pull(store)
		} else if (onNetlify) {
			throw new Error(
				'content: the Netlify Blobs store is not available. Set NETLIFY_BLOBS_TOKEN, or set CONTENT_SYNC=off to deploy the files in git.'
			)
		} else {
			console.log('content: no Netlify Blobs store, so the files in static/stories are used')
		}
	}

	const manifest = await writeManifest()
	const results = await validateStaticStories(manifest)
	let errors = 0
	for (const [story, diagnostics] of Object.entries(results)) {
		for (const d of diagnostics) {
			if (d.severity === 'error') errors++
			console.log(`content: ${story}/story.yarn:${d.line} ${d.severity}: ${d.message}`)
		}
	}
	console.log(`content: ${Object.keys(results).length} stories checked, ${errors} errors`)
	if (errors > 0 && process.env.CONTENT_STRICT !== 'off') {
		throw new Error('content: the stories have errors, so the build stopped. The live site does not change.')
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
