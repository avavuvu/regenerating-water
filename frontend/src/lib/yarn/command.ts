export interface Command {
	name: string
	args: string[]
}

// splits `name arg "quoted arg" arg` on whitespace, keeping quoted text together
export function parseCommand(command: string): Command {
	const tokens = command.match(/"[^"]*"|\S+/g) ?? []
	const [name = '', ...args] = tokens.map((t) =>
		t.length >= 2 && t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t
	)
	return { name, args }
}
