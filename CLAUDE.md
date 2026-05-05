# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev server

Never start, restart, or kill the dev server. The user manages it. After making code changes, simply confirm what was changed — the server hot-reloads automatically.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Run production build locally
npx tsc --noEmit # Type-check without emitting (use before finishing any change)
```

No test runner is configured.

## Architecture

**Single-page app inside Next.js.** Despite being a Next.js project, there is only one route (`src/app/page.tsx`). All navigation is client-side state — no Next.js routing is used. The three top-level views are:

1. **Dashboard** (`activeProject === null`) — project grid + today's focus strip
2. **Project detail** (`activeProject !== null`) — renders `ProjectView`, which itself manages a sub-view:
3. **Task detail** (`taskView !== null` inside `ProjectView`) — renders `TaskView`

Navigation goes: Dashboard → ProjectView → TaskView. Each level has its own back handler that nulls out the relevant state and re-reads localStorage.

**Data layer is entirely in `src/lib/store.ts`.** No backend. All reads/writes go through `loadData()` / `saveData()` which serialize to `localStorage` under key `mastery-app-v1`. To add a backend later, replace only those two functions.

**State refresh pattern.** Components call store functions directly (e.g. `completeTask(id)`), then call an `onUpdate()` / `bump()` callback which re-invokes `loadData()` and sets React state. There is no global state manager.

**Stale closure caution.** The `refresh()` function in `page.tsx` captures `activeProject` from its render scope. Do not call `refresh()` in the same handler as `setActiveProject(null)` — the closure will still see the old value and re-set it. Use `goBack()` instead, which nulls the state and reloads projects independently.

## Data model

```ts
Task {
  id, projectId, title, notes, status: 'queued'|'active'|'done',
  type: 'task'|'idea', order, createdAt,
  completedAt?, reflection?, links?: string[]
}

Project { id, title, goal, scope, createdAt, archivedAt? }
```

**Task flow:** Adding a task with no existing active task auto-sets it to `active`. Completing the active task auto-promotes the next `queued` task. Ideas (`type: 'idea'`) are excluded from this flow until promoted via `promoteIdea()`.

## UI primitives (`src/components/ui.tsx`)

Use these instead of raw HTML: `Button` (variants: `primary`, `secondary`, `ghost`, `danger`; sizes: `sm`, `md`), `Input`, `Textarea`, `Badge` (colors: `green`, `amber`, `gray`, `red`), `Card`, `Divider`, `Empty`. `Card` does not accept an `onClick` prop — wrap in a `div` if you need a clickable card.

## Styling

Tailwind + CSS custom properties. All colors, radii, and fonts are CSS variables defined in `src/app/globals.css`. Always use `var(--token-name)` rather than hardcoded values. Key tokens:

- Backgrounds: `--bg`, `--bg-card`, `--bg-subtle`, `--bg-active`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`
- Accent (green): `--accent`, `--accent-light`, `--accent-text`
- Borders: `--border`, `--border-strong`
- Amber: `--amber`, `--amber-light`
- Danger: `--danger`, `--danger-light`
- Radii: `--radius` (10px), `--radius-sm` (6px), `--radius-lg` (16px)

Animation classes: `animate-fade-up`, `animate-fade-up-delay`, `animate-fade-up-delay-2`, `animate-slide-in`.
