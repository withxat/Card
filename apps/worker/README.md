# Card Worker

This package contains the Cloudflare Worker that powers Card.

The Worker returns a terminal-friendly card for command-line clients and proxies
browser traffic to the original site.

## Behavior

| Request                            | Result                        |
| ---------------------------------- | ----------------------------- |
| `curl https://xat.sh/`             | Returns the terminal card     |
| `curl -L http://xat.sh/`           | Follows HTTPS redirect if any |
| Browser visit to `https://xat.sh/` | Proxies to the origin website |
| `https://xat.sh/about`             | Proxies to the origin website |

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

Test browser-style passthrough:

```sh
curl -A 'Mozilla/5.0' http://127.0.0.1:8787/
```

The browser-style request attempts to fetch the configured origin behavior, so
it is useful for checking that Card does not intercept normal browser traffic.

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
- optional browser-only HTTPS redirects;
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

## Configuration

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
	]
}
```

For your own domain, change both `pattern` and `zone_name`.

The matching DNS record must be Cloudflare `Proxied`. If it is `DNS only`,
requests go directly to the origin and the Worker will not run.

## Custom Card Text

The default neofetch-style card lives in [`src/index.ts`](src/index.ts).

For a fully static override, you can also add `CARD_TEXT` to `vars` in
`wrangler.jsonc`:

```jsonc
{
	"vars": {
		"CARD_TEXT": "Name\n---\nSite: https://example.com\n"
	}
}
```

`CARD_TEXT` replaces the built-in styled card exactly, so include any ANSI escape
codes yourself if you still want color.

## Optional Browser HTTPS Redirect

If you disable Cloudflare's global **Always Use HTTPS** setting but still want
browsers to move from HTTP to HTTPS, set:

```jsonc
{
	"vars": {
		"BROWSER_HTTPS_REDIRECT": "true"
	}
}
```

With that setting, command-line clients can still receive the card on plain HTTP,
while browser requests get a `301` to HTTPS.
