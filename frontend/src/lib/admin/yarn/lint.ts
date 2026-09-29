import { linter, type Diagnostic } from '@codemirror/lint'
import { analyseStory, type KnownAssets } from '$lib/yarn/validate'

export function yarnLint(assets: () => KnownAssets) {
	return linter(
		(view) => {
			const doc = view.state.doc
			return analyseStory(doc.toString(), assets()).diagnostics.map((d): Diagnostic => {
				const line = doc.line(Math.min(Math.max(d.line, 1), doc.lines))
				return { from: line.from, to: line.to, severity: d.severity, message: d.message }
			})
		},
		{ delay: 400 }
	)
}
