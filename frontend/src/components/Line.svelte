<script lang="ts">
	import type { MarkupAttribute } from '$lib/yarn/markup'

	const { text, markup = [] }: { text: string; markup?: MarkupAttribute[] } = $props()

	interface Segment {
		text: string
		names: string[]
	}

	const character = $derived(
		markup.find((m) => m.name === 'character')?.properties?.name as string | undefined
	)

	const ranges = $derived(
		markup.filter(
			(m): m is MarkupAttribute & { position: number; length: number } =>
				m.name !== 'character' && typeof m.position === 'number' && typeof m.length === 'number'
		)
	)

	const segments = $derived.by((): Segment[] => {
		const cuts = new Set([0, text.length])
		for (const r of ranges) {
			cuts.add(r.position)
			cuts.add(r.position + r.length)
		}
		const points = [...cuts].sort((a, b) => a - b)
		const out: Segment[] = []
		for (let i = 0; i + 1 < points.length; i++) {
			const start = points[i]
			const end = points[i + 1]
			out.push({
				text: text.slice(start, end),
				names: ranges.filter((r) => r.position <= start && end <= r.position + r.length).map((r) => r.name)
			})
		}
		return out
	})
</script>

{#snippet wrapped(content: string, names: string[])}
	{#if names.length === 0}
		{content}
	{:else if names[0] === 'b'}
		<strong>{@render wrapped(content, names.slice(1))}</strong>
	{:else if names[0] === 'i'}
		<em>{@render wrapped(content, names.slice(1))}</em>
	{:else}
		<span data-markup={names[0]}>{@render wrapped(content, names.slice(1))}</span>
	{/if}
{/snippet}

{#if character}
	<span class="character">{character}</span>
{/if}
{#each segments as segment, index (index)}{@render wrapped(segment.text, segment.names)}{/each}
