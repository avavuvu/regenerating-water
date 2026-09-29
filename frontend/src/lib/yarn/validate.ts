import { isGameCommand, isYarnCommand } from '../commands'
import { parseCommand } from './command'
import { parseYarn } from './parse'

export type Severity = 'error' | 'warning'

export interface Diagnostic {
	line: number
	severity: Severity
	message: string
	node?: string
}

export interface CommandUse {
	name: string
	args: string[]
	line: number
}

export interface Link {
	target: string
	line: number
	label: string | null
	condition: string | null
}

export interface OutlineNode {
	title: string
	line: number
	bodyStart: number
	bodyEnd: number
	headers: Record<string, string>
	commands: CommandUse[]
	links: Link[]
	lines: number
}

export interface StoryAnalysis {
	nodes: OutlineNode[]
	diagnostics: Diagnostic[]
	audio: Set<string>
	images: Set<string>
}

export interface KnownAssets {
	audio?: Iterable<string>
	images?: Iterable<string>
}


const DISPLAY_MODES = new Set(['screen', 'lines'])
const HEADER = /^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/
const COMMAND = /<<\s*(.*?)\s*>>/g
const OPTION = /^(\s*)->\s*(.*)$/
const OPTION_CONDITION = /<<\s*if\s+(.*?)\s*>>/

function optionParts(text: string): { label: string; condition: string | null } {
	return {
		label: text.replace(/<<.*?>>/g, '').replace(/(^|\s)#\S+/g, '').trim(),
		condition: OPTION_CONDITION.exec(text)?.[1] ?? null
	}
}

function stripComment(text: string): string {
	const index = text.search(/(^|\s)\/\//)
	return index === -1 ? text : text.slice(0, index)
}

function scan(source: string, diagnostics: Diagnostic[]): OutlineNode[] {
	const lines = source.split(/\r?\n/)
	const nodes: OutlineNode[] = []
	let headers: Record<string, string> = {}
	let headerLines: Record<string, number> = {}
	let headerStart = 0
	let current: OutlineNode | null = null
	let option: { indent: number; label: string; condition: string | null } | null = null

	for (let i = 0; i < lines.length; i++) {
		const number = i + 1
		const raw = lines[i]
		const trimmed = raw.trim()

		if (!current) {
			if (trimmed === '' || trimmed.startsWith('//')) continue
			if (trimmed === '---') {
				const title = headers.title
				if (!title) {
					diagnostics.push({ line: headerStart || number, severity: 'error', message: 'This node has no title.' })
				}
				current = {
					title: title ?? `(untitled line ${number})`,
					line: headerLines.title || headerStart || number,
					bodyStart: number + 1,
					bodyEnd: number,
					headers,
					commands: [],
					links: [],
					lines: 0
				}
				option = null
				continue
			}
			const match = HEADER.exec(raw)
			if (match) {
				if (Object.keys(headers).length === 0) headerStart = number
				headers[match[1]] = match[2].trim()
				headerLines[match[1]] = number
				continue
			}
			diagnostics.push({
				line: number,
				severity: 'error',
				message: 'Expected a header such as "title: Name", or "---" to start the node body.'
			})
			continue
		}

		if (trimmed === '===') {
			current.bodyEnd = number - 1
			nodes.push(current)
			current = null
			headers = {}
			headerLines = {}
			headerStart = 0
			continue
		}

		const text = stripComment(raw)
		if (text.trim() === '') continue

		const optionMatch = OPTION.exec(text)
		const indent = text.length - text.trimStart().length
		if (optionMatch) {
			option = { indent: optionMatch[1].length, ...optionParts(optionMatch[2]) }
		} else if (option && indent <= option.indent) {
			option = null
		}

		let hasCommand = false
		for (const found of text.matchAll(COMMAND)) {
			hasCommand = true
			const { name, args } = parseCommand(found[1])
			if (name === 'jump') {
				current.links.push({
					target: args[0] ?? '',
					line: number,
					label: option?.label ?? null,
					condition: option?.condition ?? null
				})
			} else if (!isYarnCommand(name)) {
				current.commands.push({ name, args, line: number })
			}
		}
		if (!hasCommand && !optionMatch) current.lines++
	}

	if (current) {
		diagnostics.push({
			line: current.line,
			severity: 'error',
			message: `Node "${current.title}" has no "===" line at the end.`,
			node: current.title
		})
		current.bodyEnd = lines.length
		nodes.push(current)
	} else if (Object.keys(headers).length > 0) {
		diagnostics.push({
			line: headerStart,
			severity: 'error',
			message: 'These headers have no "---" line after them.'
		})
	}

	return nodes
}

function checkHeaders(node: OutlineNode, diagnostics: Diagnostic[]) {
	const { headers } = node
	const at = (message: string, severity: Severity = 'error') =>
		diagnostics.push({ line: node.line, severity, message, node: node.title })

	if (headers.display && !DISPLAY_MODES.has(headers.display)) {
		at(`Unknown display mode "${headers.display}". Use "screen" or "lines".`)
	}
	const hasLat = headers.lat !== undefined
	const hasLong = headers.long !== undefined
	if (hasLat !== hasLong) at('Give both "lat" and "long", or neither.', 'warning')
	if (hasLat) {
		const lat = Number(headers.lat)
		if (!Number.isFinite(lat) || lat < -90 || lat > 90) at(`"lat: ${headers.lat}" is not a valid latitude.`)
	}
	if (hasLong) {
		const long = Number(headers.long)
		if (!Number.isFinite(long) || long < -180 || long > 180) at(`"long: ${headers.long}" is not a valid longitude.`)
	}
}

function checkParse(source: string, nodes: OutlineNode[], diagnostics: Diagnostic[]) {
	try {
		parseYarn(source)
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : String(cause)
		const nodeMatch = /failed to parse node "([^"]+)"/.exec(message)
		const lineMatch = /on line (\d+)/.exec(message)
		const node = nodes.find((n) => n.title === nodeMatch?.[1])
		let line = node?.line ?? 1
		if (node && lineMatch) {
			line = Math.min(Math.max(node.bodyStart + Number(lineMatch[1]) - 2, node.bodyStart), node.bodyEnd)
		}
		diagnostics.push({
			line,
			severity: 'error',
			message: message.replace(/^failed to parse node "[^"]+": /, ''),
			node: node?.title
		})
	}
}

export function analyseStory(source: string, known: KnownAssets = {}): StoryAnalysis {
	const diagnostics: Diagnostic[] = []
	const nodes = scan(source, diagnostics)
	const titles = new Map<string, OutlineNode>()
	const audio = new Set<string>()
	const images = new Set<string>()
	const knownAudio = known.audio ? new Set(known.audio) : null
	const knownImages = known.images ? new Set(known.images) : null

	for (const node of nodes) {
		if (titles.has(node.title)) {
			diagnostics.push({
				line: node.line,
				severity: 'error',
				message: `Another node already has the title "${node.title}".`,
				node: node.title
			})
		}
		titles.set(node.title, node)
		checkHeaders(node, diagnostics)
	}

	if (nodes.length === 0) {
		diagnostics.push({ line: 1, severity: 'error', message: 'The story has no nodes.' })
	} else if (!titles.has('Start')) {
		diagnostics.push({ line: 1, severity: 'error', message: 'The story needs a node with "title: Start".' })
	}

	for (const node of nodes) {
		for (const link of node.links) {
			if (!link.target) {
				diagnostics.push({ line: link.line, severity: 'error', message: 'This jump has no target.', node: node.title })
			} else if (!link.target.startsWith('{') && !titles.has(link.target)) {
				diagnostics.push({
					line: link.line,
					severity: 'error',
					message: `No node has the title "${link.target}".`,
					node: node.title
				})
			}
		}

		for (const command of node.commands) {
			const at = (message: string, severity: Severity = 'error') =>
				diagnostics.push({ line: command.line, severity, message, node: node.title })
			const [first] = command.args
			const name = command.name

			if (!isGameCommand(name)) {
				at(`The game does not know the command <<${name}>>.`, 'warning')
				continue
			}

			switch (name) {
				case 'recording':
					if (!first) at('Give the audio name, for example <<recording Section_01 "Label">>.')
					else {
						audio.add(first)
						if (knownAudio && !knownAudio.has(first)) at(`There is no audio file "${first}".`)
					}
					break
				case 'flash':
					if (!first) at('Give the image name, for example <<flash green>>.')
					else {
						images.add(first)
						if (knownImages && !knownImages.has(first)) at(`There is no image "${first}".`)
					}
					if (command.args[1] !== undefined && !(Number(command.args[1]) > 0)) {
						at(`"${command.args[1]}" is not a number of seconds.`)
					}
					break
				case 'map':
					if (node.headers.lat === undefined || node.headers.long === undefined) {
						at('<<map>> needs "lat" and "long" headers on this node.', 'warning')
					}
					break
			}
		}
	}

	if (titles.has('Start')) {
		const reached = new Set<string>(['Start'])
		const queue = ['Start']
		while (queue.length > 0) {
			const node = titles.get(queue.shift()!)
			for (const link of node?.links ?? []) {
				if (titles.has(link.target) && !reached.has(link.target)) {
					reached.add(link.target)
					queue.push(link.target)
				}
			}
		}
		const targeted = new Set(nodes.flatMap((n) => n.links.map((l) => l.target)))
		for (const node of nodes) {
			if (!reached.has(node.title) && !targeted.has(node.title)) {
				diagnostics.push({
					line: node.line,
					severity: 'warning',
					message: `No jump goes to "${node.title}", so players cannot reach it.`,
					node: node.title
				})
			}
		}
	}

	checkParse(source, nodes, diagnostics)

	diagnostics.sort((a, b) => a.line - b.line)
	return { nodes, diagnostics, audio, images }
}
