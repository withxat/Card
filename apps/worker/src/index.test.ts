import assert from 'node:assert/strict'

import { describe, it } from 'vitest'

import { handleRequest, isCommandLineClient, isRootRequest } from './index.js'

function request(url: string, userAgent: string): Request {
	return new Request(url, {
		headers: {
			'user-agent': userAgent,
		},
	})
}

async function originFetch(request: Request): Promise<Response> {
	return new Response(`origin:${new URL(request.url).pathname}`, {
		headers: {
			'content-type': 'text/html',
		},
	})
}

describe('request matching', () => {
	it('matches only the root path', () => {
		assert.equal(isRootRequest(new Request('https://xat.sh/')), true)
		assert.equal(isRootRequest(new Request('https://xat.sh/about')), false)
		assert.equal(isRootRequest(new Request('https://xat.sh/assets/app.js')), false)
	})

	it('detects command-line clients', () => {
		assert.equal(isCommandLineClient(request('https://xat.sh/', 'curl/8.7.1')), true)
		assert.equal(isCommandLineClient(request('https://xat.sh/', 'Wget/1.21.4')), true)
		assert.equal(isCommandLineClient(request('https://xat.sh/', 'HTTPie/3.2.2')), true)
		assert.equal(
			isCommandLineClient(request('https://xat.sh/', 'Mozilla/5.0 Safari/605.1.15')),
			false,
		)
	})
})

describe('worker behavior', () => {
	it('returns a plain text card for curl at the root path', async () => {
		const response = await handleRequest(
			request('https://xat.sh/', 'curl/8.7.1'),
			{ CARD_TEXT: 'hello from xat\n' },
			originFetch,
		)

		assert.equal(response.status, 200)
		assert.equal(response.headers.get('content-type'), 'text/plain; charset=UTF-8')
		assert.equal(await response.text(), 'hello from xat\n')
	})

	it('returns a styled default card when no override is configured', async () => {
		const response = await handleRequest(
			request('https://xat.sh/', 'curl/8.7.1'),
			{},
			originFetch,
		)
		const body = await response.text()

		assert.equal(body.includes('\x1B['), true)
		assert.match(body, /Xat/)
		assert.match(body, /https:\/\/xat\.sh/)
		assert.match(body, /Code with Love/)
	})

	it('passes browser root requests through to the origin site', async () => {
		const response = await handleRequest(
			request('https://xat.sh/', 'Mozilla/5.0 Safari/605.1.15'),
			{},
			originFetch,
		)

		assert.equal(response.headers.get('content-type'), 'text/html')
		assert.equal(await response.text(), 'origin:/')
	})

	it('passes non-root curl requests through to the origin site', async () => {
		const response = await handleRequest(
			request('https://xat.sh/blog', 'curl/8.7.1'),
			{ CARD_TEXT: 'card\n' },
			originFetch,
		)

		assert.equal(await response.text(), 'origin:/blog')
	})

	it('can redirect HTTP browser requests without redirecting curl', async () => {
		const browserResponse = await handleRequest(
			request('http://xat.sh/', 'Mozilla/5.0 Safari/605.1.15'),
			{ BROWSER_HTTPS_REDIRECT: 'true' },
			originFetch,
		)
		const curlResponse = await handleRequest(
			request('http://xat.sh/', 'curl/8.7.1'),
			{ BROWSER_HTTPS_REDIRECT: 'true', CARD_TEXT: 'card\n' },
			originFetch,
		)

		assert.equal(browserResponse.status, 301)
		assert.equal(browserResponse.headers.get('location'), 'https://xat.sh/')
		assert.equal(await curlResponse.text(), 'card\n')
	})
})
