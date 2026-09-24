import { parseCommand } from './yarn/command'
import { player } from './player.svelte'

export interface Recording {
	name: string
	label: string
	url: string
	finished: boolean
}

export interface Presentation {
	recording: Recording | null
	map: boolean
	listen: boolean
}


export function createPresentation(story: string) {
	const state: Presentation = $state({
		recording: null,
		map: false,
		listen: false
	})

	return {
		get state() {
			return state
		},
		beginNode() {
			if (state.recording) player.stop()
			state.recording = null
			state.map = false
			state.listen = false
		},

		finishRecording() {
			if (state.recording) state.recording.finished = true
		},
		// true means the command needs a screen of its own
		handleCommand(command: string): boolean {
			const { name, args } = parseCommand(command)

			switch (name) {
				case 'recording': {
					const [file = '', label = ''] = args
					const url = `/${story}/${file}`
					state.recording = { name: file, label, url, finished: false }
					player.play(url)
					return true
				}
				case 'map':
					state.map = true
					return false
				case 'listen':
					state.listen = true
					return false
				default:
					console.warn(`unhandled command <<${command}>>`)
					return false
			}
		}
	}
}
