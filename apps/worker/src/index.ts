export interface Env {
	BROWSER_HTTPS_REDIRECT?: string
	CARD_TEXT?: string
}

type Fetcher = (request: Request) => Promise<Response>

const DEFAULT_CARD = `Xat
---
Blog: https://blog.xat.sh
GitHub: https://github.com/withxat
X: https://x.com/withxat
Email: i@xat.sh
`

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
