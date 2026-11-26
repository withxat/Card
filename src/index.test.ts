import type { CardConfig } from './card.js'

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

async function noOrigin(): Promise<Response> {
	throw new Error('origin must not be fetched')
}

const card: CardConfig = {
	links: [
		{ label: 'Site', value: 'https://example.com' },
		{ label: 'Email', value: 'ada@example.com' },
	],
	logo: ['/\\', '\\/'],
	motto: 'Hello.',
	name: 'Ada <Dev>',
	title: 'Engineer',
}

const passthrough = { ORIGIN_PASSTHROUGH: 'true' }

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

describe('card output', () => {
	it('renders the configured card with the curl command for the requested host', async () => {
		const response = await handleRequest(
			request('https://example.com/', 'curl/8.7.1'),
			{},
			{ card, originFetch: noOrigin },
		)
		const body = await response.text()

		assert.equal(response.status, 200)
		assert.equal(response.headers.get('content-type'), 'text/plain; charset=UTF-8')
		assert.equal(body.includes('\x1B['), true)
		assert.match(body, /Ada <Dev>/)
		assert.match(body, /curl example\.com/)
		assert.match(body, /https:\/\/example\.com/)
		assert.match(body, /Hello\./)
	})

	it('drops ANSI escapes with ?plain', async () => {
		const response = await handleRequest(
			request('https://example.com/?plain', 'curl/8.7.1'),
			{},
			{ card, originFetch: noOrigin },
		)
		const body = await response.text()

		assert.equal(body.includes('\x1B'), false)
		assert.match(body, /Site {3}https:\/\/example\.com/)
	})

	it('aligns link values by terminal width, counting CJK characters as two columns', async () => {
		const response = await handleRequest(
			request('https://example.com/?plain', 'curl/8.7.1'),
			{},
			{
				card: {
					links: [
						{ label: '博客', value: 'blog' },
						{ label: 'GitHub', value: 'gh' },
					],
					name: '林小雨',
					title: '设计工程师',
				},
				originFetch: noOrigin,
			},
		)
		const lines = (await response.text()).split('\n')

		// Labels pad to the widest label (GitHub, 6 columns) plus 2: 博客 is 4 columns wide.
		assert.equal(lines.some(line => line.endsWith('博客    blog')), true)
		assert.equal(lines.some(line => line.endsWith('GitHub  gh')), true)
		// The divider spans the widest of name and title: 设计工程师 is 10 columns.
		assert.equal(lines.some(line => line.endsWith(` ${'─'.repeat(10)}`)), true)
	})
})

describe('domain with its own website', () => {
	it('passes browser root requests through to the origin site', async () => {
		const response = await handleRequest(
			request('https://xat.sh/', 'Mozilla/5.0 Safari/605.1.15'),
			passthrough,
			{ card, originFetch },
		)

		assert.equal(response.headers.get('content-type'), 'text/html')
		assert.equal(await response.text(), 'origin:/')
	})

	it('passes non-root curl requests through to the origin site', async () => {
		const response = await handleRequest(
			request('https://xat.sh/blog', 'curl/8.7.1'),
			passthrough,
			{ card, originFetch },
		)

		assert.equal(await response.text(), 'origin:/blog')
	})

	it('can redirect HTTP browser requests without redirecting curl', async () => {
		const env = { ...passthrough, BROWSER_HTTPS_REDIRECT: 'true' }
		const browserResponse = await handleRequest(
			request('http://xat.sh/', 'Mozilla/5.0 Safari/605.1.15'),
			env,
			{ card, originFetch },
		)
		const curlResponse = await handleRequest(
			request('http://xat.sh/', 'curl/8.7.1'),
			env,
			{ card, originFetch },
		)

		assert.equal(browserResponse.status, 301)
		assert.equal(browserResponse.headers.get('location'), 'https://xat.sh/')
		assert.match(await curlResponse.text(), /Ada <Dev>/)
	})
})

describe('domain without a website', () => {
	it('serves a plain-text card to browsers', async () => {
		const response = await handleRequest(
			request('https://example.com/', 'Mozilla/5.0 Safari/605.1.15'),
			{},
			{ card, originFetch: noOrigin },
		)
		const body = await response.text()

		assert.equal(response.headers.get('content-type'), 'text/plain; charset=UTF-8')
		assert.equal(body.includes('\x1B'), false)
		assert.match(body, /Ada <Dev>/)
		assert.match(body, /curl example\.com/)
	})

	it('answers other paths with 404 instead of fetching an origin', async () => {
		const response = await handleRequest(
			request('https://example.com/favicon.ico', 'Mozilla/5.0 Safari/605.1.15'),
			{},
			{ card, originFetch: noOrigin },
		)

		assert.equal(response.status, 404)
	})
})
