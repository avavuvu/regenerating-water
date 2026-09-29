export interface PlayerState {
	url: string | null
	playing: boolean
	loaded: boolean
	blocked: boolean
	failed: boolean
	currentTime: number
	duration: number
}

const state: PlayerState = $state({
	url: null,
	playing: false,
	loaded: false,
	blocked: false,
	failed: false,
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
		state.blocked = false
	})
	a.addEventListener('pause', () => {
		state.playing = false
	})
	a.addEventListener('ended', () => {
		state.playing = false
		endedListeners.forEach((fn) => fn())
	})
	a.addEventListener('error', () => {
		if (!a.getAttribute('src')) return
		state.playing = false
		state.failed = true
		errorListeners.forEach((fn) => fn())
	})
	element = a
	return a
}

function start(a: HTMLAudioElement) {
	a.play().catch((error: unknown) => {
		if (error instanceof DOMException && error.name === 'NotAllowedError') state.blocked = true
	})
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
			state.failed = false
			state.blocked = false
			state.currentTime = 0
			state.duration = 0
			a.src = url
		}
		start(a)
	},
	toggle() {
		const a = audio()
		if (a.paused) start(a)
		else a.pause()
	},
	stop() {
		if (!element) return
		element.pause()
		element.removeAttribute('src')
		element.load()
		state.url = null
		state.loaded = false
		state.failed = false
		state.blocked = false
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
