import type { Cookies } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'

export const SESSION_COOKIE = 'river_walk_admin'
const SESSION_SECONDS = 60 * 60 * 24 * 90

const encoder = new TextEncoder()

function secret(): string | null {
	return env.ADMIN_SECRET || env.ADMIN_PASSWORD || null
}

export function isConfigured(): boolean {
	return !!env.ADMIN_PASSWORD
}

async function sign(value: string, key: string): Promise<string> {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		encoder.encode(key),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	)
	const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value))
	return Buffer.from(signature).toString('base64url')
}

function equal(a: string, b: string): boolean {
	const left = encoder.encode(a)
	const right = encoder.encode(b)
	let difference = left.length ^ right.length
	for (let i = 0; i < Math.max(left.length, right.length); i++) {
		difference |= (left[i] ?? 0) ^ (right[i] ?? 0)
	}
	return difference === 0
}

export async function checkPassword(password: string): Promise<boolean> {
	const expected = env.ADMIN_PASSWORD
	const key = secret()
	if (!expected || !key) return false
	return equal(await sign(password, key), await sign(expected, key))
}

export async function startSession(cookies: Cookies, secure: boolean) {
	const key = secret()
	if (!key) return
	const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS
	const value = `${expires}.${await sign(String(expires), key)}`
	cookies.set(SESSION_COOKIE, value, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure,
		maxAge: SESSION_SECONDS
	})
}


export async function hasSession(cookies: Cookies): Promise<boolean> {
	const key = secret()
	const value = cookies.get(SESSION_COOKIE)
	if (!key || !value) return false
	const [expires, signature] = value.split('.')
	if (!expires || !signature || Number(expires) < Date.now() / 1000) return false
	return equal(signature, await sign(expires, key))
}
