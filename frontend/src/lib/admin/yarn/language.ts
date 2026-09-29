import { StreamLanguage, type StringStream } from '@codemirror/language'
import { tagHighlighter, tags } from '@lezer/highlight'

interface YarnState {
	body: boolean
	command: boolean
	expression: boolean
	header: 'key' | 'value' | null
	headerKey: string
	commandStart: boolean
}

const WORD = /^[^\s<>{}[\]$#"/]+/

function tokenCommand(stream: StringStream, state: YarnState): string | null {
	if (stream.match('>>')) {
		state.command = false
		return 'bracket'
	}
	if (stream.eatSpace()) return null
	if (state.commandStart) {
		state.commandStart = false
		if (stream.match(/^[A-Za-z_]\w*/)) return 'keyword'
	}
	if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return 'string'
	if (stream.match(/^\$\w+/)) return 'variableName'
	if (stream.match(/^-?\d+(\.\d+)?/)) return 'number'
	if (stream.match(/^(==|!=|<=|>=|&&|\|\||[-+*/%=<>!(),])/)) return 'operator'
	if (stream.match(/^[A-Za-z_]\w*/)) return 'atom'
	stream.next()
	return null
}

function tokenExpression(stream: StringStream, state: YarnState): string | null {
	if (stream.eat('}')) {
		state.expression = false
		return 'bracket'
	}
	if (stream.eatSpace()) return null
	if (stream.match(/^\$\w+/)) return 'variableName'
	if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return 'string'
	if (stream.match(/^-?\d+(\.\d+)?/)) return 'number'
	stream.next()
	return 'operator'
}

function tokenHeader(stream: StringStream, state: YarnState): string | null {
	if (stream.sol()) {
		state.header = null
		if (stream.match(/^\s*---\s*$/)) {
			state.body = true
			return 'meta'
		}
		if (stream.match(/^\s*\/\/.*/)) return 'comment'
		const key = stream.match(/^\s*[A-Za-z_][\w-]*/) as RegExpMatchArray | null
		if (key) {
			state.header = 'key'
			state.headerKey = key[0].trim()
			return 'propertyName'
		}
	}
	if (state.header === 'key' && stream.match(/^\s*:\s*/)) {
		state.header = 'value'
		return 'punctuation'
	}
	if (state.header === 'value') {
		stream.skipToEnd()
		return state.headerKey === 'title' ? 'heading' : 'string'
	}
	stream.skipToEnd()
	return 'invalid'
}

function tokenBody(stream: StringStream, state: YarnState): string | null {
	if (stream.sol() && stream.match(/^\s*===\s*$/)) {
		state.body = false
		return 'meta'
	}
	if (stream.sol() && stream.match(/^\s*->/)) return 'keyword'
	if ((stream.sol() || /\s/.test(stream.string.charAt(stream.pos - 1))) && stream.match('//')) {
		stream.skipToEnd()
		return 'comment'
	}
	if (stream.match('<<')) {
		state.command = true
		state.commandStart = true
		return 'bracket'
	}
	if (stream.eat('{')) {
		state.expression = true
		return 'bracket'
	}
	if (stream.match(/^\[\/?[A-Za-z_][\w-]*[^\]]*\]/)) return 'tagName'
	if (stream.match(/^#[^\s#]+/)) return 'labelName'
	if (stream.match(/^\$\w+/)) return 'variableName'
	if (stream.match(WORD)) return null
	stream.next()
	return null
}

export const yarnLanguage = StreamLanguage.define<YarnState>({
	name: 'yarn',
	startState: () => ({
		body: false,
		command: false,
		expression: false,
		header: null,
		headerKey: '',
		commandStart: false
	}),
	copyState: (state) => ({ ...state }),
	token(stream, state) {
		if (!state.body) return tokenHeader(stream, state)
		if (state.command) return tokenCommand(stream, state)
		if (state.expression) return tokenExpression(stream, state)
		return tokenBody(stream, state)
	},
	languageData: {
		commentTokens: { line: '//' }
	},
	tokenTable: {
		labelName: tags.labelName,
		invalid: tags.invalid
	}
})

export const yarnHighlighter = tagHighlighter([
	{ tag: tags.meta, class: 'yarn-meta' },
	{ tag: tags.propertyName, class: 'yarn-header' },
	{ tag: tags.heading, class: 'yarn-title' },
	{ tag: tags.string, class: 'yarn-string' },
	{ tag: tags.keyword, class: 'yarn-keyword' },
	{ tag: tags.atom, class: 'yarn-word' },
	{ tag: tags.variableName, class: 'yarn-variable' },
	{ tag: tags.number, class: 'yarn-number' },
	{ tag: tags.operator, class: 'yarn-operator' },
	{ tag: tags.bracket, class: 'yarn-bracket' },
	{ tag: tags.tagName, class: 'yarn-markup' },
	{ tag: tags.labelName, class: 'yarn-hashtag' },
	{ tag: tags.comment, class: 'yarn-comment' },
	{ tag: tags.invalid, class: 'yarn-invalid' }
])
