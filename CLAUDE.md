# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

A small static SPA under `app/`. Zero build step, native ES modules, no framework. The earlier `devops-hub-FINAL.html` has been retired.

```
/Users/trungtruong/devops/
  CLAUDE.md
  .github/workflows/pages.yml      GitHub Pages deploy
  app/
    index.html                     shell (sidebar + bottom-nav + Cmd-K modal)
    README.md                      run / deploy notes
    styles/                        tokens · layout · components · pages · simulators
    src/
      main.js                      entry — registers routes, paints sidebar, wires Cmd-K + theme
      core/
        router.js                  hash router with mount/unmount lifecycle
        storage.js                 real localStorage with in-memory fallback + per-domain helpers
        ui.js                      html`…`, $, $$, badge(), filtered(), shuffle, escapeHtml, copyToClipboard
        search.js                  Cmd-K search index
      data/                        foundations · tickets · mapping · decisions · scp · kql
      pages/
        foundations/{1..5}.js      14-day path, phase 1 (concept pairs)
        tickets/{t1..t9}.js        14-day path, phase 2 (mock compliance work queue)
        reference/{wiki,decisions,vault,quickref}.js
        practice/{scp,kql,azpolicy}.js   "Lab Bench" — kept simulators (decent eval engines)
        study/home.js              dashboard landing
```

The tool's purpose is the user's own DevOps-Security study hub for an upcoming compliance role. The active design — Foundations + Ticket Queue + Reference layer — is captured in `/Users/trungtruong/.claude/plans/i-am-going-to-polymorphic-hopper.md`. Read that plan before making structural changes.

## Running it

ES modules require HTTP, not `file://`:

```bash
cd /Users/trungtruong/devops
python3 -m http.server 8765
# open http://localhost:8765/app/
```

No dev server, no hot reload. Reload the page to see changes.

## Page module convention

Every page in `src/pages/**` exports:

```js
export const meta = { title: '...', cloud: 'aws' | 'azure' | 'tf' | 'home' | 'both' };
export function render() { return '<div class="page-inner">…</div>'; }
export function mount(rootEl) { /* attach handlers */ }
export function unmount() { /* optional cleanup */ }
```

Routes are registered in `src/main.js`'s `NAV` table. Add a new page = add a route entry there; the sidebar and mobile-nav render from the same table.

## Data conventions

- Data lives in `src/data/*.js` as plain ES module exports. Editing one record touches ~50 lines, not the whole app.
- The `provider` field on items (`aws` / `azure` / `tf` / `both`) drives badge colors and filtering. Don't drop or rename it.
- New persisted state goes through `core/storage.js` — never `localStorage` directly.

## Styling conventions

- Per-cloud color tokens in `styles/tokens.css`: `--green` (home), `--amber` (AWS), `--blue` (Azure), `--purple` (Terraform).
- Reuse existing classes: `.btn-aws`/`.btn-azure`/`.btn-tf`/`.btn-green`, `.badge-aws`/`.badge-azure`/`.badge-tf`/`.badge-both`, `.pt-aws`/`.pt-azure`/`.pt-tf`/`.pt-green` for panel-title color modifiers.
- Sidebar active state: `.snb.active-{home|aws|azure|tf|both}`.
- New page-level styles go in `styles/pages.css`. Simulator styles in `styles/simulators.css`.

## What lives where (for the current rewrite)

The tool is being rebuilt around the user's compliance-team role. The primary content lives in:

- `src/data/foundations.js` — five concept pairs (Days 1–5). Each has plain-English + working-engineer layers, AWS↔Azure side-by-side panels, recap, meeting talking points.
- `src/data/tickets.js` — nine mock compliance tickets (Days 6–14). Each has Brief → Investigate → Decide → Build artifact → Recap + Talking points.
- `src/data/mapping.js` — structured AWS↔Azure concept rows, queryable.
- `src/data/decisions.js` — five decision trees (SCP vs IAM, Azure Policy effect choice, etc.).

Lab-bench pages (`practice/scp`, `practice/kql`, `practice/azpolicy`) own their own data files (`data/scp.js`, `data/kql.js`) — keep them in sync if you change the templates.

## Conventions worth keeping

- **No frameworks, no bundler, no transpiler.** Plain ES modules + plain CSS.
- **No remote API calls.** Every simulator runs locally against synthetic data.
- **Mirror sidebar in mobile nav.** Both render from the same `NAV` table — single source of truth.
- **Plain-English first, technical second.** Every concept the user must learn appears with a ≤60-word jargon-free paragraph above the precise definition. If a sentence wouldn't survive being read aloud to a non-technical family member, rewrite it.

## Other files

- `.github/workflows/pages.yml` — GitHub Pages deploy.
- `.claude/settings.local.json` — local Claude permission allowlist; not application code.
- `/Users/trungtruong/.claude/plans/i-am-going-to-polymorphic-hopper.md` — the active rewrite plan, source of truth for current intent.
