<script lang="ts">
    import { Loader, Pause, Play } from "lucide-svelte"

    const { audioSource, autoplay, onAudioEnd, onAlmostFinished }: {
        audioSource: string,
        autoplay: boolean,
        onAudioEnd?: () => void
        onAlmostFinished?: () => void
    } = $props()

    let audioElement: HTMLAudioElement | undefined = $state(undefined)

    let volume = $state(0.75);
    let muted = $state(false);
    let hasLoaded = $state(false);
    let duration = $state(0)
    let currentTime = $state(0)
    let playHasBeenPressed = $state(autoplay);

    const formatSeconds = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60)
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    let playState: "loading" | "playing" | "paused" = $derived.by(() => {
        if (playHasBeenPressed && !hasLoaded) {
            return "loading";
        }
        if (playHasBeenPressed && hasLoaded) {
            return "playing";
        }
        return "paused";
    });

    const percentPlayed = $derived.by(() => {
        if(!audioElement) {
            return "0%"
        }

        if(!audioSource) {
            return "0%"
        }

        return `${currentTime / duration * 100}%`
    })

    const togglePlaying = async () => {
        if(!audioElement) {
            return
        }

        if (audioElement.paused) {
            // Play
            playHasBeenPressed = true;
            await audioElement.play();
        } else if (!audioElement.paused) {
            // Pause
            audioElement.pause();
            playHasBeenPressed = false;
        }
    }

    $effect(() => {
        const handleLoadedMetadata = () => {
            duration = audioElement!.duration; // Update duration when metadata is loaded
            hasLoaded = true;
        };

        const handleTimeUpdate = () => {
            currentTime = audioElement!.currentTime; // Update currentTime during playback
        };

            audioElement!.addEventListener("loadedmetadata", handleLoadedMetadata);
            audioElement!.addEventListener("timeupdate", handleTimeUpdate);

        // Cleanup
        return () => {
            audioElement!.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audioElement!.removeEventListener("timeupdate", handleTimeUpdate);
        };
    });

    $effect(() => {
        if(!onAlmostFinished) {
            return
        }

        if(currentTime / duration > .8) {
            onAlmostFinished()
        }
    })


</script>

<div class="w-full h-12 grid grid-cols-1 grid-rows-1 items-center">
    <!-- <div class="col-start-1 col-end-2 row-start-1 row-end-2 w-full h-full pointer-events-none">
        <div 
            class="bg-[#8ACE00] h-full"
            style:width={percentPlayed}>

        </div>
    </div> -->

    <div class="col-start-1 col-end-2 row-start-1 row-end-2">
        {#if audioSource}
            <button onclick={togglePlaying} class="cursor-pointer  w-full text-right">
                <span class=" flex justify-end flex-col w-full">
                    {#if playState === "loading"}
                        <Loader/>
                    {:else if playState === "paused"}
                        <span> (Play)</span>
                    {:else if playState === "playing"}
                        <span> (Pause)</span>
                    {/if}
                    <span class="grid grid-cols-[49%_auto_49%] ml-auto w-32 text-center">
                        <span>
                            {formatSeconds(currentTime)} 
                        </span>
                        <span>
                            /
                        </span>
                        <span>
                            {formatSeconds(duration)}
                        </span>
                    </span>

                </span>
            </button>
        {:else}
            ...
        {/if}

    </div>
</div>

<audio 
    {autoplay}
    bind:volume
    bind:muted
    bind:this={audioElement} 
    src={audioSource}
    onended={onAudioEnd}>
</audio>
