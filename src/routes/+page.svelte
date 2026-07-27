<script>
    import { slides } from "$lib/slides";
    import Slide from "../components/Slide.svelte";


    const data = {
        slide: slides[0],
        slideIndex: 0
    }
</script>

<Slide {data}></Slide>
