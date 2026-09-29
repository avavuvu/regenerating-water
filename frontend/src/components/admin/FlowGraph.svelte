<script lang="ts">
	import { Graph, layout as runLayout, type EdgeLabel, type GraphLabel, type NodeLabel, type Point } from '@dagrejs/dagre'
	import type { Diagnostic, OutlineNode } from '$lib/yarn/validate'

	const {
		nodes,
		diagnostics,
		onselect
	}: { nodes: OutlineNode[]; diagnostics: Diagnostic[]; onselect: (node: OutlineNode) => void } = $props()

	const WIDTH = 200
	const HEIGHT = 52
	const LABEL_CHARS = 28
	const LABEL_CHAR_WIDTH = 6.2
	const LABEL_HEIGHT = 16

	interface Box {
		node: OutlineNode
		x: number
		y: number
	}

	interface EdgeData extends EdgeLabel {
		text: string | null
		full: string
		conditional: boolean
	}

	interface Edge {
		d: string
		back: boolean
		label: { x: number; y: number; text: string; full: string; conditional: boolean } | null
	}

	function shorten(text: string): string {
		return text.length > LABEL_CHARS ? `${text.slice(0, LABEL_CHARS - 1)}…` : text
	}

	function smooth(points: Point[]): string {
		if (points.length === 0) return ''
		let d = `M ${points[0].x} ${points[0].y}`
		for (let i = 1; i < points.length - 1; i++) {
			const next = points[i + 1]
			const midX = (points[i].x + next.x) / 2
			const midY = (points[i].y + next.y) / 2
			d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`
		}
		const last = points[points.length - 1]
		return `${d} L ${last.x} ${last.y}`
	}

	const layout = $derived.by(() => {
		const graph = new Graph<GraphLabel, NodeLabel, EdgeData>({ multigraph: true })
		graph.setGraph({ rankdir: 'TB', nodesep: 36, edgesep: 16, ranksep: 56, marginx: 24, marginy: 24 })

		const byTitle = new Map<string, OutlineNode>()
		const ordered = [...nodes].sort((a, b) => Number(b.title === 'Start') - Number(a.title === 'Start'))
		for (const node of ordered) {
			if (byTitle.has(node.title)) continue
			byTitle.set(node.title, node)
			graph.setNode(node.title, { width: WIDTH, height: HEIGHT })
		}

		for (const node of byTitle.values()) {
			node.links.forEach((link, index) => {
				if (!byTitle.has(link.target)) return
				const text = link.label ? shorten(link.label) : null
				graph.setEdge(
					node.title,
					link.target,
					{
						text,
						full: link.label ? (link.condition ? `${link.label} (if ${link.condition})` : link.label) : '',
						conditional: !!link.condition,
						width: text ? text.length * LABEL_CHAR_WIDTH + 8 : 0,
						height: text ? LABEL_HEIGHT : 0,
						labelpos: 'c'
					},
					String(index)
				)
			})
		}

		runLayout(graph)

		const boxes: Box[] = [...byTitle.values()].map((node) => {
			const { x = 0, y = 0 } = graph.node(node.title)
			return { node, x: x - WIDTH / 2, y: y - HEIGHT / 2 }
		})

		const edges: Edge[] = graph.edges().map((e) => {
			const data = graph.edge(e)
			const from = graph.node(e.v)
			const to = graph.node(e.w)
			return {
				d: smooth(data.points ?? []),
				back: (to.y ?? 0) <= (from.y ?? 0),
				label:
					data.text && data.x !== undefined && data.y !== undefined
						? { x: data.x, y: data.y, text: data.text, full: data.full, conditional: data.conditional }
						: null
			}
		})

		const size = graph.graph()
		return { boxes, edges, width: size.width ?? 0, height: size.height ?? 0 }
	})

	const problems = $derived.by(() => {
		const result = new Map<string, 'error' | 'warning'>()
		for (const d of diagnostics) {
			if (!d.node) continue
			if (d.severity === 'error' || !result.has(d.node)) result.set(d.node, d.severity)
		}
		return result
	})

	function summary(node: OutlineNode): string {
		const parts: string[] = []
		for (const command of node.commands) {
			if (command.name === 'recording') parts.push(`♪ ${command.args[0] ?? ''}`)
			else if (command.name === 'map') parts.push('map')
			else if (command.name === 'flash') parts.push(`flash ${command.args[0] ?? ''}`)
		}
		if (node.headers.year) parts.push(node.headers.year)
		return parts.join(' · ')
	}
</script>

<div class="graph">
	<svg width={layout.width} height={layout.height} role="img" aria-label="story flow">
		<defs>
			<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
				<path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
			</marker>
		</defs>

		{#each layout.edges as edge, i (i)}
			<path class="edge" class:back={edge.back} d={edge.d} marker-end="url(#arrow)" />
		{/each}

		{#each layout.edges as edge, i (i)}
			{#if edge.label}
				<text
					class="label"
					class:conditional={edge.label.conditional}
					x={edge.label.x}
					y={edge.label.y}
					text-anchor="middle"
					dominant-baseline="middle"
				>
					<title>{edge.label.full}</title>
					{edge.label.text}
				</text>
			{/if}
		{/each}

		{#each layout.boxes as box (box.node.title)}
			<g
				class="node {problems.get(box.node.title) ?? ''}"
				transform="translate({box.x} {box.y})"
				role="button"
				tabindex="0"
				onclick={() => onselect(box.node)}
				onkeydown={(event) => (event.key === 'Enter' || event.key === ' ') && onselect(box.node)}
			>
				<rect width={WIDTH} height={HEIGHT} />
				<text x="10" y="20" class="title">{box.node.title}</text>
				<text x="10" y="39" class="summary">{summary(box.node)}</text>
			</g>
		{/each}
	</svg>
</div>

<style>
	.graph {
		overflow: auto;
		height: 100%;
		color: var(--color-foreground);
	}

	svg {
		display: block;
		font-family: var(--font-family);
	}

	.edge {
		fill: none;
		stroke: var(--color-muted);
		stroke-width: 1.25;

		&.back {
			stroke-dasharray: 4 4;
		}
	}

	.label {
		font-size: 12px;
		fill: var(--color-yellow);
		paint-order: stroke;
		stroke: var(--color-surface);
		stroke-width: 4px;
		cursor: help;

		&.conditional {
			font-style: italic;
		}
	}

	.node {
		cursor: pointer;

		& rect {
			fill: var(--color-surface);
			stroke: var(--color-foreground);
			stroke-width: 1;
		}

		& .title {
			fill: var(--color-foreground);
			font-size: 14px;
			font-weight: 700;
		}

		& .summary {
			fill: var(--color-soft);
			font-size: 12px;
		}

		&:hover rect,
		&:focus-visible rect {
			fill: var(--color-hover);
		}

		&:focus {
			outline: none;
		}

		&.warning rect {
			stroke: var(--color-warning);
			stroke-width: 2;
		}

		&.error rect {
			stroke: var(--color-error);
			stroke-width: 3;
		}
	}
</style>
