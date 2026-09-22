# FeeLure

**See the catch before you click.**

FeeLure is a community reporting portal for **suspected dark patterns, hidden fees, and deceptive subscription designs** on e-commerce and subscription sites. Report what you experienced, browse the community index, and vote the clearest evidence to the top.

> **What FeeLure is NOT:** reports describe individual experiences and suspected *design patterns* — never legal claims against any company. FeeLure does not visit, crawl, or verify live websites. AI screenshot analysis is a clearly-labelled, human-reviewed aid, not a verdict.

## Features (Stage 1)

- **Home** — explains the problem, with **Report a Pattern** and **Explore Reports** actions.
- **Submit Report** — website URL (required), optional screenshot (PNG/JPG/WebP ≤ 5 MB), title, description, and suspected dark-pattern category. URL-only reports are fully supported and clearly labelled as description-based.
- **Community Index** — report cards with screenshot thumbnail, domain, category, description, date, and vote count; search, category filter, and **Newest / Most votes** sorting.
- **Report Detail** — full submitted evidence plus a community upvote button.
- **Categories** — Hidden Fees · Pre-checked Add-ons · Hidden Subscription · Difficult Cancellation · Misleading Wording · Other.
- Real form validation, loading states, success messages, and error handling on every flow.
- **Persistent storage (Stage 2):** SQLite via Node's built-in `node:sqlite` — zero extra dependencies. Reports and vote metadata live in `data/feelure.db` and survive dev-server restarts, so every visitor of the deployed app sees the same index. (A file-backed SQLite DB persists on VM-style hosts such as Fly.io/Railway/VPS; a serverless deployment would swap in a hosted database — `lib/reports.ts` keeps a single interface for that.)
- **AI screenshot analysis (Stage 3):** an optional "Analyze screenshot with Gemini" step on the Submit form makes a server-side call to Google's Gemini API (`GEMINI_API_KEY`, kept out of the repo). Findings are clearly-labelled *potential concerns* read only from the uploaded screenshot, shown in an editable review panel — the user corrects, applies, or discards them before publishing. Missing key or AI failure never blocks manual reporting.
- **Demo showcase (Stage 3):** the Home page includes "See FeeLure in Action" — a hand-authored, clearly-labelled fictional checkout example (₹999 → ₹1,247). It is not AI-generated, not a real website, and never enters the community database.
- Durable, deduplicated per-visitor voting is planned for a later stage.

## Tech stack

| Layer    | Choice                                             |
| -------- | -------------------------------------------------- |
| Frontend | Next.js 15 (App Router) + React 19 + Tailwind CSS 4 |
| Backend  | Next.js Route Handlers (Node runtime)               |
| Data     | SQLite via `node:sqlite` (Node built-in) — file at `data/feelure.db` |
| AI       | Google Gemini API, key kept server-side (Stage 4)   |

## Deploying (persistent volume required)

FeeLure stores its SQLite database and uploaded screenshots in one directory (`FEELURE_DATA_DIR`, default `./data`). The host **must provide a persistent writable volume** — a serverless/ephemeral filesystem will silently lose reports.

Railway:
1. Push this repo to GitHub.
2. railway.com → New Project → Deploy from GitHub repo → pick `FeeLure`.
3. Add a **Volume** mounted at `/data`.
4. Variables: `FEELURE_DATA_DIR=/data`, `GEMINI_API_KEY=<your key>`, `NODE_VERSION=22`.
5. Deploy; `railway.json` handles build/start and the `/` healthcheck.

## Status & known limitations

All features below were verified **locally** (dev server + production build on Windows, Node 24): report create/read/list, screenshot upload & serving, voting, SQLite persistence across server restarts, Gemini screenshot analysis with a real API key, and the labelled demo showcase. At submission time the app has **not yet been verified on a public deployment** — until that's done, treat public-URL behaviour (volume persistence across redeploys, Gemini under cloud egress, production `next start`) as untested. Other limitations: no authentication or admin moderation (by design, v1); vote deduplication is a per-IP cooldown, not per-account; AI findings are advisory only and human-reviewed before publishing; FeeLure never inspects live websites.

## Getting started

Prerequisites: **Node.js 18.18+** (Node 20+ recommended) and npm.

```bash
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

Other scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # TypeScript, no emit
```

## Project structure

```
FeeLure/
├── app/
│   ├── page.tsx                  # Home
│   ├── submit/page.tsx           # Submit Report
│   ├── reports/page.tsx          # Community Index
│   ├── reports/[id]/page.tsx     # Report Detail
│   ├── globals.css               # Tailwind theme (navy / white / amber)
│   └── api/reports/…             # REST API (list, create, fetch, vote, image)
├── components/                   # Header, Footer, ReportCard, forms, VoteButton…
├── lib/
│   ├── format.ts                 # Categories, validation, formatting helpers
│   ├── reports.ts                # Data access on SQLite (single interface)
│   └── db.ts                     # node:sqlite connection + schema
├── data/                         # feelure.db + uploaded screenshots (git-ignored)
├── public/uploads/               # Uploaded screenshots (git-ignored)
└── .env.example                  # GEMINI_API_KEY placeholder (used in Stage 4)
```

## Security notes

- The Gemini API key lives **only** in `.env.local` (git-ignored) as `GEMINI_API_KEY=...` and is read **only** by server-side code — it never reaches the browser or this repository.
- Uploaded screenshots are stored outside git and served through a controlled route.
- Every API input is validated server-side, not just in the browser.

## Roadmap

1. **Stage 1 — done:** all four pages, report creation, voting UI, navy/amber design system.
2. **Stage 2 — done:** persistent SQLite storage so reports survive restarts and are shared across users.
3. **Stage 3 — done:** real Gemini screenshot analysis with editable review flow + labelled demo showcase.
4. **Stage 4/5:** end-to-end testing, GitHub repository, deployment.
