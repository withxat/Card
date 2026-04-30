# Card Worker

This package contains the Cloudflare Worker that powers Card.

It returns a terminal-friendly card for command-line clients, redirects browsers
from HTTP to HTTPS when configured, and proxies normal browser traffic to the
original site.

## Behavior

| Request                   | Result                             |
| ------------------------- | ---------------------------------- |
| `curl xat.sh`             | Returns the terminal card          |
| `curl http://xat.sh/`     | Returns the terminal card          |
| Browser `http://xat.sh/`  | Redirects to HTTPS when configured |
| Browser `https://xat.sh/` | Proxies to the origin website      |
| `https://xat.sh/about`    | Proxies to the origin website      |

Command-line clients are detected by `User-Agent`. The current list includes
curl, wget, HTTPie, xh, aria2, Python Requests, Go's default HTTP client, and
libwww-perl.

## Local Development

From the repository root:

```sh
pnpm --filter @withxat/card-worker run dev
```

Test the card response:

```sh
curl -A 'curl/8.7.1' http://127.0.0.1:8787/
```

Test browser-style behavior:

```sh
curl -i -A 'Mozilla/5.0' http://127.0.0.1:8787/
curl -i -A 'Mozilla/5.0' http://127.0.0.1:8787/about
```

## Build

```sh
pnpm --filter @withxat/card-worker run build
```

Build uses tsdown, not `tsc`, to emit the deployable Worker bundle:

```txt
src/index.ts -> dist/index.js
```

Type checking is separate:

```sh
pnpm --filter @withxat/card-worker run typecheck
```

## Test

```sh
pnpm --filter @withxat/card-worker run test
```

The test suite covers:

- root path matching;
- command-line client detection;
- card responses;
- browser passthrough;
- non-root passthrough;
- browser-only HTTPS redirects;
- ANSI-styled default output.

## Deploy

Login once:

```sh
pnpm --filter @withxat/card-worker exec wrangler login
```

Deploy:

```sh
pnpm --filter @withxat/card-worker run deploy
```

The deploy script runs `pnpm build` first and then `wrangler deploy`.

Verify:

```sh
curl xat.sh
```

## Cloudflare Setup

Edit [`wrangler.jsonc`](wrangler.jsonc):

```jsonc
{
	"name": "card",
	"main": "dist/index.js",
	"routes": [
		{
			"pattern": "xat.sh",
			"zone_name": "xat.sh"
		}
	],
	"vars": {
		"BROWSER_HTTPS_REDIRECT": "true"
	}
}
```

For your own domain, change both `pattern` and `zone_name`.

The matching DNS record must be Cloudflare `Proxied`. If it is `DNS only`,
requests go directly to the origin and the Worker will not run.

## Route Shape

Use the apex route pattern:

```txt
xat.sh
```

This keeps Card focused on:

- `http://xat.sh/`
- `https://xat.sh/`

It does not take over:

- `https://xat.sh/about`
- `https://xat.sh/blog`
- `https://xat.sh/assets/app.js`

The Worker still defensively proxies non-root paths in case the route is changed
later.

## Browser HTTPS Redirect

This project uses:

```jsonc
{
	"vars": {
		"BROWSER_HTTPS_REDIRECT": "true"
	}
}
```

With that setting:

- command-line clients can receive the card on plain HTTP, so `curl xat.sh`
  works without `-L`;
- browsers visiting `http://xat.sh/` get a `301` redirect to
  `https://xat.sh/`;
- browsers visiting `https://xat.sh/` are proxied to the origin website.

For this to matter, Cloudflare's global **Always Use HTTPS** should not intercept
the request before the Worker. Prefer a more specific Redirect Rule or the
Worker-level redirect above.

## Custom Card Text

The default neofetch-style card lives in [`src/index.ts`](src/index.ts).

For a fully static override, you can add `CARD_TEXT` to `vars` in
`wrangler.jsonc`:

```jsonc
{
	"vars": {
		"BROWSER_HTTPS_REDIRECT": "true",
		"CARD_TEXT": "Name\n---\nSite: https://example.com\n"
	}
}
```

`CARD_TEXT` replaces the built-in styled card exactly, so include any ANSI escape
codes yourself if you still want color.
