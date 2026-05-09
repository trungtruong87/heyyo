# DevOps Security Hub — modular rewrite

A static, single-page study hub for AWS / Azure / Terraform DevOps-Security topics. Replaces the single-file `devops-hub-FINAL.html` at the repo root with a zero-build, native-ES-modules app split across ~30 small files.

## Run locally

No build step. Just serve the directory over HTTP (file:// won't load ES modules):

```bash
python3 -m http.server 8765
# then open http://localhost:8765/app/
```

## What's inside

```
app/
  index.html                 shell (sidebar + bottom-nav + Cmd-K modal)
  styles/
    tokens.css               design tokens, light/dark theme
    layout.css               app grid, sidebar, mobile nav
    components.css           card · button · badge · modal · accordion · pill
    pages.css                flashcards · quiz · plan · topic grid · etc.
    simulators.css           shared sim styles (ct-ou, kql-tbl, decision-path…)
  src/
    main.js                  entry — registers routes, paints sidebar/nav, wires Cmd-K + theme
    core/
      router.js              hash router with mount/unmount lifecycle
      storage.js              safeStorage (real localStorage with in-memory fallback)
      ui.js                   html`…`, badge(), filtered(), shuffle, escapeHtml, copyToClipboard
      search.js               Cmd-K search index across pages + topics + flashcards + quiz + scenarios
    data/
      plan.js · topics.js · flashcards.js · quiz.js · scenarios.js · kql.js · scp.js
    pages/
      study/{home,plan,topics,flashcards,quiz}.js
      reference/{quickref,troubleshoot,compare,relationships}.js
      practice/{index,kql,azpolicy,scp,config,controltower,defender,runbook,terraform,scenarios}.js
```

## Deploy to GitHub Pages

Already wired via `.github/workflows/pages.yml` at the repo root. To enable:

1. Push this repo to GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Push to `main` (or run the workflow via `workflow_dispatch`).
4. The workflow uploads `app/` as the Pages artifact and serves it from `https://<user>.github.io/<repo>/`.

The hash router uses **only relative paths**, so deep-links like `/#/practice/kql` resolve correctly both locally (`http://localhost:8765/app/`) and on GitHub Pages.

## Conventions

- **Pages** export `meta`, `render()`, and `mount(rootEl)`. Optional `unmount()`.
- **Data** lives in `src/data/*.js`. Editing a flashcard touches ~50 lines, not 5,500.
- **Routing** is hash-only (`#/study/flashcards`). No server config required.
- **Storage** uses the `storage` helper from `core/storage.js` — never `localStorage` directly.
- **No frameworks, no bundler, no transpiler.** Plain ES modules + plain CSS.
