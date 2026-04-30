# Card

Card is a Cloudflare Worker that turns a domain root into a command-line
business card without taking over the normal website.

```sh
curl https://xat.sh
curl -L xat.sh
```

Browser visits to the same root URL are passed through to the original site, and
non-root paths such as `/about`, `/blog`, and `/assets/app.js` are ignored by the
configured Worker route.

## How It Works

Deploy the Worker as a Cloudflare Worker Route on the apex root pattern:

```txt
xat.sh
```

Cloudflare treats a route pattern without an explicit path as `/`, so the Worker
only receives:

- `http://xat.sh/`
- `https://xat.sh/`

The Worker then:

1. returns `text/plain` card content for command-line clients such as curl, wget,
   and HTTPie;
2. fetches the origin for browser requests;
3. fetches the origin for any non-root request as a defensive fallback.

If Cloudflare's **Always Use HTTPS** setting is enabled, `curl xat.sh` may see a
301 before the Worker response. Use `curl https://xat.sh` or `curl -L xat.sh` for
stable behavior. To make plain `curl xat.sh` show the card directly, disable the
global redirect and set `BROWSER_HTTPS_REDIRECT=true` so only browsers are
redirected by the Worker.

## Project Structure

```txt
apps/worker/       Cloudflare Worker implementation
packages/ui/       Shared React component library retained from the workspace
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (LTS recommended)
- [pnpm](https://pnpm.io/installation) 10.x

### Install

```sh
pnpm install
```

### Scripts

| Command          | Description                    |
| ---------------- | ------------------------------ |
| `pnpm build`     | Build all packages             |
| `pnpm test`      | Run tests                      |
| `pnpm typecheck` | Type-check all packages        |
| `pnpm lint`      | Lint all packages              |
| `pnpm lint:fix`  | Lint and auto-fix all packages |

All scripts run through Turborepo.

## Deploy

```sh
pnpm --filter @withxat/card-worker deploy
```

The deploy script builds `apps/worker/src/index.ts` with tsdown before handing
`dist/index.js` to Wrangler. Edit `apps/worker/wrangler.jsonc` to change the
route, zone, or card text.

## License

[MIT](LICENSE)

## Author

**Card** © [Xat](https://github.com/withxat), Released under the [MIT](https://github.com/withxat/Card/blob/main/LICENSE) License.<br>
Authored and maintained by Xat with help from contributors ([list](https://github.com/withxat/Card/graphs/contributors)).

> [Blog](https://blog.xat.sh) · GitHub [@withxat](https://github.com/withxat) · Telegram [@withxat](https://t.me/withxat) · X [@withxat](https://x.com/withxat) · Email [i@xat.sh](mailto:i@xat.sh)
