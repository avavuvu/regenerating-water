<script lang="ts">
    import { goto } from '$app/navigation';
    import { coordinates, flavorText, slides } from '$lib/slides';
    import { fade } from 'svelte/transition';
    import Map from './Map.svelte';
    import Audio from './Audio.svelte';

    const { data } = $props()

    const slide = $derived(data.slide)
    const slideIndex = $derived(data.slideIndex)

    const nextSlide = $derived(slides[Math.min(slideIndex + 1, slides.length - 1)])

    const nextSlideUrl = $derived(`/${Math.min(slideIndex + 1, slides.length - 1)}`)
    const prevSlideUrl = $derived(`/${Math.max(slideIndex - 1, 0)}`)

    const flavor = $derived(flavorText[slide.coordinateIndex as 1 | 2 | 3 | 0])

    const nextButtonText = $derived(
        nextSlide.type === "audio"
            ? "(Play)"
            : "(Next)")

    const onAudioEnd = () => {
        goto(nextSlideUrl)
    }

</script>

<main
    class="h-[100svh] grid grid-rows-[1fr_auto]"
    >
    <div class="min-h-0 overflow-y-auto flex flex-col">
        <div
            id="top"
            class:map-slide={slide.type === "map"}
            class:full-slide={slide.part === "end" || slide.part === "none"}
            class="max-w-[600px] content-slide flex flex-col justify-between">

            <div>
                {#if slide.part !== "end" && slide.part !== "none"}
                    <div class="text-2xl px-2">
                        <h1>Birrarung-ga</h1>

                        <span class="break-all">
                            {flavor.coordinate}
                        </span>
                        <h1 class="">
                            <span class="">{flavor.year} /</span>
                            <span>stop {slide.part} /</span>
                            <span>{flavor.name}</span>
                        </h1>
                    </div>
                {/if}

                <!-- <img src="logo.svg" alt="Body Of Water" class="pl-2 my-4 max-w-48"> -->


            </div>
        </div>

        {#if slide.type === "map"}
            <div id="map" class="bg-black flex-1 min-h-[50svh]" >
                <Map locations={coordinates} currentLocationIndex={slide.coordinateIndex}/>
            </div>
        {/if}

        <div id="info">
            {#if slide.type === "text"}
                <div in:fade class="px-4 py-8">
                    {#each slide.paragraphs as paragraph}
                        <p
                            style:font-size={(paragraph as string).includes("When you are ready") ? "24px" : "36px"}
                            style:padding-top={(paragraph as string).includes("When you are ready") ? "24px" : "0"}
                            class="">
                            {paragraph}
                        </p>
                    {/each}
                </div>
            {/if}
            {#if slide.type === "audio"}
                <div in:fade class="px-4 py-12 text-md">
                    <p class="text-2xl">
                        Listen...
                    </p>
                </div>
            {/if}
            {#if slide.type === "map"}
                <div in:fade class="px-4 text-2xl text-center">
                    {#each slide.paragraphs as paragraph}
                        <p class="italic">
                            {paragraph}
                        </p>
                    {/each}
                </div>
            {/if}
        </div>
    </div>

    {#if slide.part !== "end"}
    <div>
        {#if slide.type === "audio"}
            <div in:fade class="px-4 text-2xl text-center h-32">
                <Audio
                    audioSource={slide.audioSource}
                    autoplay={true}
                    {onAudioEnd}/>
            </div>
        {:else}

            <div class="flex w-full justify-end">
                <button
                    class="cursor-pointer text-2xl text-white py-4 px-8 m-4 rounded-2xl transition-colors
                        active:bg-black active:text-white
                        disabled:bg-gray-400 disabled:text-gray-700 disabled:active:bg-gray-800"
                    onclick={() => goto(nextSlideUrl)}>
                    {nextButtonText}
                </button>
            </div>
        {/if}
    </div>
    {/if}

</main>

<style>
    main {
        background-color: black;
        background: url("/background.jpg"),
            linear-gradient(to bottom, black, white);

        background: linear-gradient(to bottom, rgba(255,255,255,0) 20%,
              rgba(0,0,0,1)), url("/background.jpg");

        color: white;
    }

    /* main > div {
        transition: all 1s;
    } */

    .full-slide {
        min-height: 0svh;
    }


</style>
