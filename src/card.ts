export type Color = 'black' | 'blue' | 'cyan' | 'green' | 'magenta' | 'red' | 'white' | 'yellow'

export interface CardLink {
	label: string
	value: string
}

export interface CardConfig {
	/** Stream the card line by line in terminals. Defaults to `true`. */
	animate?: boolean
	colors?: {
		command?: Color
		label?: Color
		/** One color per logo line; the last one repeats. */
		logo?: Color[]
	}
	links?: CardLink[]
	/** ASCII art shown on the left, one string per line. */
	logo?: string[]
	motto?: string
	name: string
	title?: string
}

export function defineCard(config: CardConfig): CardConfig {
	return config
}

export interface Segment {
	bold?: boolean
	color?: Color
	dim?: boolean
	text: string
}

export type Row = Segment[]

const MARGIN = 4
const GAP = 3

/** Terminal column width of one code point: 0 for combining marks, 2 for CJK and emoji. */
function codePointWidth(codePoint: number): number {
	if (
		(codePoint >= 0x0300 && codePoint <= 0x036F)
		|| (codePoint >= 0x200B && codePoint <= 0x200F)
		|| (codePoint >= 0x20D0 && codePoint <= 0x20FF)
		|| (codePoint >= 0xFE00 && codePoint <= 0xFE0F)
	) {
		return 0
	}

	return isWide(codePoint) ? 2 : 1
}

function isWide(codePoint: number): boolean {
	return (
		(codePoint >= 0x1100 && codePoint <= 0x115F)
		|| (codePoint >= 0x2E80 && codePoint <= 0x303E)
		|| (codePoint >= 0x3041 && codePoint <= 0x33FF)
		|| (codePoint >= 0x3400 && codePoint <= 0x4DBF)
		|| (codePoint >= 0x4E00 && codePoint <= 0x9FFF)
		|| (codePoint >= 0xA000 && codePoint <= 0xA4CF)
		|| (codePoint >= 0xAC00 && codePoint <= 0xD7A3)
		|| (codePoint >= 0xF900 && codePoint <= 0xFAFF)
		|| (codePoint >= 0xFE30 && codePoint <= 0xFE4F)
		|| (codePoint >= 0xFF00 && codePoint <= 0xFF60)
		|| (codePoint >= 0xFFE0 && codePoint <= 0xFFE6)
		|| (codePoint >= 0x1F300 && codePoint <= 0x1F64F)
		|| (codePoint >= 0x1F900 && codePoint <= 0x1F9FF)
		|| (codePoint >= 0x20000 && codePoint <= 0x3FFFD)
	)
}

export function displayWidth(text: string): number {
	let width = 0

	for (const char of text) {
		width += codePointWidth(char.codePointAt(0)!)
	}

	return width
}

function padEnd(text: string, width: number): string {
	return text + ' '.repeat(Math.max(0, width - displayWidth(text)))
}

function maxWidth(lines: string[]): number {
	return Math.max(0, ...lines.map(displayWidth))
}

/**
 * Lays the card out as rows of styled segments: the logo with the `curl` command
 * under it on the left, name, title, and links on the right, and the motto below.
 */
export function layoutCard(card: CardConfig, host: string): Row[] {
	const logo = card.logo ?? []
	const logoColors = card.colors?.logo ?? ['cyan']
	const command = `curl ${host}`
	const logoWidth = maxWidth(logo)
	const innerWidth = Math.max(logoWidth, displayWidth(command))
	const logoIndent = MARGIN + Math.floor((innerWidth - logoWidth) / 2)
	const leftWidth = MARGIN + innerWidth + GAP

	const left: Row[] = logo.map((line, index) => [{
		color: logoColors[Math.min(index, logoColors.length - 1)],
		text: ' '.repeat(logoIndent) + padEnd(line, logoWidth),
	}])

	if (logo.length > 0) {
		left.push([])
	}

	left.push([
		{ text: ' '.repeat(MARGIN + Math.floor((innerWidth - displayWidth(command)) / 2)) },
		{ bold: true, color: card.colors?.command ?? 'yellow', text: command },
	])

	const links = card.links ?? []
	const labelWidth = maxWidth(links.map(link => link.label)) + 2
	const right: Row[] = [[{ bold: true, text: card.name }]]

	if (card.title) {
		right.push([{ dim: true, text: card.title }])
	}

	right.push([{
		dim: true,
		text: '─'.repeat(Math.max(displayWidth(card.name), displayWidth(card.title ?? ''))),
	}])

	for (const link of links) {
		right.push([
			{ color: card.colors?.label ?? 'green', text: padEnd(link.label, labelWidth) },
			{ text: link.value },
		])
	}

	const rows: Row[] = [[]]

	for (let index = 0; index < Math.max(left.length, right.length); index++) {
		const leftRow = left[index] ?? []
		const rightRow = right[index] ?? []
		const used = displayWidth(leftRow.map(segment => segment.text).join(''))

		rows.push(
			rightRow.length > 0
				? [...leftRow, { text: ' '.repeat(leftWidth - used) }, ...rightRow]
				: leftRow,
		)
	}

	if (card.motto) {
		rows.push([{ text: ' '.repeat(leftWidth) }, { dim: true, text: card.motto }])
	}

	rows.push([])

	return rows.map(row => trimEnd(row))
}

function trimEnd(row: Row): Row {
	const result = row.map(segment => ({ ...segment }))
	const last = result.at(-1)

	if (last) {
		last.text = last.text.trimEnd()
	}

	return result.filter(segment => segment.text !== '')
}

const ESC = '\x1B['
const RESET = `${ESC}0m`
const COLOR_CODES: Record<Color, number> = {
	black: 30,
	blue: 34,
	cyan: 36,
	green: 32,
	magenta: 35,
	red: 31,
	white: 37,
	yellow: 33,
}

function ansi(segment: Segment): string {
	const codes = [
		segment.bold ? 1 : undefined,
		segment.dim ? 2 : undefined,
		segment.color ? COLOR_CODES[segment.color] : undefined,
	].filter(code => code !== undefined)

	return codes.length > 0 ? `${ESC}${codes.join(';')}m${segment.text}${RESET}` : segment.text
}

export function renderLines(rows: Row[], { color }: { color: boolean }): string[] {
	return rows.map(row => row.map(segment => (color ? ansi(segment) : segment.text)).join(''))
}

export function renderText(rows: Row[], { color }: { color: boolean }): string {
	return renderLines(rows, { color }).join('\n')
}

export type Sleep = (ms: number, signal?: AbortSignal) => Promise<void>

const MIN_STEP_MS = 36
const MAX_STEP_MS = 100
const MAX_TOTAL_MS = 650

/** Ease-out pacing between content lines: brisk at the top, settling on the last line. */
export function lineDelays(contentLineCount: number): number[] {
	const gaps = contentLineCount - 1

	if (gaps <= 0) {
		return []
	}

	const raw = Array.from({ length: gaps }, (_, index) => {
		const progress = gaps === 1 ? 1 : index / (gaps - 1)

		return MIN_STEP_MS + progress * progress * (MAX_STEP_MS - MIN_STEP_MS)
	})
	const total = raw.reduce((sum, ms) => sum + ms, 0)
	const scale = total > MAX_TOTAL_MS ? MAX_TOTAL_MS / total : 1

	return raw.map(ms => Math.round(ms * scale))
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) {
		return Promise.resolve()
	}

	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort)
			resolve()
		}, ms)

		function onAbort(): void {
			clearTimeout(timer)
			resolve()
		}

		signal?.addEventListener('abort', onAbort, { once: true })
	})
}

export function streamLines(lines: string[], sleep: Sleep = defaultSleep): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder()
	const chunks = lines
		.map((line, index) => ({
			isContent: line !== '',
			text: index < lines.length - 1 ? `${line}\n` : line,
		}))
		.filter(chunk => chunk.text !== '')
	const delays = lineDelays(chunks.filter(chunk => chunk.isContent).length)
	const abort = new AbortController()
	let chunkIndex = 0
	let delayIndex = 0
	let pendingDelay = 0

	return new ReadableStream<Uint8Array>({
		cancel() {
			abort.abort()
		},
		async pull(controller) {
			if (pendingDelay > 0) {
				const wait = pendingDelay

				pendingDelay = 0
				await sleep(wait, abort.signal)

				if (abort.signal.aborted) {
					return
				}
			}

			const chunk = chunks[chunkIndex++]

			if (!chunk) {
				controller.close()
				return
			}

			controller.enqueue(encoder.encode(chunk.text))

			if (chunk.isContent && delayIndex < delays.length) {
				pendingDelay = delays[delayIndex++]!
			}

			if (chunkIndex >= chunks.length) {
				controller.close()
			}
		},
	})
}
