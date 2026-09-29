import { LanguageSupport } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import type { KnownAssets } from '$lib/yarn/validate'
import { yarnCompletions } from './completions'
import { commandHover } from './hover'
import { yarnHighlighter, yarnLanguage } from './language'
import { yarnLint } from './lint'

export { yarnHighlighter }

export function yarn(assets: () => KnownAssets): LanguageSupport {
	return new LanguageSupport(yarnLanguage, [yarnLanguage.data.of({ autocomplete: yarnCompletions(assets) })])
}

export function yarnTools(assets: () => KnownAssets): Extension[] {
	return [EditorView.darkTheme.of(true), commandHover, yarnLint(assets)]
}
