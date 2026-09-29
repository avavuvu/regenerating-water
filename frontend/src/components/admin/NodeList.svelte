<script lang="ts">
	import { Image, MapPin, Music } from 'lucide-svelte'
	import type { Diagnostic, OutlineNode } from '$lib/yarn/validate'

	const {
		nodes,
		diagnostics,
		current,
		onselect,
		onproblem
	}: {
		nodes: OutlineNode[]
		diagnostics: Diagnostic[]
		current: string | null
		onselect: (node: OutlineNode) => void
		onproblem: (diagnostic: Diagnostic) => void
	} = $props()

	const errors = $derived(diagnostics.filter((d) => d.severity === 'error').length)
	const warnings = $derived(diagnostics.length - errors)

	function has(node: OutlineNode, name: string): boolean {
		return node.commands.some((c) => c.name === name)
	}
</script>

<div class="outline">
	<section class="problems">
		<h3>
			Checks:
			{#if diagnostics.length === 0}
				<span class="ok">no problems</span>
			{:else}
				<span class:error={errors > 0}>{errors} errors</span>,
				<span class:warning={warnings > 0}>{warnings} warnings</span>
			{/if}
		</h3>
		{#if diagnostics.length > 0}
			<ul>
				{#each diagnostics as diagnostic, i (i)}
					<li>
						<button class={diagnostic.severity} onclick={() => onproblem(diagnostic)}>
							<span class="line">{diagnostic.line}</span>
							{diagnostic.message}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section>
		<h3>Nodes ({nodes.length})</h3>
		<ul>
			{#each nodes as node (node.line)}
				<li>
					<button class:current={node.title === current} onclick={() => onselect(node)}>
						<span class="title">{node.title}</span>
						<span class="icons">
							{#if has(node, 'recording')}<Music size={14} aria-label="recording" />{/if}
							{#if has(node, 'map')}<MapPin size={14} aria-label="map" />{/if}
							{#if has(node, 'flash')}<Image size={14} aria-label="flash image" />{/if}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.outline {
		height: 100%;
		overflow-y: auto;
		display: grid;
		align-content: start;
		gap: 1rem;
		padding: 0.75rem 1ch;
		font-size: 0.9em;
	}

	h3 {
		margin-bottom: 0.4rem;
	}

	ul {
		display: grid;
		gap: 1px;
	}

	button {
		width: 100%;
		display: flex;
		gap: 1ch;
		justify-content: space-between;
		align-items: baseline;
		padding: 0.15rem 0.75ch;
		text-align: left;
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		cursor: pointer;

		&:hover {
			background: var(--color-hover);
		}

		&.current {
			color: var(--color-surface);
			background: var(--color-foreground);
		}
	}

	.problems button {
		justify-content: flex-start;

		&.error {
			color: var(--color-pink);
		}

		&.warning {
			color: var(--color-yellow);
		}

		& .line {
			min-width: 3ch;
			opacity: 0.7;
		}
	}

	.icons {
		display: inline-flex;
		gap: 0.25ch;
	}
</style>
