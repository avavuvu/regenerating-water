<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'

	import Game from '@/Game.svelte'
	import { debug } from '$lib/debug-mode'
	import type { PageProps } from './$types'

	const { data, params }: PageProps = $props()

	function sync() {
		if (data.dialogue.scene !== params.scene) {
			goto(resolve('/play/[story]/[scene]', { story: params.story, scene: data.dialogue.scene }))
		}
	}
</script>

<Game dialogue={data.dialogue} {debug} onchange={sync} />
