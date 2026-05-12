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
        foundations/<topic>.js     13 topic pages (org-structure, aws-scp, azure-policy, …)
        foundations/_renderer.js   shared topic-page renderer
        tickets/{t1..t9}.js        nine mock compliance tickets
        tickets/_renderer.js       shared ticket-page renderer
        reference/{wiki,decisions,vault,quickref,cheatsheet,readinglist}.js
        practice/{scp,kql,azpolicy}.js   "Lab Bench" — kept simulators (decent eval engines)
        study/home.js              dashboard landing
```

The tool's purpose is the user's own DevOps-Security study hub for an upcoming compliance role. The active design — topic-grouped Foundations + Ticket Queue + Reference layer — is captured in `/Users/trungtruong/.claude/plans/are-you-sure-all-scalable-nova.md`. Read that plan before making structural changes.

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
export function unmount() { /* optional cleanup — currently unused by all pages */ }
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

## What lives where

The tool is built around the user's compliance-team role. The primary content lives in:

- `src/data/foundations.js` — 13 topic entries grouped under 5 sub-headings: **Orientation** (org-structure), **AWS Governance** (aws-scp, aws-config, aws-control-tower), **Azure Governance** (azure-policy, azure-policy-anatomy, azure-mcsb, azure-runbooks), **Inventory & Query** (kql, resource-graph), **Defender Stack** (defender-cloud, defender-endpoint), **Terraform** (terraform). Each has plain-English + working-engineer layers, optional 2-cloud panels, recap, meeting talking points. The renderer at `pages/foundations/_renderer.js` is shape-agnostic — add a topic = add an array entry + a 5-line shim in `pages/foundations/<id>.js` + a row in `main.js`'s NAV.
- `src/data/tickets.js` — nine mock compliance tickets (T1–T9). Each has Brief → Investigate → Decide → Build artifact → Recap + Talking points.
- `src/data/mapping.js` — structured AWS↔Azure concept rows, queryable.
- `src/data/decisions.js` — five decision trees (SCP vs IAM, Azure Policy effect choice, etc.).

Lab-bench pages (`practice/scp`, `practice/kql`, `practice/azpolicy`) own their own data files (`data/scp.js`, `data/kql.js`) — keep them in sync if you change the templates.

Topic pages (one per foundation entry) and ticket pages (`t1..t9`) delegate to `src/pages/foundations/_renderer.js` and `src/pages/tickets/_renderer.js` respectively. Edit the shared renderer rather than duplicating layout changes across page files.

### Foundations item shape

Each entry in `FOUNDATIONS` is `{ id, group, order, title, subtitle, cloud, intro: {plain, mnemonic}, panels: [{cloud, service, plain, detail[], example?}], diagram?, conceptDive?: {title, body}, fieldNotes[], handsOn: {intro, steps[], selfCheck[], labLinks?}, recap[], talkingPoints[] }`. `id` is a string slug used as the route path (`/foundations/<id>`) and as the file name. `group` drives the sidebar sub-header. No `explainBackKey` — the Explain it back textarea was removed.

### Sidebar sub-groups

`main.js`'s NAV table is the single source of truth. Foundation items carry a `group` field; `renderItems()` in main.js emits a `.sb-subgroup` row whenever the group changes. The mobile sheet uses the same renderer. To add a new sidebar sub-group inside Foundations, set `group: "<new group>"` on the relevant items.

## Conventions worth keeping

- **No frameworks, no bundler, no transpiler.** Plain ES modules + plain CSS.
- **No remote API calls.** Every simulator runs locally against synthetic data.
- **Mirror sidebar in mobile nav.** Both render from the same `NAV` table — single source of truth.
- **Plain-English first, technical second.** Every concept the user must learn appears with a ≤60-word jargon-free paragraph above the precise definition. If a sentence wouldn't survive being read aloud to a non-technical family member, rewrite it.

## Other files

- `.github/workflows/pages.yml` — GitHub Pages deploy.
- `.claude/settings.local.json` — local Claude permission allowlist; not application code.
- `/Users/trungtruong/.claude/plans/are-you-sure-all-scalable-nova.md` — the active rewrite plan (regroup Foundations by topic, close coverage gaps, mobile verification). Source of truth for current intent.

## Responsive breakpoints

- `max-width: 1024px` → sidebar hides, topbar + bottom-nav appear. Covers iPhone 15 Pro (393), iPad Pro 11" portrait (834), and iPad Pro 13" portrait (1024). Laptop / iPad landscape still get the sidebar.
- `max-width: 900px` → 2-column panel grids (`.fnd-panels.grid-2`, generic `.grid-2`) collapse to 1 column.
- `max-width: 600px` → concept-dive worked-example table tightens its padding.
- `max-width: 480px` → page-inner padding drops to .75rem; h1 to 20px.
