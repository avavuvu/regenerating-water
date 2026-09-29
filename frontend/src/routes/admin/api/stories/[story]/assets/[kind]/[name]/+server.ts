import { json } from '@sveltejs/kit'
import { CONTENT_TYPES, isAssetKind } from '$lib/content'
import { readJson, respond } from '$lib/server/api'
import { ContentError, commitUpload, deleteAsset, getAsset } from '$lib/server/content'
import type { RequestHandler } from './$types'

const MAX_RANGE_BYTES = 2 * 1024 * 1024

function parseRange(header: string | null, size: number): [number, number] | null {
	const match = header ? /^bytes=(\d*)-(\d*)$/.exec(header.trim()) : null
	if (!match) return null
	let start: number
	let end: number
	if (match[1] === '') {
		const suffix = Number(match[2])
		start = Math.max(0, size - suffix)
		end = size - 1
	} else {
		start = Number(match[1])
		end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1)
	}
	if (!Number.isFinite(start) || start > end || start >= size) return null
	return [start, Math.min(end, start + MAX_RANGE_BYTES - 1)]
}

export const GET: RequestHandler = ({ params, request }) =>
	respond(async () => {
		const found = await getAsset(params.story, params.kind, params.name)
		if (!found || !isAssetKind(params.kind)) throw new ContentError('This file does not exist.', 404)

		const size = found.data.byteLength
		const headers = {
			'content-type': CONTENT_TYPES[params.kind],
			'accept-ranges': 'bytes',
			'cache-control': 'no-store'
		}
		const rangeHeader = request.headers.get('range')
		const range = parseRange(rangeHeader, size)

		if (rangeHeader && !range) {
			return new Response(null, { status: 416, headers: { ...headers, 'content-range': `bytes */${size}` } })
		}
		if (range) {
			const [start, end] = range
			return new Response(found.data.slice(start, end + 1), {
				status: 206,
				headers: {
					...headers,
					'content-range': `bytes ${start}-${end}/${size}`,
					'content-length': String(end - start + 1)
				}
			})
		}
		return new Response(found.data, { headers: { ...headers, 'content-length': String(size) } })
	})

export const POST: RequestHandler = ({ params, request }) =>
	respond(async () => {
		const { upload, parts, duration } = await readJson<{ upload?: string; parts?: number; duration?: number | null }>(request)
		const asset = await commitUpload(
			params.story,
			params.kind,
			params.name,
			String(upload ?? ''),
			Number(parts),
			typeof duration === 'number' && Number.isFinite(duration) ? duration : null
		)
		return json(asset, { status: 201 })
	})

export const DELETE: RequestHandler = ({ params }) =>
	respond(async () => {
		await deleteAsset(params.story, params.kind, params.name)
		return new Response(null, { status: 204 })
	})
