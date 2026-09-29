<script lang="ts">
	import 'leaflet/dist/leaflet.css'
	import * as L from 'leaflet'
	import { onMount } from 'svelte'

	export type LatLng = [number, number]

	const { center, zoom = 16 }: { center: LatLng; zoom?: number } = $props()

	const FIT_DISTANCE_METRES = 3000

	let mapDiv: HTMLElement
	let leafletMap: L.Map | undefined = $state.raw()
	let marker: L.Circle | undefined
	let here: L.CircleMarker | undefined
	let accuracy: L.Circle | undefined
	let fitted = false
	let tilesFailed = $state(false)

	function showPosition(position: GeolocationPosition) {
		if (!leafletMap) return
		const point = L.latLng(position.coords.latitude, position.coords.longitude)

		accuracy ??= L.circle(point, {
			radius: 0,
			className: 'map-accuracy',
			weight: 1,
			fillOpacity: 0.1,
			interactive: false
		}).addTo(leafletMap)
		here ??= L.circleMarker(point, {
			radius: 7,
			className: 'map-here',
			weight: 2,
			fillOpacity: 1,
			interactive: false
		}).addTo(leafletMap)

		accuracy.setLatLng(point).setRadius(position.coords.accuracy)
		here.setLatLng(point)

		if (!fitted && point.distanceTo(center) < FIT_DISTANCE_METRES) {
			fitted = true
			leafletMap.fitBounds(L.latLngBounds([center, point]), { padding: [32, 32], maxZoom: zoom })
		}
	}

	onMount(() => {
		const map = L.map(mapDiv)

		L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
			minZoom: 0,
			maxZoom: 20,
			attribution:
				'&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		})
			.on('tileerror', () => (tilesFailed = true))
			.on('tileload', () => (tilesFailed = false))
			.addTo(map)

		leafletMap = map

		const watch =
			'geolocation' in navigator
				? navigator.geolocation.watchPosition(showPosition, () => {}, {
						enableHighAccuracy: true,
						maximumAge: 10_000
					})
				: null

		return () => {
			if (watch !== null) navigator.geolocation.clearWatch(watch)
			map.remove()
			leafletMap = undefined
			here = undefined
			accuracy = undefined
		}
	})

	$effect(() => {
		if (!leafletMap) return
		fitted = false
		leafletMap.setView(center, zoom)
		marker?.remove()
		marker = L.circle(center, { radius: 20, className: 'map-target' }).addTo(leafletMap)
	})
</script>

<div class="frame">
	<div class="map" bind:this={mapDiv}></div>
	{#if tilesFailed}
		<p class="error">The map did not load. Use the coordinates above.</p>
	{/if}
</div>

<style>
	.frame {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.map {
		width: 100%;
		height: 100%;

		& :global(.map-target) {
			stroke: var(--color-marker);
			fill: var(--color-marker);
		}

		& :global(.map-accuracy) {
			stroke: var(--color-surface);
			fill: var(--color-surface);
		}

		& :global(.map-here) {
			stroke: var(--color-foreground);
			fill: var(--color-surface);
		}
	}

	.error {
		position: absolute;
		inset: auto 0 0 0;
		z-index: 1000;
		padding: 0.5ch 1ch;
		font-size: 0.75em;
		background: var(--color-surface);
		color: var(--color-foreground);
	}
</style>
