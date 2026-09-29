import { isGameCommand } from './commands'
import { parseCommand } from './yarn/command'
import { player } from './player.svelte'

export interface StoryAssets {
	audio(name: string): string
	image(name: string): string
}

export interface Recording {
	name: string
	label: string
	url: string
	finished: boolean
}

export interface Flash {
	name: string
	url: string
	seconds: number
	id: number
}

export interface Presentation {
	recording: Recording | null
	map: boolean
	flash: Flash | null
}

export const FLASH_SECONDS = 10

export function publishedAssets(story: string): StoryAssets {
	return {
		audio: (name) => `/stories/${story}/audio/${name}.m4a`,
		image: (name) => `/stories/${story}/images/${name}.webp`
	}
}

export function createPresentation(assets: StoryAssets) {
	const state: Presentation = $state({
		recording: null,
		map: false,
		flash: null
	})

	let flashes = 0

	return {
		get state() {
			return state
		},
		beginNode() {
			if (state.recording) player.stop()
			state.recording = null
			state.map = false
			state.flash = null
		},
		finishRecording() {
			if (state.recording) state.recording.finished = true
		},
		// true means the command needs a screen of its own
		handleCommand(command: string): boolean {
			const { name, args } = parseCommand(command)
			if (!isGameCommand(name)) {
				console.warn(`unhandled command <<${command}>>`)
				return false
			}

			switch (name) {
				case 'recording': {
					const [file = '', label = ''] = args
					const url = assets.audio(file)
					state.recording = { name: file, label, url, finished: false }
					player.play(url)
					return true
				}
				case 'map':
					state.map = true
					return false
				case 'flash': {
					const [image = '', seconds] = args
					const duration = Number(seconds)
					state.flash = {
						name: image,
						url: assets.image(image),
						seconds: Number.isFinite(duration) && duration > 0 ? duration : FLASH_SECONDS,
						id: ++flashes
					}
					return false
				}
			}
		}
	}
}
