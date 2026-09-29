<script lang="ts">
	import type { State } from './yarn/interpreter'

	const { state }: { state: State } = $props()
</script>

<aside>
	<h2>debug</h2>
	<table>
		<tbody>
			<tr><th>node</th><td>{state.node}</td></tr>
			<tr><th>path</th><td>{state.path === null ? 'end' : state.path.join(' / ')}</td></tr>
			{#each Object.entries(state.variables) as [name, value] (name)}
				<tr><th>${name}</th><td>{JSON.stringify(value)}</td></tr>
			{/each}
			<tr><th>visited</th><td>{Object.keys(state.visited).join(', ')}</td></tr>
		</tbody>
	</table>
</aside>

<style>
	aside {
		margin-top: 2rem;
		padding: 0.5rem;
		border: 1px dashed currentColor;
		font-family: var(--font-family);
		font-size: 0.8rem;
		opacity: 0.7;
	}
	h2 {
		margin: 0 0 0.5rem;
		font-size: inherit;
	}
	th {
		text-align: left;
		padding-right: 1rem;
	}
</style>
