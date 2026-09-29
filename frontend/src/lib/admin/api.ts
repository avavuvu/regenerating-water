import { goto } from '$app/navigation'

export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message)
		this.name = 'ApiError'
	}
}

export async function api<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
	let response: Response
	try {
		response = await fetch(url, init)
	} catch {
		throw new ApiError('The server did not answer. Check the internet connection.', 0)
	}
	if (response.status === 401) {
		await goto('/admin/login')
		throw new ApiError('Please log in again.', 401)
	}
	if (response.status === 204) return undefined as T
	const body = await response.json().catch(() => null)
	if (!response.ok) {
		const message = body && typeof body.message === 'string' ? body.message : `The request failed (${response.status}).`
		throw new ApiError(message, response.status)
	}
	return body as T
}

export function postJson<T = unknown>(url: string, data: unknown): Promise<T> {
	return api<T>(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(data)
	})
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDuration(seconds: number | null): string {
	if (seconds === null || !Number.isFinite(seconds)) return '-'
	const minutes = Math.floor(seconds / 60)
	const rest = Math.round(seconds % 60)
	return `${minutes}:${String(rest).padStart(2, '0')}`
}
