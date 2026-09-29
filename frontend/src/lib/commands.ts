export interface CommandInfo {
	name: string
	detail?: string
	info: string
	example: string
}

export type CommandGroup = 'game' | 'yarn'

export const YARN_COMMANDS = [
	{
		name: 'jump',
		detail: 'Node',
		info: 'Goes to another node. The story continues from the start of that node.',
		example: '<<jump SecondStop>>'
	},
	{
		name: 'set',
		detail: '$variable = value',
		info: 'Changes the value of a variable.',
		example: '<<set $screen = "#cbf380">>'
	},
	{
		name: 'declare',
		detail: '$variable = value',
		info: 'Makes a variable and gives it a start value. Put it in the Start node.',
		example: '<<declare $companion = "">>'
	},
	{
		name: 'if',
		detail: 'condition',
		info: 'Shows the lines until <<elseif>>, <<else>> or <<endif>> only when the condition is true. On an option line, it hides the option when the condition is false.',
		example: '<<if $companion == "ebb">>\n    You chose to ebb.\n<<endif>>'
	},
	{
		name: 'elseif',
		detail: 'condition',
		info: 'Another condition after <<if>>. The first true condition wins.',
		example: '<<if $weathering == "filter">>\n    ...\n<<elseif $weathering == "stagnate">>\n    ...\n<<endif>>'
	},
	{
		name: 'else',
		info: 'Shows these lines when no condition before it is true.',
		example: '<<if $has_key>>\n    The gate opens.\n<<else>>\n    The gate is locked.\n<<endif>>'
	},
	{
		name: 'endif',
		info: 'Ends an <<if>> block.',
		example: '<<endif>>'
	},
	{
		name: 'stop',
		info: 'Ends the story at once.',
		example: '<<stop>>'
	}
] as const satisfies readonly CommandInfo[]

export const GAME_COMMANDS = [
	{
		name: 'recording',
		detail: 'name "label"',
		info: 'Plays an audio file from the Audio tab. The player waits for a tap after the audio ends. The label is only for editors.',
		example: '<<recording Tarnuk_Section_05 "Ali / N\'arweet">>'
	},
	{
		name: 'map',
		info: 'Shows the map with the text. The map uses the lat and long headers of this node.',
		example: 'title: SecondStop\nlat: -37.882871\nlong: 144.987296\n---\n<<map>>'
	},
	{
		name: 'flash',
		detail: 'image [seconds]',
		info: 'Shows an image from the Images tab over the full screen, then fades it out. The default time is 10 seconds.',
		example: '<<flash green>>\n<<flash pink 5>>'
	}
] as const satisfies readonly CommandInfo[]

export type YarnCommandName = (typeof YARN_COMMANDS)[number]['name']
export type GameCommandName = (typeof GAME_COMMANDS)[number]['name']

const yarnNames = new Set<string>(YARN_COMMANDS.map((c) => c.name))
const gameNames = new Set<string>(GAME_COMMANDS.map((c) => c.name))

export function isYarnCommand(name: string): name is YarnCommandName {
	return yarnNames.has(name)
}

export function isGameCommand(name: string): name is GameCommandName {
	return gameNames.has(name)
}

export function findCommand(name: string): { command: CommandInfo; group: CommandGroup } | null {
	const game = GAME_COMMANDS.find((c) => c.name === name)
	if (game) return { command: game, group: 'game' }
	const yarn = YARN_COMMANDS.find((c) => c.name === name)
	if (yarn) return { command: yarn, group: 'yarn' }
	return null
}
