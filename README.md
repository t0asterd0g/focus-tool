<<<<<<< HEAD
# Mastery App

**One task per project. Every day.**

A personal hobby and skill tracker that keeps you focused by showing one active task per project at a time. When you finish a task, the next one in the queue loads automatically. Ideas get captured in a separate backlog so they never derail your current focus.

## Features

- **Multi-project dashboard** — manage multiple hobbies/skills in parallel
- **One active task per project** — always know exactly what to work on next
- **Task queue** — ordered steps that auto-advance when you complete the current task
- **Reflection on completion** — optional note when marking a task done
- **Ideas backlog** — capture thoughts without touching your current task queue; promote to tasks when ready
- **Progress tracking** — visual progress bar per project
- **Scope definition** — each project has a goal + scope to keep you from expanding endlessly
- **Local storage** — no backend needed, data lives in your browser

## Deploy to Vercel

### One-click (recommended)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Framework will be auto-detected as Next.js
4. Click Deploy — done

### Manual CLI

```bash
npm install -g vercel
cd mastery-app
npm install
vercel
```

## Local development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Data

All data is stored in `localStorage` under the key `mastery-app-v1`. To back up your data, open DevTools → Application → Local Storage → copy the value. To migrate to a new device, paste it back in.

## Upgrading to a database later

The entire data layer is in `src/lib/store.ts`. Every function reads/writes through `loadData()` and `saveData()`. To switch to Supabase or another backend, replace just those two functions.
=======
focus-tool
A minimal app used to help you focus on key tasks or projects.
>>>>>>> 873cc91aab052232b80bdb3a2370f31afada5680
