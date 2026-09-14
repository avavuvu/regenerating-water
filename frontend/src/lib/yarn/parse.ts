// adapter from the bondage parser output to our own plain ast.
// this is the only file that touches @mnbroatch/bondage.

import bondage, { type RawParserNode } from '@mnbroatch/bondage'
import type { BinaryOp, Branch, Expr, Option, Program, Statement, TextPart, YarnNode } from './ast'

export function parseYarn(source: string): Program {
	const runner = new bondage.Runner()
	runner.noEscape = true
	runner.load(desugar(source))

	const nodes: Record<string, YarnNode> = {}
	for (const title of Object.keys(runner.yarnNodes)) {
		try {
			const { parserNodes, metadata } = runner.getParserNodes(title)
			const { title: _title, ...headers } = metadata
			nodes[title] = { title, headers, body: convertBody(parserNodes) }
		} catch (cause) {
			const message = cause instanceof Error ? cause.message : String(cause)
			throw new Error(`failed to parse node "${title}": ${message}`, { cause })
		}
	}

	return { nodes, variables: { ...runner.variables.data } }
}

// the bondage grammar lacks yarn spinner 2 compound assignment,
// so rewrite `<<set $x += e>>` to `<<set $x = $x + (e)>>` first
const compoundAssignment = /<<\s*set\s+(\$\w+)\s*([-+*/%])=\s*(.+?)\s*>>/g

function desugar(source: string): string {
	return source.replace(compoundAssignment, (_, name, op, expr) => `<<set ${name} = ${name} ${op} (${expr})>>`)
}

const textTypes = new Set(['TextNode', 'EscapedCharacterNode', 'InlineExpressionNode'])

function convertBody(raw: (RawParserNode | null | undefined)[]): Statement[] {
	const nodes = raw.filter((n): n is RawParserNode => Boolean(n))
	const body: Statement[] = []
	let i = 0

	while (i < nodes.length) {
		const node = nodes[i]

		if (textTypes.has(node.type)) {
			const lineNum = node.lineNum as number
			const run: RawParserNode[] = []
			while (i < nodes.length && textTypes.has(nodes[i].type) && nodes[i].lineNum === lineNum) {
				run.push(nodes[i])
				i++
			}
			body.push({
				type: 'line',
				text: convertParts(run),
				hashtags: (node.hashtags as string[]) ?? [],
				lineNum
			})
			continue
		}

		if (node.type === 'DialogShortcutNode') {
			const options: Option[] = []
			while (i < nodes.length && nodes[i].type === 'DialogShortcutNode') {
				options.push(convertOption(nodes[i]))
				i++
			}
			body.push({ type: 'options', options, lineNum: options[0].lineNum })
			continue
		}

		body.push(convertStatement(node))
		i++
	}

	return body
}

function convertStatement(node: RawParserNode): Statement {
	switch (node.type) {
		case 'SetVariableEqualToNode':
			return {
				type: 'set',
				name: node.variableName as string,
				expr: convertExpr(node.expression as RawParserNode)
			}
		case 'IfNode':
		case 'IfElseNode':
		case 'ElseIfNode':
		case 'ElseNode':
			return { type: 'if', branches: convertBranches(node) }
		case 'JumpCommandNode': {
			const destination = node.destination as string | RawParserNode
			return {
				type: 'jump',
				destination: typeof destination === 'string' ? destination : convertExpr(destination)
			}
		}
		case 'StopCommandNode':
			return { type: 'stop' }
		case 'GenericCommandNode':
			return {
				type: 'command',
				text: convertParts(node.command as RawParserNode[]),
				hashtags: (node.hashtags as string[]) ?? [],
				lineNum: node.lineNum as number
			}
		default:
			throw new Error(`unknown statement type: ${node.type}`)
	}
}

function convertBranches(node: RawParserNode): Branch[] {
	const branches: Branch[] = []
	let current: RawParserNode | undefined = node
	while (current) {
		branches.push({
			condition: current.type === 'ElseNode' ? null : convertExpr(current.expression as RawParserNode),
			body: convertBody(current.statement as RawParserNode[])
		})
		current = current.elseStatement as RawParserNode | undefined
	}
	return branches
}

function convertOption(node: RawParserNode): Option {
	return {
		text: convertParts(node.text as RawParserNode[]),
		condition: node.conditionalExpression
			? convertExpr(node.conditionalExpression as RawParserNode)
			: null,
		hashtags: (node.hashtags as string[]) ?? [],
		lineNum: node.lineNum as number,
		body: convertBody((node.content as RawParserNode[] | undefined) ?? [])
	}
}

function convertParts(nodes: RawParserNode[]): TextPart[] {
	return nodes.map((n) =>
		n.type === 'InlineExpressionNode'
			? { type: 'expr', expr: convertExpr(n.expression as RawParserNode) }
			: { type: 'text', text: n.text as string }
	)
}

const binaryOps: Record<string, BinaryOp> = {
	ArithmeticExpressionAddNode: '+',
	ArithmeticExpressionMinusNode: '-',
	ArithmeticExpressionMultiplyNode: '*',
	ArithmeticExpressionDivideNode: '/',
	ArithmeticExpressionModuloNode: '%',
	ArithmeticExpressionExponentNode: '^',
	BooleanAndExpressionNode: 'and',
	BooleanOrExpressionNode: 'or',
	BooleanXorExpressionNode: 'xor',
	EqualToExpressionNode: '==',
	NotEqualToExpressionNode: '!=',
	GreaterThanExpressionNode: '>',
	GreaterThanOrEqualToExpressionNode: '>=',
	LessThanExpressionNode: '<',
	LessThanOrEqualToExpressionNode: '<='
}

function convertExpr(node: RawParserNode): Expr {
	switch (node.type) {
		case 'NumericLiteralNode':
			return { type: 'literal', value: parseFloat(node.numericLiteral as string) }
		case 'StringLiteralNode':
			return { type: 'literal', value: node.stringLiteral as string }
		case 'BooleanLiteralNode':
			return { type: 'literal', value: node.booleanLiteral === 'true' }
		case 'VariableNode':
			return { type: 'variable', name: node.variableName as string }
		case 'UnaryMinusExpressionNode':
			return { type: 'unary', op: 'neg', operand: convertExpr(node.expression as RawParserNode) }
		case 'NegatedBooleanExpressionNode':
			return { type: 'unary', op: 'not', operand: convertExpr(node.expression as RawParserNode) }
		case 'FunctionCallNode':
			return {
				type: 'call',
				name: node.functionName as string,
				args: (node.args as RawParserNode[]).map(convertExpr)
			}
		case 'InlineExpressionNode':
			return convertExpr(node.expression as RawParserNode)
		default: {
			const op = binaryOps[node.type]
			if (!op) throw new Error(`unknown expression type: ${node.type}`)
			return {
				type: 'binary',
				op,
				left: convertExpr(node.expression1 as RawParserNode),
				right: convertExpr(node.expression2 as RawParserNode)
			}
		}
	}
}
