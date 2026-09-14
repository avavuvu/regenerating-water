export interface PlayerState {
	url: string | null
	playing: boolean
	loaded: boolean
	currentTime: number
	duration: number
}

const state: PlayerState = $state({
	url: null,
	playing: false,
	loaded: false,
	currentTime: 0,
	duration: 0
})

const endedListeners = new Set<() => void>()
const errorListeners = new Set<() => void>()

let element: HTMLAudioElement | null = null

function audio(): HTMLAudioElement {
	if (element) return element
	const a = new Audio()
	a.preload = 'auto'
	a.addEventListener('loadedmetadata', () => {
		state.duration = a.duration
		state.loaded = true
	})
	a.addEventListener('timeupdate', () => {
		state.currentTime = a.currentTime
	})
	a.addEventListener('play', () => {
		state.playing = true
	})
	a.addEventListener('pause', () => {
		state.playing = false
	})
	a.addEventListener('ended', () => {
		state.playing = false
		endedListeners.forEach((fn) => fn())
	})
	a.addEventListener('error', () => {
		errorListeners.forEach((fn) => fn())
	})
	element = a
	return a
}

function extension(a: HTMLAudioElement): string {
	return a.canPlayType('audio/ogg; codecs=opus') ? 'opus' : 'm4a'
}

// one audio element for the whole app. play() must run synchronously
// inside the user's tap for safari to permit it, so callers invoke it
// directly from click handlers, before any navigation
export const player = {
	get state() {
		return state
	},
	play(url: string) {
		const a = audio()
		if (state.url !== url) {
			state.url = url
			state.loaded = false
			state.currentTime = 0
			state.duration = 0
			a.src = `${url}.${extension(a)}`
		}
		a.play().catch(() => {})
	},
	toggle() {
		const a = audio()
		if (a.paused) a.play().catch(() => {})
		else a.pause()
	},
	stop() {
		if (!element) return
		element.pause()
		element.removeAttribute('src')
		element.load()
		state.url = null
		state.loaded = false
		state.currentTime = 0
		state.duration = 0
	},
	onEnded(fn: () => void) {
		endedListeners.add(fn)
		return () => endedListeners.delete(fn)
	},
	onError(fn: () => void) {
		errorListeners.add(fn)
		return () => errorListeners.delete(fn)
	}
}
