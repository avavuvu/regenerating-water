export type Value = string | number | boolean

export type BinaryOp =
	| '+'
	| '-'
	| '*'
	| '/'
	| '%'
	| '^'
	| 'and'
	| 'or'
	| 'xor'
	| '=='
	| '!='
	| '>'
	| '>='
	| '<'
	| '<='

export type Expr =
	| { type: 'literal'; value: Value }
	| { type: 'variable'; name: string }
	| { type: 'unary'; op: 'neg' | 'not'; operand: Expr }
	| { type: 'binary'; op: BinaryOp; left: Expr; right: Expr }
	| { type: 'call'; name: string; args: Expr[] }

export type TextPart = { type: 'text'; text: string } | { type: 'expr'; expr: Expr }

export interface Option {
	text: TextPart[]
	condition: Expr | null
	hashtags: string[]
	lineNum: number
	body: Statement[]
}

export interface Branch {
	condition: Expr | null
	body: Statement[]
}

export type Statement =
	| { type: 'line'; text: TextPart[]; hashtags: string[]; lineNum: number }
	| { type: 'options'; options: Option[]; lineNum: number }
	| { type: 'command'; text: TextPart[]; hashtags: string[]; lineNum: number }
	| { type: 'set'; name: string; expr: Expr }
	| { type: 'if'; branches: Branch[] }
	| { type: 'jump'; destination: string | Expr }
	| { type: 'stop' }

export interface YarnNode {
	title: string
	headers: Record<string, string>
	body: Statement[]
}

export interface Program {
	nodes: Record<string, YarnNode>
	variables: Record<string, Value>
}
