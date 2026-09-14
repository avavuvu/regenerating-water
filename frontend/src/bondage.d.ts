// minimal declarations for the parts of @mnbroatch/bondage 4.x that we use.
// only the parser output is consumed; the runner itself is not.

declare module '@mnbroatch/bondage' {
	export interface RawParserNode {
		type: string
		[key: string]: unknown
	}

	export interface YarnSourceNode {
		title: string
		body: string
		[header: string]: string
	}

	export interface DefaultVariableStorage {
		data: Record<string, string | number | boolean>
		get(name: string): unknown
		set(name: string, value: unknown): void
	}

	class Runner {
		noEscape: boolean
		lookahead: boolean
		yarnNodes: Record<string, YarnSourceNode>
		variables: DefaultVariableStorage
		load(dialogue: string): void
		getParserNodes(title: string): {
			parserNodes: (RawParserNode | null | undefined)[]
			metadata: Record<string, string>
		}
	}

	const bondage: { Runner: typeof Runner }
	export default bondage
}

declare module 'yarn-bound/src/line-parser.js' {
	import type { MarkupAttribute } from 'yarn-bound'

	export default function parseLine(
		node: { text: string; markup?: MarkupAttribute[] },
		locale?: string
	): void
}
