export function toDMS(value: number, axis: 'lat' | 'long'): string {
	const hemisphere = axis === 'lat' ? (value < 0 ? 'S' : 'N') : value < 0 ? 'W' : 'E'
	const abs = Math.abs(value)
	const degrees = Math.floor(abs)
	const minutesFloat = (abs - degrees) * 60
	const minutes = Math.floor(minutesFloat)
	const seconds = (minutesFloat - minutes) * 60
	return `${degrees}°${minutes}'${seconds.toFixed(1)}"${hemisphere}`
}
