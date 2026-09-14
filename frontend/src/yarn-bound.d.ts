// type declarations for yarn-bound 0.5.x
// source: https://github.com/mnbroatch/yarn-bound

declare module 'yarn-bound' {
	export type MarkupPropertyValue = string | number | boolean

	export interface MarkupAttribute {
		name: string
		position?: number
		length?: number
		properties?: Record<string, MarkupPropertyValue>
	}

	export interface ResultMetadata {
		title: string
		filetags?: string[]
		[header: string]: unknown
	}

	export interface VariableStorage {
		get(name: string): unknown
		set(name: string, value: unknown): void
		display?(name: string): unknown
	}

	export type YarnFunction = (...args: any[]) => unknown

	export interface YarnBoundOptions {
		dialogue: string
		startAt?: string
		functions?: Record<string, YarnFunction>
		variableStorage?: VariableStorage
		handleCommand?: (result: YarnBound.CommandResult) => void
		combineTextAndOptionsResults?: boolean
		locale?: string
		pauseCommand?: string
	}

	export type YarnResult =
		| YarnBound.TextResult
		| YarnBound.OptionsResult
		| YarnBound.CommandResult

	// not named exports: at runtime they exist only as statics on the default export
	namespace YarnBound {
		abstract class Result {
			hashtags: string[]
			metadata: ResultMetadata
			isDialogueEnd?: true
		}

		class TextResult extends Result {
			text: string
			markup: MarkupAttribute[]
		}

		class OptionResult {
			text: string
			isAvailable: boolean
			hashtags: string[]
			markup: MarkupAttribute[]
			metadata?: ResultMetadata
		}

		class OptionsResult extends Result {
			options: OptionResult[]
			text?: string
			markup?: MarkupAttribute[]
			selected?: number
			select(index: number): void
		}

		class CommandResult extends Result {
			command: string
		}
	}

	class YarnBound {
		constructor(options: YarnBoundOptions)

		currentResult: YarnResult
		history: YarnResult[]
		locale?: string
		pauseCommand: string
		combineTextAndOptionsResults?: boolean
		handleCommand?: (result: YarnBound.CommandResult) => void

		advance(optionIndex?: number): void
		jump(nodeTitle: string): void
		registerFunction(name: string, func: YarnFunction): void

		static TextResult: typeof YarnBound.TextResult
		static OptionsResult: typeof YarnBound.OptionsResult
		static CommandResult: typeof YarnBound.CommandResult
	}

	export default YarnBound
}
