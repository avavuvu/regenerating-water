import { slides, type Slide } from '$lib/slides'
import { error } from '@sveltejs/kit'

export const load = ({ params }) => {

	const slideIndex = Number(params["slug"]) 

	const slide: Slide | undefined = slides[slideIndex]

	if(!slide) {
		return error(404)
	}

	return {
		slide,
		slideIndex
	}
}