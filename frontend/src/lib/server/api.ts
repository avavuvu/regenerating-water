import { json } from '@sveltejs/kit'
import { ContentError } from './content'
import { ConflictError } from './store'

export async function respond(action: () => Promise<Response>): Promise<Response> {
	try {
		return await action()
	} catch (error) {
		if (error instanceof ContentError) return json({ message: error.message }, { status: error.status })
		if (error instanceof ConflictError) return json({ message: error.message }, { status: 409 })
		console.error(error)
		const message = error instanceof Error ? error.message : String(error)
		return json({ message: `The server had a problem: ${message}` }, { status: 500 })
	}
}

export async function readJson<T>(request: Request): Promise<T> {
	try {
		return (await request.json()) as T
	} catch {
		throw new ContentError('The request is not valid JSON.')
	}
}
