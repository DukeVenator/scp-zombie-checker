# SCP Zombie Checker

[![CI](https://github.com/DukeVenator/scp-zombie-checker/actions/workflows/deploy.yml/badge.svg)](https://github.com/DukeVenator/scp-zombie-checker/actions/workflows/deploy.yml)

Offline-first PWA for **Zeta Task Force** roleplay: field intake, zombie classification, and subject checks. Built for SCP-style ops with local-only data, QR handoff, and printable badges.

---

## Purpose

**SCP Zombie Checker** is a roleplay tool for Zeta Task Force–style scenarios. Operators run through a guided checklist (vitals, symptoms, EMF, etc.), get SCP-flavoured classifications and warnings, and can export patient records or share a scan-friendly badge link. All data stays on the device unless you export or share a badge; no backend required.

---

## Features

- **New patient wizard** — Step-by-step intake: identity, photo (camera or upload), biometric checklist (pupils, temperature, heartbeat, EMF), symptoms, notes. Infection probability and threat level update as you go.
- **Symptom update wizard** — Re-assess existing subjects with the same flow; changes are recorded in history with field-level diffs.
- **Status and variant wizards** — Set containment status (Normal, Contained, Threat, Known Threat, Escaped) and zombie variant (Walker, Runner, Alpha, Gate Breaker) with clear procedures.
- **SCP rules engine** — Warnings and directives from checklist results (e.g. no heartbeat, abnormal temp, high EMF, symptom clusters). TERMINATE ON SIGHT and potential-zombie tags when thresholds are met.
- **Patient detail page** — Sticky assessment header (overlay dropdown), biometrics, symptoms with “alarming behaviour” notes, infection meter, status/variant banners, full history, and SCP-style print view.
- **Export badge** — Generate a shareable link and printable QR card; anyone scanning opens a standalone badge view (no agent wizard). Operators with the subject in their app see “Update this record.” Badge copy includes light humour for roleplay.
- **Dashboard** — Search (with debounced suggestions), metrics, classification and variant breakdowns, recent history, and patient cards with threat/risk/infection and containment tags.
- **Transfers** — Full JSON export/import and compact QR transfer (no photos in QR). Conflict handling: update existing or import under a new name.
- **PWA** — Installable, offline-capable; update prompt when a new version is available on GitHub Pages.
- **Error boundaries** — Section-level error boundaries so a failure in one area doesn’t take down the whole app.

---

## Tech stack

| Area        | Tech |
|------------|------|
| Build      | Vite 7 |
| UI         | React 19, TypeScript, HashRouter |
| Storage    | Dexie (IndexedDB) |
| Forms      | react-hook-form, Zod |
| PWA        | vite-plugin-pwa (Workbox) |
| Tests      | Vitest, Testing Library, Playwright |
| Lint       | ESLint, typescript-eslint |

---

## Development

**Prerequisites:** Node.js 22+ (or current LTS), npm.

```bash
# Install dependencies
npm install

# Start dev server (default: http://localhost:5173)
npm run dev
```

The app uses `HashRouter`, so it works on GitHub Pages without server config. Base path in production is `/scp-zombie-checker/`.

---

## Scripts

| Command        | Description |
|----------------|-------------|
| `npm run dev`  | Start Vite dev server with HMR |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once with coverage |
| `npm run test:e2e` | Run Playwright E2E tests |

---

## Testing

**Unit and integration (Vitest):**

```bash
npm run test:run
```

**E2E (Playwright):**

First time, install browser binaries:

```bash
npx playwright install --with-deps
```

Then:

```bash
npm run test:e2e
```

CI runs lint, `test:run`, Playwright, and build on push/PR to `main`. Deploy to GitHub Pages only on push to `main`.

---

## Deployment

The repo is set up for **GitHub Pages**:

1. Enable Pages for the repo (Settings > Pages > Source: GitHub Actions).
2. Push to `main` (or merge a PR). The workflow in `.github/workflows/deploy.yml` runs lint, unit tests, E2E, build, and deploys `dist/` to Pages.
3. Live URL: `https://<username>.github.io/scp-zombie-checker/`.

---

## How to contribute

1. **Fork** the repo and clone it.
2. **Branch** from `main` (e.g. `feature/thing` or `fix/issue-123`).
3. **Implement** your change; keep the existing style (TypeScript, existing patterns, no emojis in UI copy).
4. **Test:** run `npm run lint`, `npm run test:run`, and `npm run test:e2e` locally.
5. **Commit** with a clear message and **open a PR** against `main`.
6. CI must pass (lint + unit + E2E + build). Maintainers will review.

If you add features, add or update tests where relevant. For UI changes, consider both desktop and mobile (Playwright runs Chromium and a Pixel 7–style viewport).

---

## Plans

- **Cloud sync (optional)** — Design is local-first; future optional sync could back patient records to a chosen backend for Zeta “HQ” use.
- **More badge/print templates** — Additional SCP-style document layouts for different ops.
- **Accessibility** — Improve keyboard nav and screen reader support for wizards and dashboard.
- **i18n** — Optional locale support for roleplay in other languages.

---

## Operational notes

- **Data:** All patient data and photos stay in the browser (IndexedDB). Clearing site data removes them unless you’ve exported or use the badge link to re-open from another device.
- **QR transfer:** Intentionally excludes photos to keep payload size small and scannable.
- **Badge link:** Encodes a minimal payload (id, name, status, infection %, etc.) in the URL; no server lookup. Re-scanning the same badge lets operators open the subject in their app and update.

---

## License

See [LICENSE](LICENSE) in the repository (if present). This project is for roleplay and fan use.
