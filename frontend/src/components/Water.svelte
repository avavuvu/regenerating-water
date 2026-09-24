<script lang="ts">
	import { untrack } from 'svelte'
	import type { Attachment } from 'svelte/attachments'

	const {
		clear = false,
		chars = [' -', ' #'],
		fadeSeconds = 1.5,
		speed = 0.2
	}: {
		clear?: boolean
		chars?: string[]
		fadeSeconds?: number
		speed?: number
	} = $props()

	// a threshold per cell that survives resizes, so cells keep their fade order
	const thresholds = new Map<string, number>()
	function threshold(x: number, y: number): number {
		const key = `${x},${y}`
		let t = thresholds.get(key)
		if (t === undefined) {
			t = Math.random()
			thresholds.set(key, t)
		}
		return t
	}

	const animate: Attachment<HTMLCanvasElement> = (canvas) => {
		const context = canvas.getContext('2d')!
		const cellChars = Math.max(...chars.map((c) => c.length))

		let cols = 0
		let rows = 0
		let cellWidth = 0
		let cellHeight = 0
		let width = 0
		let height = 0
		let font = ''

		// canvas px must equal css px, so the glyphs are the page's glyphs
		const fit = () => {
			const style = getComputedStyle(canvas)
			const dpr = window.devicePixelRatio || 1
			font = `${style.fontSize} ${style.fontFamily}`
			context.font = font
			cellWidth = context.measureText('M'.repeat(cellChars)).width
			cellHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2

			width = canvas.clientWidth
			height = canvas.clientHeight
			cols = Math.max(1, Math.floor(width / cellWidth))
			rows = Math.max(1, Math.floor(height / cellHeight))

			canvas.width = Math.round(width * dpr)
			canvas.height = Math.round(height * dpr)
			context.setTransform(dpr, 0, 0, dpr, 0, 0)
		}

		fit()
		const observer = new ResizeObserver(fit)
		observer.observe(canvas)

		const start = performance.now()
		let last = start
		// untracked: a change of `clear` must not re-run the attachment
		let fadeAmount = untrack(() => clear) ? 1 : 0

		let raf: number

		const draw = (now: number) => {
			const time = (now - start) / 1000
			const dt = (now - last) / 1000
			last = now

			const target = clear ? 1 : 0
			const delta = target - fadeAmount
			fadeAmount += Math.sign(delta) * Math.min(Math.abs(delta), dt / fadeSeconds)

			context.clearRect(0, 0, width, height)

			if (fadeAmount < 1) {
				context.fillStyle = getComputedStyle(canvas).color
				context.font = font
				context.textBaseline = 'top'

				for (let y = 0; y < rows; y++) {
					for (let x = 0; x < cols; x++) {
						if (threshold(x, y) <= fadeAmount) continue

						const dist = Math.sqrt(x * x + y * y)
						const phase = Math.abs(
							Math.floor(time * speed - dist * 0.09 + (Math.sin(x) + Math.sin(y)) * 0.2)
						)
						context.fillText(chars[phase % chars.length], x * cellWidth, y * cellHeight)
					}
				}
			}

			raf = requestAnimationFrame(draw)
		}

		raf = requestAnimationFrame(draw)
		return () => {
			cancelAnimationFrame(raf)
			observer.disconnect()
		}
	}
</script>

<canvas {@attach animate} aria-hidden="true"></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		height: 100%;
		min-height: 4rem;
		line-height: 0.75;
		font-size: 0.75em;
	}
</style>
