import {
	ALL_FORMATS,
	BlobSource,
	BufferTarget,
	Conversion,
	Input,
	Mp4OutputFormat,
	Output,
	canEncodeAudio
} from 'mediabunny'
import { CHUNK_BYTES, type AssetInfo, type AssetKind } from '$lib/content'
import { api, postJson } from './api'

export const AUDIO_BITRATE = 96_000
export const IMAGE_MAX_HEIGHT = 1800
export const IMAGE_QUALITY = 0.88

export interface Prepared {
	blob: Blob
	duration: number | null
}

let aacReady: Promise<void> | null = null

function ensureAacEncoder(): Promise<void> {
	aacReady ??= (async () => {
		if (!(await canEncodeAudio('aac'))) {
			const { registerAacEncoder } = await import('@mediabunny/aac-encoder')
			registerAacEncoder()
		}
	})()
	return aacReady
}

export async function prepareAudio(file: File, onProgress: (fraction: number) => void): Promise<Prepared> {
	await ensureAacEncoder()
	const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS })
	const output = new Output({
		format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
		target: new BufferTarget()
	})
	const conversion = await Conversion.init({
		input,
		output,
		video: { discard: true },
		audio: { codec: 'aac', bitrate: AUDIO_BITRATE, forceTranscode: true }
	})
	if (!conversion.isValid || conversion.utilizedTracks.length === 0) {
		throw new Error('The browser cannot read audio from this file. Use a WAV, MP3, M4A, or FLAC file.')
	}
	conversion.onProgress = (progress) => onProgress(progress)
	await conversion.execute()

	const buffer = output.target.buffer
	if (!buffer) throw new Error('The audio conversion did not make a file.')
	const duration = await input.computeDuration().catch(() => null)
	return { blob: new Blob([buffer], { type: 'audio/mp4' }), duration }
}

export async function prepareImage(file: File): Promise<Prepared> {
	const bitmap = await createImageBitmap(file).catch(() => {
		throw new Error('The browser cannot read this image. Use a PNG, JPEG, or WebP file.')
	})
	const scale = Math.min(1, IMAGE_MAX_HEIGHT / bitmap.height)
	const canvas = document.createElement('canvas')
	canvas.width = Math.round(bitmap.width * scale)
	canvas.height = Math.round(bitmap.height * scale)
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
	bitmap.close()

	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', IMAGE_QUALITY))
	if (blob?.type === 'image/webp') return { blob, duration: null }
	if (file.type === 'image/webp') return { blob: file, duration: null }
	throw new Error('This browser cannot make WebP images. Use Chrome or Firefox, or upload a .webp file.')
}

export async function uploadAsset(
	story: string,
	kind: AssetKind,
	name: string,
	prepared: Prepared,
	onProgress: (fraction: number) => void
): Promise<AssetInfo> {
	const upload = crypto.randomUUID()
	const parts = Math.max(1, Math.ceil(prepared.blob.size / CHUNK_BYTES))
	for (let index = 0; index < parts; index++) {
		const chunk = prepared.blob.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES)
		await api(`/admin/api/uploads/${upload}/${index}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/octet-stream' },
			body: chunk
		})
		onProgress((index + 1) / parts)
	}
	return postJson<AssetInfo>(`/admin/api/stories/${story}/assets/${kind}/${name}`, {
		upload,
		parts,
		duration: prepared.duration
	})
}
