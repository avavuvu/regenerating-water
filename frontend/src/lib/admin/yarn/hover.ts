import { hoverTooltip } from '@codemirror/view'
import { findCommand, type CommandGroup, type CommandInfo } from '$lib/commands'

const COMMAND_NAME = /<<\s*([A-Za-z_]\w*)/g

function element(tag: string, className: string, text?: string): HTMLElement {
	const node = document.createElement(tag)
	node.className = className
	if (text !== undefined) node.textContent = text
	return node
}

export function commandDoc(command: CommandInfo, group: CommandGroup): HTMLElement {
	const doc = element('div', 'cm-command-doc')
	const heading = element('div', 'cm-command-heading')
	heading.append(
		element('code', 'cm-command-signature', `<<${command.name}${command.detail ? ` ${command.detail}` : ''}>>`),
		element('span', 'cm-command-group', group === 'game' ? 'game command' : 'yarn command')
	)
	doc.append(heading, element('p', 'cm-command-info', command.info), element('pre', 'cm-command-example', command.example))
	return doc
}

export const commandHover = hoverTooltip((view, pos) => {
	const line = view.state.doc.lineAt(pos)
	for (const match of line.text.matchAll(COMMAND_NAME)) {
		const start = line.from + match.index + match[0].length - match[1].length
		const end = start + match[1].length
		if (pos < start || pos > end) continue
		const found = findCommand(match[1])
		if (!found) return null
		return { pos: start, end, above: true, create: () => ({ dom: commandDoc(found.command, found.group) }) }
	}
	return null
})
