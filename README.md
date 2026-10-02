# Fix LinkedIn Layout

Chrome extension (Manifest V3, TypeScript) that fixes LinkedIn's desktop layout:

- The header and the left / main / right columns stretch to the full window and share the same left and right edges, so nothing is off-centre any more.
- On wide screens (≥ 1600px by default) the messaging panel is docked as a full-height sidebar on the right. It opens automatically on load. Conversations you open appear to its left.
- The fix is re-applied as you use the page: SPA navigation, lazy-loaded rails, resizes, and messaging opening or closing.

```
| 20 | left | 24 | main (fills) | 24 | right | 24 | messaging | 20 |
```

## Repository layout

This is a [Turborepo](https://turborepo.com) monorepo using npm workspaces:

| Path | What |
| --- | --- |
| `apps/extension` | The Chrome extension (TypeScript, esbuild, Playwright tests) |
| `apps/web` | Landing page (Vite + React + TypeScript) |

Requires Node.js 22.12 or newer.

```sh
npm install
npm run build      # build everything
npm run dev        # extension in watch mode + website dev server
npm run typecheck
npm test
```

The website is deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main` that touches the website or the extension, using the official Pages actions (no `gh-pages` branch). The same workflow builds the extension and publishes it next to the site as `fix-linkedin-layout.zip`, so the site's download button always serves the latest build from `main`. The version shown on the site is read from `apps/extension/manifest.json`. The repo's **Settings → Pages → Source** must be set to **GitHub Actions**.

Run a task for one app with a filter, e.g. `npx turbo run dev --filter=@fix-linkedin-layout/web`.

## Install

Download `fix-linkedin-layout.zip` from the [website](https://singerbj.github.io/fix-linkedin-layout/) and unzip it. Then go to `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick the unzipped folder.

To build from source instead:

```sh
npm install
npm run build
```

Then load the `apps/extension/dist/` folder the same way.
After you change the code, run `npm run build` (or `npm run dev`) and click reload on the extension card.

## Settings (toolbar popup)

| Setting | Default | |
| --- | --- | --- |
| Enabled | on | Master switch |
| Apply from width | 1200px | Below this width LinkedIn's own layout is left alone |
| Dock messaging sidebar | on | |
| Dock from width | 1600px | |
| Auto-open messaging | on | Opens the panel on load. If you minimize it yourself, it stays minimized and the columns take the space back |
| Debug outlines | off | Outlines every element the extension re-laid out |

## How it works

LinkedIn ships obfuscated class names that change often, so `apps/extension/src/content.ts` doesn't depend on them. It identifies the page structure like this:

- **Header**: `#global-nav` / `header`. Its content container is the deepest element that still contains every visible control.
- **Column row**: starting from the feed (`.scaffold-layout__main`, `[data-testid="mainFeed"]`, `main`, …), walk up until an ancestor lays out two or more large children side by side. Columns are ordered by their on-screen position, not DOM order.
- **Messaging**: `#msg-overlay` / `.msg-overlay-list-bubble` when present. Otherwise, a fixed panel at the bottom right of the viewport that contains a "Messaging" title.

Each piece it finds gets a `data-fll-*` attribute. All the styling is in `apps/extension/src/content.css` and targets only those attributes, so nothing changes on elements that weren't identified.

## If something looks off

LinkedIn changes its markup often. Open the popup on the broken page and click **Copy diagnostics**. That copies a JSON snapshot of what was detected: element tags, classes, `data-*` attributes and sizes, with no post content. Include it in an issue.

## Tests

`npm test` builds the extension, loads it into headless Chromium and runs it against two mock LinkedIn pages: one with LinkedIn's classic class names and one with random class names and a different DOM order. It checks:

- alignment and docking at 2000px
- full-width layout without the dock at 1400px
- no changes at 1100px
- SPA re-render, resize, opening a conversation, and a user minimizing messaging

## Contributing

Issues and pull requests are welcome. Please run `npm run typecheck` and `npm test` before opening a PR.

## License

[MIT](LICENSE). Not affiliated with or endorsed by LinkedIn.
