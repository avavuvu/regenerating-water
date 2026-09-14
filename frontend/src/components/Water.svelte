<script lang="ts">
	import { untrack } from 'svelte'
	import type { Attachment } from 'svelte/attachments'

	const {
		clear = false,
		cols = 50,
		rows = 50,
		chars = ['  - ', '  # '],
		fadeSeconds = 1.5
	}: {
		clear?: boolean
		cols?: number
		rows?: number
		chars?: string[]
		fadeSeconds?: number
	} = $props()

	const CELL = 10

	const animate: Attachment<HTMLCanvasElement> = (canvas) => {
		const context = canvas.getContext('2d')!
		const dpr = window.devicePixelRatio || 1
		const width = cols * CELL
		const height = rows * CELL

		canvas.width = width * dpr
		canvas.height = height * dpr
		context.scale(dpr, dpr)

		const start = performance.now()
		let last = start
		// untracked: a change of `clear` must not re-run the attachment
		let fadeAmount = untrack(() => clear) ? 1 : 0

		const thresholds = Float32Array.from({ length: cols * rows }, () => Math.random())

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
				context.font = `${CELL * 0.9}px "Times New Roman", serif`
				context.textBaseline = 'top'

				for (let y = 0; y < rows; y++) {
					for (let x = 0; x < cols; x++) {
						if (thresholds[y * cols + x] <= fadeAmount) continue

						const dist = Math.sqrt(x * x + y * y)
						const phase = Math.abs(
							Math.floor(time / 2 - dist * 0.09 + (Math.sin(x) + Math.sin(y)) * 0.2)
						)
						context.fillText(chars[phase % chars.length], x * CELL, y * CELL)
					}
				}
			}

			raf = requestAnimationFrame(draw)
		}

		raf = requestAnimationFrame(draw)
		return () => cancelAnimationFrame(raf)
	}
</script>

<canvas {@attach animate} aria-hidden="true"></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		height: auto;
		min-height: 4rem;
	}
</style>
