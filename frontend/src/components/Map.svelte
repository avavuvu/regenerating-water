<script lang="ts">
	import 'leaflet/dist/leaflet.css'
	import * as L from 'leaflet'
	import { onMount } from 'svelte'

	export type LatLng = [number, number]

	const { center, zoom = 16 }: { center: LatLng; zoom?: number } = $props()

	let mapDiv: HTMLElement
	let leafletMap: L.Map | undefined
	let marker: L.Circle | undefined

	onMount(() => {
		leafletMap = L.map(mapDiv)

		L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
			minZoom: 0,
			maxZoom: 20,
			attribution:
				'&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(leafletMap)

		return () => {
			leafletMap?.remove()
			leafletMap = undefined
		}
	})

	$effect(() => {
		if (!leafletMap) return
		leafletMap.setView(center, zoom)
		marker?.remove()
		marker = L.circle(center, { radius: 20, color: 'red', fillColor: 'red' }).addTo(leafletMap)
	})
</script>

<div class="map" bind:this={mapDiv}></div>

<style>
	.map {
		width: 100%;
		height: 100%;
	}
</style>
