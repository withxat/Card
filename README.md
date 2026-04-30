# Card

Card is a tiny Cloudflare Worker that makes a domain answer like a terminal
business card when someone visits it from the command line, while keeping the
normal browser website untouched.

```sh
curl https://xat.sh
curl -L xat.sh
```

Browser visits still see the original website. Paths such as `/about`, `/blog`,
and `/assets/app.js` are not handled by Card when the Worker is attached to the
apex route pattern.

## Who This Is For

Use Card when you want one domain to do both jobs:

- `curl example.com` shows a plain-text, ANSI-styled profile.
- `https://example.com` in a browser keeps serving your existing site.
- Existing pages and assets keep working.

The default output is neofetch-inspired and can be customized in
[`apps/worker/src/index.ts`](apps/worker/src/index.ts).

## How It Works

Deploy the Worker as a Cloudflare Worker Route on the apex root pattern:

```txt
example.com
```

For this repository the default route is:

```txt
xat.sh
```

Cloudflare treats a route pattern without an explicit path as the root path, so
the Worker only receives:

- `http://example.com/`
- `https://example.com/`

The Worker then:

1. returns a `text/plain` card for command-line clients such as curl, wget, and
   HTTPie;
2. proxies browser root requests to the origin with `fetch(request)`;
3. proxies non-root paths to the origin as a defensive fallback.

## Important Cloudflare Notes

Worker Routes only run when the matching DNS record is proxied by Cloudflare.
For the apex domain, the `@` / `example.com` DNS record must be orange-cloud
`Proxied`, not gray-cloud `DNS only`.

If Cloudflare **Always Use HTTPS** is enabled, plain `curl example.com` may see a
redirect before the Worker response. Stable commands are:

```sh
curl https://example.com
curl -L example.com
```

If you require plain `curl example.com` without `-L`, disable the global HTTPS
redirect and use a more specific Redirect Rule, or set
`BROWSER_HTTPS_REDIRECT=true` for the Worker and let only browsers redirect.

Putting Cloudflare in front of a Vercel-hosted apex domain means traffic flows:

```txt
visitor -> Cloudflare -> Worker Route -> Vercel
```

That usually works for static sites, but Vercel may show proxy-related warnings
and some Vercel security/cache features can behave differently.

## Project Structure

```txt
apps/worker/       Cloudflare Worker implementation
packages/ui/       Shared React component library retained from the workspace
```

The Worker has its own guide at
[`apps/worker/README.md`](apps/worker/README.md).

## Getting Started

### Prerequisites

- Node.js
- pnpm 10.x
- A Cloudflare account with the domain zone added

### Install

```sh
pnpm install
```

### Local Test

Start the Worker locally:

```sh
pnpm --filter @withxat/card-worker run dev
```

In another terminal:

```sh
curl -A 'curl/8.7.1' http://127.0.0.1:8787/
```

### Deploy

Login once:

```sh
pnpm --filter @withxat/card-worker exec wrangler login
```

Deploy:

```sh
pnpm --filter @withxat/card-worker run deploy
```

Verify:

```sh
curl https://xat.sh
curl -L xat.sh
```

## Scripts

| Command          | Description                    |
| ---------------- | ------------------------------ |
| `pnpm build`     | Build all packages             |
| `pnpm test`      | Run tests                      |
| `pnpm typecheck` | Type-check all packages        |
| `pnpm lint`      | Lint all packages              |
| `pnpm lint:fix`  | Lint and auto-fix all packages |

All scripts run through Turborepo.

## License

[MIT](LICENSE)

## Author

**Card** © [Xat](https://github.com/withxat), Released under the
[MIT](https://github.com/withxat/Card/blob/main/LICENSE) License.

> [Blog](https://blog.xat.sh) · GitHub [@withxat](https://github.com/withxat)
> · Telegram [@withxat](https://t.me/withxat) · X
> [@withxat](https://x.com/withxat) · Email [i@xat.sh](mailto:i@xat.sh)
