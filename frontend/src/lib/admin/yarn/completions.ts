import type { Completion, CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete'
import { GAME_COMMANDS, YARN_COMMANDS, type CommandGroup, type CommandInfo } from '$lib/commands'
import { analyseStory, type KnownAssets } from '$lib/yarn/validate'
import { commandDoc } from './hover'

function commandOptions(
	commands: readonly CommandInfo[],
	group: CommandGroup,
	section: Completion['section'],
	boost: number
): Completion[] {
	return commands.map((c) => ({
		label: c.name,
		detail: c.detail,
		info: () => commandDoc(c, group),
		type: 'keyword',
		section,
		boost
	}))
}

const COMMAND_OPTIONS = [
	...commandOptions(GAME_COMMANDS, 'game', { name: 'game', rank: 0 }, 1),
	...commandOptions(YARN_COMMANDS, 'yarn', { name: 'yarn', rank: 1 }, 0)
]

const HEADER_OPTIONS = ['title', 'lat', 'long', 'year', 'display'].map((label) => ({ label, type: 'property' }))

export function yarnCompletions(assets: () => KnownAssets): CompletionSource {
	return (completion: CompletionContext): CompletionResult | null => {
		const line = completion.state.doc.lineAt(completion.pos)
		const before = line.text.slice(0, completion.pos - line.from)

		const argument = /<<\s*(jump|recording|flash)\s+(\w*)$/.exec(before)
		if (argument) {
			const [, command, typed] = argument
			let labels: string[]
			if (command === 'jump') {
				labels = analyseStory(completion.state.doc.toString()).nodes.map((n) => n.title)
			} else {
				const known = assets()
				labels = [...((command === 'recording' ? known.audio : known.images) ?? [])]
			}
			return {
				from: completion.pos - typed.length,
				options: labels.map((label) => ({ label, type: command === 'jump' ? 'class' : 'constant' })),
				validFor: /^\w*$/
			}
		}

		const command = /<<\s*(\w*)$/.exec(before)
		if (command) {
			return { from: completion.pos - command[1].length, options: COMMAND_OPTIONS, validFor: /^\w*$/ }
		}

		const header = /^(\w*)$/.exec(before)
		if (header && completion.explicit) {
			return { from: line.from, options: HEADER_OPTIONS, validFor: /^\w*$/ }
		}
		return null
	}
}
