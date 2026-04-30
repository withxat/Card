export interface Env {
	BROWSER_HTTPS_REDIRECT?: string
	CARD_TEXT?: string
}

type Fetcher = (request: Request) => Promise<Response>

const ESC = '\x1B['
const RESET = `${ESC}0m`
const DIM = `${ESC}2m`
const BOLD = `${ESC}1m`
const CYAN = `${ESC}36m`
const BLUE = `${ESC}34m`
const MAGENTA = `${ESC}35m`
const GREEN = `${ESC}32m`
const YELLOW = `${ESC}33m`
const WHITE = `${ESC}37m`

const DEFAULT_CARD = [
	'',
	`${CYAN}      __   __     ${BOLD}${WHITE}Xat${RESET}`,
	`${CYAN}      \\ \\ / /     ${DIM}Design Engineer${RESET}`,
	`${BLUE}       \\ V /      ${DIM}────────────────${RESET}`,
	`${MAGENTA}       / . \\      ${GREEN}Site${RESET}    ${WHITE}https://xat.sh${RESET}`,
	`${MAGENTA}      /_/ \\_\\     ${GREEN}GitHub${RESET}  ${WHITE}https://github.com/withxat${RESET}`,
	`${YELLOW}                  ${GREEN}X${RESET}       ${WHITE}https://x.com/withxat${RESET}`,
	`${YELLOW}  ${BOLD}curl xat.sh${RESET}      ${GREEN}Email${RESET}   ${WHITE}i@xat.sh${RESET}`,
	`${DIM}                  Code with Love, Exploring the World.${RESET}`,
	'',
].join('\n')

const COMMAND_LINE_CLIENTS = [
	'curl',
	'wget',
	'httpie',
	'http-prompt',
	'xh',
	'aria2',
	'python-requests',
	'go-http-client',
	'libwww-perl',
]

export function isRootRequest(request: Request): boolean {
	const url = new URL(request.url)

	return url.pathname === '/'
}

export function isCommandLineClient(request: Request): boolean {
	const userAgent = request.headers.get('user-agent')?.toLowerCase() ?? ''

	return COMMAND_LINE_CLIENTS.some(client => userAgent.includes(client))
}

export function isBrowserRequest(request: Request): boolean {
	const userAgent = request.headers.get('user-agent')?.toLowerCase() ?? ''

	return userAgent.includes('mozilla') || request.headers.has('sec-fetch-mode')
}

function shouldRedirectBrowserToHttps(request: Request, env: Env): boolean {
	const url = new URL(request.url)

	return (
		env.BROWSER_HTTPS_REDIRECT === 'true'
		&& url.protocol === 'http:'
		&& isBrowserRequest(request)
	)
}

function cardResponse(env: Env): Response {
	return new Response(env.CARD_TEXT ?? DEFAULT_CARD, {
		headers: {
			'cache-control': 'no-store',
			'content-type': 'text/plain; charset=UTF-8',
			'x-content-type-options': 'nosniff',
		},
	})
}

function httpsRedirect(request: Request): Response {
	const url = new URL(request.url)

	url.protocol = 'https:'

	return Response.redirect(url, 301)
}

export async function handleRequest(
	request: Request,
	env: Env,
	originFetch: Fetcher = fetch,
): Promise<Response> {
	if (!isRootRequest(request)) {
		return originFetch(request)
	}

	if (isCommandLineClient(request)) {
		return cardResponse(env)
	}

	if (shouldRedirectBrowserToHttps(request, env)) {
		return httpsRedirect(request)
	}

	return originFetch(request)
}

export default {
	fetch(request: Request, env: Env): Promise<Response> {
		return handleRequest(request, env)
	},
}
