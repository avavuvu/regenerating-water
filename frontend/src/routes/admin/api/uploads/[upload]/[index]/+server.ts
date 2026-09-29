import { json } from '@sveltejs/kit'
import { CHUNK_BYTES } from '$lib/content'
import { respond } from '$lib/server/api'
import { ContentError, putChunk } from '$lib/server/content'
import type { RequestHandler } from './$types'

export const PUT: RequestHandler = ({ params, request }) =>
	respond(async () => {
		const data = await request.arrayBuffer()
		if (data.byteLength === 0) throw new ContentError('The upload part is empty.')
		if (data.byteLength > CHUNK_BYTES) throw new ContentError('The upload part is too large.', 413)
		await putChunk(params.upload, Number(params.index), data)
		return json({ received: data.byteLength })
	})
