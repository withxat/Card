import type { CardConfig } from './card.js'

import defaultCard from '../card.config.js'
import { layoutCard, renderText } from './card.js'

export interface Env {
	BROWSER_HTTPS_REDIRECT?: string
	ORIGIN_PASSTHROUGH?: string
}

type Fetcher = (request: Request) => Promise<Response>

interface Options {
	card?: CardConfig
	originFetch?: Fetcher
}

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

const RESPONSE_HEADERS = {
	'cache-control': 'no-store',
	'vary': 'User-Agent',
	'x-content-type-options': 'nosniff',
}

function cardResponse(request: Request, card: CardConfig, { color }: { color: boolean }): Response {
	const url = new URL(request.url)
	const text = renderText(layoutCard(card, url.host), { color })

	return new Response(text, {
		headers: { ...RESPONSE_HEADERS, 'content-type': 'text/plain; charset=UTF-8' },
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
	{ card = defaultCard, originFetch = fetch }: Options = {},
): Promise<Response> {
	const passthrough = env.ORIGIN_PASSTHROUGH === 'true'

	if (!isRootRequest(request)) {
		return passthrough ? originFetch(request) : new Response('Not Found\n', { status: 404 })
	}

	if (isCommandLineClient(request)) {
		const color = !new URL(request.url).searchParams.has('plain')

		return cardResponse(request, card, { color })
	}

	if (shouldRedirectBrowserToHttps(request, env)) {
		return httpsRedirect(request)
	}

	return passthrough ? originFetch(request) : cardResponse(request, card, { color: false })
}

export default {
	fetch(request: Request, env: Env): Promise<Response> {
		return handleRequest(request, env)
	},
}
