import type { Expr, Program, Statement, TextPart, Value } from './ast'
import { presentLine, type MarkupAttribute } from './markup'

// path is a list of indexes into the program tree, alternating
// [statement index, branch or option index, statement index, ...].
// the last entry is always a statement index. null means the dialogue ended.
export interface State {
	node: string
	path: number[] | null
	variables: Record<string, Value>
	visited: Record<string, number>
}

export type YarnFunction = (...args: Value[]) => Value
export type Functions = Record<string, YarnFunction>

export interface OptionView {
	text: string
	markup: MarkupAttribute[]
	available: boolean
	hashtags: string[]
	lineNum: number
}

export type View =
	| { kind: 'line'; text: string; markup: MarkupAttribute[]; hashtags: string[]; lineNum: number }
	| { kind: 'options'; options: OptionView[]; lineNum: number }
	| { kind: 'command'; command: string; hashtags: string[]; lineNum: number }
	| { kind: 'end' }

interface Context {
	variables: Record<string, Value>
	visited: Record<string, number>
	functions: Functions
}

export function start(
	program: Program,
	node: string,
	functions: Functions = {},
	variables: Record<string, Value> = program.variables
): State {
	if (!program.nodes[node]) throw new Error(`node "${node}" does not exist`)
	return settle(program, functions, {
		node,
		path: [0],
		variables: { ...variables },
		visited: { [node]: 1 }
	})
}

export function step(program: Program, state: State, functions: Functions = {}, choice?: number): State {
	if (!state.path) return state
	const stmt = statementAt(program, state.node, state.path)
	if (!stmt) return { ...state, path: null }

	let path: number[] | null
	if (stmt.type === 'options') {
		if (choice === undefined) throw new Error('an option index is required to advance past options')
		if (!stmt.options[choice]) {
			throw new RangeError(`cannot select option ${choice}, there are ${stmt.options.length} options`)
		}
		path = descend(program, state.node, state.path, choice)
	} else {
		path = nextPath(program, state.node, state.path)
	}

	return settle(program, functions, { ...state, path })
}

export function view(program: Program, state: State, functions: Functions = {}, locale?: string): View {
	const stmt = state.path ? statementAt(program, state.node, state.path) : undefined
	if (!stmt) return { kind: 'end' }

	const ctx: Context = { variables: state.variables, visited: state.visited, functions }

	switch (stmt.type) {
		case 'line':
			return {
				kind: 'line',
				...presentLine(render(stmt.text, ctx), locale),
				hashtags: stmt.hashtags,
				lineNum: stmt.lineNum
			}
		case 'command':
			return {
				kind: 'command',
				command: render(stmt.text, ctx),
				hashtags: stmt.hashtags,
				lineNum: stmt.lineNum
			}
		case 'options':
			return {
				kind: 'options',
				lineNum: stmt.lineNum,
				options: stmt.options.map((o) => ({
					...presentLine(render(o.text, ctx), locale),
					available: o.condition === null || truthy(evaluate(o.condition, ctx)),
					hashtags: o.hashtags,
					lineNum: o.lineNum
				}))
			}
		default:
			throw new Error(`unexpected statement type "${stmt.type}" in view`)
	}
}

export type ScreenItem = Extract<View, { kind: 'line' | 'command' }>

export type ScreenEnding =
	| { kind: 'options'; options: OptionView[]; lineNum: number }
	| { kind: 'continue' }
	| { kind: 'end' }

// what is visible from `state` onward. `state` on the result rests on
// the last item or the options, so step(program, screen.state, choice)
// leads to the next screen.
//
// a node header `display: lines` shows one line per screen.
export interface Screen {
	node: string
	display: DisplayMode
	items: ScreenItem[]
	ending: ScreenEnding
	state: State
}

export type DisplayMode = 'screen' | 'lines'

export function displayMode(program: Program, node: string): DisplayMode {
	const value = program.nodes[node].headers.display ?? 'lines'
	if (value !== 'screen' && value !== 'lines') {
		throw new Error(`node "${node}": unknown display mode "${value}", expected "screen" or "lines"`)
	}
	return value
}

export function screen(program: Program, state: State, functions: Functions = {}, locale?: string): Screen {
	const items: ScreenItem[] = []
	const display = state.path ? displayMode(program, state.node) : 'screen'
	let s = state

	for (;;) {
		const v = view(program, s, functions, locale)
		if (v.kind === 'end') return { node: s.node, display, items, ending: { kind: 'end' }, state: s }
		if (v.kind === 'options') {
			return {
				node: s.node,
				display,
				items,
				ending: { kind: 'options', options: v.options, lineNum: v.lineNum },
				state: s
			}
		}

		items.push(v)
		const next = step(program, s, functions)
		if (next.path === null) return { node: s.node, display, items, ending: { kind: 'end' }, state: s }
		if (display === 'lines' || next.node !== s.node) {
			return { node: s.node, display, items, ending: { kind: 'continue' }, state: s }
		}
		s = next
	}
}

// true when one more advance() ends the dialogue. false on options,
// because the answer depends on the choice.
export function isLast(program: Program, state: State, functions: Functions = {}): boolean {
	if (!state.path) return false
	const stmt = statementAt(program, state.node, state.path)
	if (!stmt || stmt.type === 'options') return false
	return step(program, state, functions).path === null
}

// ---- walking

function bodyAt(program: Program, node: string, path: number[]): Statement[] {
	let body = program.nodes[node].body
	for (let i = 0; i + 1 < path.length; i += 2) {
		const stmt = body[path[i]]
		const sel = path[i + 1]
		if (stmt.type === 'if') body = stmt.branches[sel].body
		else if (stmt.type === 'options') body = stmt.options[sel].body
		else throw new Error(`cannot descend into statement type "${stmt.type}"`)
	}
	return body
}

function statementAt(program: Program, node: string, path: number[]): Statement | undefined {
	return bodyAt(program, node, path)[path[path.length - 1]]
}

function nextPath(program: Program, node: string, path: number[]): number[] | null {
	let p = [...path]
	for (;;) {
		p[p.length - 1]++
		if (p[p.length - 1] < bodyAt(program, node, p).length) return p
		if (p.length <= 1) return null
		p = p.slice(0, -2)
	}
}

function descend(program: Program, node: string, path: number[], sel: number): number[] | null {
	const child = [...path, sel, 0]
	if (bodyAt(program, node, child).length > 0) return child
	return nextPath(program, node, path)
}

// runs invisible statements (set, if, jump, stop) until the state
// rests on a line, options, command, or the end
function settle(program: Program, functions: Functions, state: State): State {
	let { node, path, variables, visited } = state

	while (path) {
		const stmt = statementAt(program, node, path)
		if (!stmt) {
			path = null
			break
		}

		const ctx: Context = { variables, visited, functions }

		switch (stmt.type) {
			case 'line':
			case 'options':
			case 'command':
				return { node, path, variables, visited }
			case 'set':
				variables = { ...variables, [stmt.name]: evaluate(stmt.expr, ctx) }
				path = nextPath(program, node, path)
				break
			case 'if': {
				const index = stmt.branches.findIndex(
					(b) => b.condition === null || truthy(evaluate(b.condition, ctx))
				)
				path = index === -1 ? nextPath(program, node, path) : descend(program, node, path, index)
				break
			}
			case 'jump': {
				const destination =
					typeof stmt.destination === 'string'
						? stmt.destination
						: String(evaluate(stmt.destination, ctx))
				if (!program.nodes[destination]) throw new Error(`node "${destination}" does not exist`)
				node = destination
				path = [0]
				visited = { ...visited, [destination]: (visited[destination] ?? 0) + 1 }
				break
			}
			case 'stop':
				path = null
				break
		}
	}

	return { node, path, variables, visited }
}

// ---- expressions

// the parser keeps the whitespace that sits before a #hashtag, so trim the end
function render(parts: TextPart[], ctx: Context): string {
	return parts
		.map((p) => (p.type === 'text' ? p.text : String(evaluate(p.expr, ctx))))
		.join('')
		.trimEnd()
}

function truthy(value: Value): boolean {
	return Boolean(value)
}

const builtins: Record<string, (ctx: Context, ...args: Value[]) => Value> = {
	visited: (ctx, name) => (ctx.visited[String(name)] ?? 0) > 0,
	visited_count: (ctx, name) => ctx.visited[String(name)] ?? 0
}

function evaluate(expr: Expr, ctx: Context): Value {
	switch (expr.type) {
		case 'literal':
			return expr.value
		case 'variable': {
			const value = ctx.variables[expr.name]
			if (value === undefined) throw new Error(`undefined variable "$${expr.name}"`)
			return value
		}
		case 'unary': {
			const operand = evaluate(expr.operand, ctx)
			return expr.op === 'neg' ? -Number(operand) : !truthy(operand)
		}
		case 'binary': {
			if (expr.op === 'and') return truthy(evaluate(expr.left, ctx)) && truthy(evaluate(expr.right, ctx))
			if (expr.op === 'or') return truthy(evaluate(expr.left, ctx)) || truthy(evaluate(expr.right, ctx))
			const left = evaluate(expr.left, ctx)
			const right = evaluate(expr.right, ctx)
			switch (expr.op) {
				case '+':
					return typeof left === 'string' || typeof right === 'string'
						? String(left) + String(right)
						: Number(left) + Number(right)
				case '-':
					return Number(left) - Number(right)
				case '*':
					return Number(left) * Number(right)
				case '/':
					return Number(left) / Number(right)
				case '%':
					return Number(left) % Number(right)
				case '^':
					return Number(left) ** Number(right)
				case 'xor':
					return truthy(left) !== truthy(right)
				case '==':
					return left === right
				case '!=':
					return left !== right
				case '>':
					return left > right
				case '>=':
					return left >= right
				case '<':
					return left < right
				case '<=':
					return left <= right
			}
			break
		}
		case 'call': {
			const args = expr.args.map((a) => evaluate(a, ctx))
			const builtin = builtins[expr.name]
			if (builtin) return builtin(ctx, ...args)
			const fn = ctx.functions[expr.name]
			if (!fn) throw new Error(`function "${expr.name}" not found`)
			return fn(...args)
		}
	}
	throw new Error('unreachable expression')
}
