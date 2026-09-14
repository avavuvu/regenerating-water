import parseLine from 'yarn-bound/src/line-parser.js'
import type { MarkupAttribute } from 'yarn-bound'

export type { MarkupAttribute }

export interface PresentedLine {
	text: string
	markup: MarkupAttribute[]
}

// handles `Character: text`, [markup], and escaped brackets
export function presentLine(text: string, locale?: string): PresentedLine {
	const node: PresentedLine = { text, markup: [] }
	parseLine(node, locale)
	return node
}
