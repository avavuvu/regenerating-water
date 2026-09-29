<script lang="ts">
	import AssetLibrary from '@/admin/AssetLibrary.svelte'
	import { getStoryEditor } from '$lib/admin/story-editor.svelte'

	const editor = getStoryEditor()
</script>

<div class="scroll">
	<AssetLibrary
		story={editor.story}
		kind="images"
		assets={editor.assets}
		usedBy={editor.imageUsers}
		onchange={(next) => (editor.assets = next)}
	/>
</div>

<style>
	.scroll {
		min-height: 0;
		overflow-y: auto;
	}
</style>
