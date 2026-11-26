import type { CardConfig, Sleep } from './card.js'

import defaultCard from '../card.config.js'
import { layoutCard, renderLines, renderText, streamLines } from './card.js'

export interface Env {
	BROWSER_HTTPS_REDIRECT?: string
	ORIGIN_PASSTHROUGH?: string
}

type Fetcher = (request: Request) => Promise<Response>

interface Options {
	card?: CardConfig
	originFetch?: Fetcher
	sleep?: Sleep
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

function cardResponse(
	request: Request,
	card: CardConfig,
	{ animate, color, sleep }: { animate: boolean, color: boolean, sleep?: Sleep },
): Response {
	const url = new URL(request.url)
	const rows = layoutCard(card, url.host)

	if (animate) {
		return new Response(streamLines(renderLines(rows, { color }), sleep), {
			headers: {
				...RESPONSE_HEADERS,
				'content-type': 'text/plain; charset=UTF-8',
				'x-accel-buffering': 'no',
			},
		})
	}

	return new Response(renderText(rows, { color }), {
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
	{ card = defaultCard, originFetch = fetch, sleep }: Options = {},
): Promise<Response> {
	const passthrough = env.ORIGIN_PASSTHROUGH === 'true'

	if (!isRootRequest(request)) {
		return passthrough ? originFetch(request) : new Response('Not Found\n', { status: 404 })
	}

	if (isCommandLineClient(request)) {
		const url = new URL(request.url)
		const color = !url.searchParams.has('plain')
		const animate = (
			request.method === 'GET'
			&& card.animate !== false
			&& color
			&& !url.searchParams.has('static')
		)

		return cardResponse(request, card, { animate, color, sleep })
	}

	if (shouldRedirectBrowserToHttps(request, env)) {
		return httpsRedirect(request)
	}

	return passthrough
		? originFetch(request)
		: cardResponse(request, card, { animate: false, color: false })
}

export default {
	fetch(request: Request, env: Env): Promise<Response> {
		return handleRequest(request, env)
	},
}
