<script lang="ts">
    import type { Locations } from "$lib/slides";
    import * as L from "leaflet"
    import { onMount } from "svelte";

    const { locations, currentLocationIndex }: {
        locations: Locations,
        currentLocationIndex: number
    }  = $props()

    const locationArray = Object.values(locations)

    let mapDiv!: HTMLElement
    let leafletMap: L.Map

    const markers: L.Layer[] = []

    const updateMarkers = () => {
        locationArray.forEach((location, index) => {
            const isPastLocation = index < currentLocationIndex
            const isCurrentLocation = index === currentLocationIndex

            let popup: L.Popup | null = null
            let color = "blue"
            if(isPastLocation) {
                color = "gray"

            } else if(isCurrentLocation) {
                color = "red"
            }

            if(markers[index]) {
                markers[index].remove()
            }

            markers[index] = L.circle(location, {
                radius: 20, 
                fillColor: color,
                color: color
            }).addTo(leafletMap)

            if(popup) {
                markers[index].bindPopup(popup)
            }

        })
    }

    onMount(() => {
        leafletMap = L.map(mapDiv)

        L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
            minZoom: 0,
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            
        }).addTo(leafletMap);

        // leafletMap.locate({
        //     watch: true})
        //     .on("locationfound", (event) => {
        //         const circle = L.marker(
        //             [event.latlng.lat, event.latlng.lng])
        //             .addTo(leafletMap)
        //     })

        updateMarkers()
    })

    $effect(() => {
        const coord = locationArray[currentLocationIndex]

        leafletMap.setView(
            coord,
            16
        )

        updateMarkers()
    })

</script>

<div bind:this={mapDiv} style:height={"100%"}>

</div>