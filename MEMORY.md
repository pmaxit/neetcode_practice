# NeetPractice App — Architecture & Context

> Reference document for agents working on this codebase.

---

## What This App Is

A personal coding interview practice dashboard built around the **NeetCode 250** problem set. The goal is daily structured practice with spaced repetition, not just a problem list. Problems are divided into 19 days (8 new + 2 revision problems per day). The user can track completion, write notes, and view reference solutions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite), plain CSS (no Tailwind in use despite being installed) |
| Backend | Node.js + Express 5 |
| ORM | Sequelize 6 |
| Database | MySQL 8 (Cloud SQL on GCP) |
| Hosting | Google Cloud Run (containerised) |
| Build/Deploy | Docker (multi-stage), Cloud Build, `deploy.sh` |
| Icons | lucide-react |
| Syntax highlight | react-syntax-highlighter (Prism, atomDark theme) |

---

## Repository Layout

```
practice-app/
├── src/
│   ├── App.jsx              # Single-page React app (all UI logic lives here)
│   ├── main.jsx
│   ├── data/
│   │   └── problems.json    # Seed data — 150 NeetCode problems (fallback if DB empty)
│   └── styles/
│       └── Dashboard.css    # All styles — dark theme, CSS variables, no CSS modules
├── server.js                # Express API + Sequelize models + seeding logic
├── seeder.js                # Standalone seeder (alternative to auto-seed in server.js)
├── Dockerfile               # Multi-stage: node:20-alpine build → production image
├── deploy.sh                # Full deploy: Cloud Build → Cloud Run (project: adveralabs)
├── vite.config.js           # Vite dev server on :3000, proxies /api → :3001
├── neetcode-250-guide/
│   ├── neetcode_250_complete.json   # Master 250-problem dataset
│   └── generate_study_plan.py       # Generates a 125-day markdown study plan
└── MEMORY.md                # This file
```

---

## Database Schema

**Cloud SQL instance:** `adveralabs:us-central1:adveralabs-mysql`
**Database name:** `neetcode_db`
**User:** `neetcode_user` / `neetcode_pass`
**Public IP (local dev):** `35.224.79.154`

### Table: `problems`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | 1–250, sequential |
| title | STRING | Problem name |
| category | STRING | Topic category (see list below) |
| difficulty | STRING | `Easy` / `Medium` / `Hard` |
| statement | TEXT | HTML problem description (fetched from LeetCode via enrichment) |
| examples | JSON | Sample I/O pairs |
| python_code | TEXT | Reference solution in Python |
| mnemonic | TEXT | Pattern hint for remembering the approach |
| neetcode_url | STRING | Link to NeetCode.io |
| leetcode_url | STRING | Link to LeetCode |

No `timestamps` on this table.

### Table: `user_progress`

| Column | Type | Notes |
|---|---|---|
| problem_id | INTEGER PK | FK → problems.id |
| status | STRING | `not-started` / `in-progress` / `completed` |
| user_code | TEXT | User's own solution draft |
| user_notes | TEXT | Free-form practice notes |
| createdAt | DATETIME | Sequelize auto |
| updatedAt | DATETIME | Sequelize auto |

### Day Assignment Formula

The `day` field is **not stored** in the DB — it is computed at query time:

```js
day: ((p.id - 1) % 19) + 1
```

This maps 250 problems across 19 days (roughly 13–14 problems per day, cycling). Days 1–19 are the only valid days; `totalDays` in the frontend (`Math.ceil(250/8) = 32`) is an old calculation and should not be relied on for day count — use `maxDay` from `problems.reduce(...)` instead.

---

## Problem Categories (NeetCode 250)

- Arrays & Hashing
- Two Pointers
- Sliding Window
- Stack
- Binary Search
- Linked List
- Trees
- Heap / Priority Queue
- Backtracking
- Tries
- Graphs
- Advanced Graphs
- 1-D Dynamic Programming
- 2-D Dynamic Programming
- Greedy
- Intervals
- Math & Geometry
- Bit Manipulation

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/problems` | All problems merged with user progress. Returns `day`, `user_status`, `user_code`, `user_notes` fields added at runtime. |
| GET | `/api/progress` | Map of `{ [problem_id]: { status, completed } }` |
| POST | `/api/progress` | Upsert progress. Body: `{ problemId, status, code, notes }` |
| POST | `/api/admin/enrich` | Admin-only: fetches problem statements + Python solutions from GitHub and updates DB |

---

## Frontend App Structure (`App.jsx`)

### Views (controlled by `activeView` state)
- `dashboard` — Day-based problem list in sidebar, problem detail in main content
- `calendar` — 19-day grid with completion status colours
- `browse` — Full problem list with category + difficulty filter dropdowns

### Key State
| State | Purpose |
|---|---|
| `problems` | All 250 problems from API (includes user progress merged in) |
| `selectedDay` | Currently selected day (1–19) |
| `activeProblemId` | ID of the problem shown in the main panel |
| `activeView` | Which view is active (`dashboard` / `calendar` / `browse`) |
| `localNotes` | Local textarea state — debounced 800ms before saving to backend |
| `sidebarOpen` | Mobile sidebar open/close toggle |
| `filterCategory` / `filterDifficulty` | Browse mode filters |

### Day Picker
A horizontal scrollable strip of 19 numbered tiles at the top of the dashboard view. Tiles are colour-coded: green = completed, amber = in-progress, dim = not started, bright green = selected. Includes prev/next arrow navigation. Auto-scrolls to the selected tile on day change.

### Notes Saving
Notes use a **debounced save** (800ms after the user stops typing) via `handleNotesChange`. The `localNotes` state drives the textarea UI; `activeProblem.user_notes` is the server-persisted value synced on problem switch.

---

## Practice Style / UX Philosophy

1. **Day-first, not problem-first.** The primary navigation is day-based. Each day has ~13 new problems + 2 revision problems pulled deterministically from previous days.

2. **Spaced repetition built in.** Revision problems are selected using a formula (`source[(day * 7) % source.length]`) that picks different problems each day, weighted toward Medium/Hard.

3. **Solution hidden by default.** The reference Python solution is blurred until the user explicitly clicks "Show Solution" — encouraging attempt-first practice.

4. **Mnemonic-first learning.** Every problem has a pattern mnemonic shown prominently (e.g. "Use HashSet for uniqueness O(1) lookup") to reinforce pattern recognition rather than memorising solutions.

5. **Minimal friction tracking.** One-click "Mark as Done" toggle. Notes auto-save. No login, no accounts — single-user app.

---

## Deployment

```bash
# Full deploy (builds image via Cloud Build, deploys to Cloud Run)
bash deploy.sh
```

- **GCP Project:** `adveralabs`
- **Cloud Run service:** `neetcode-practice` in `us-central1`
- **Live URL:** `https://neetcode-practice-1078980357394.us-central1.run.app`
- **Container:** Exposes port 8080 (`ENV PORT=8080` in Dockerfile)
- **Cloud SQL connection:** via Unix socket using `INSTANCE_CONNECTION_NAME=adveralabs:us-central1:adveralabs-mysql` env var (set on the Cloud Run service)
- **Local dev:** `vite` (port 3000) + `node server.js` (port 3001), Vite proxies `/api` to 3001

### Cloud Run Env Vars (already set on service)
```
INSTANCE_CONNECTION_NAME=adveralabs:us-central1:adveralabs-mysql
DB_USER=neetcode_user
DB_PASS=neetcode_pass
DB_NAME=neetcode_db
```

---

## Known Issues / Watch-outs

- `totalDays` in the frontend (`Math.ceil(problems.length / 8)`) computes 32, but only days 1–19 have problems. Use `maxDay` (derived from `problems.reduce`) for anything day-count-related.
- The `seeder.js` / auto-seed in `server.js` uses `src/data/problems.json` (150 problems). The production DB has 250 problems seeded separately from `neetcode-250-guide/neetcode_250_complete.json`.
- `deploy.sh` always errors on `gcloud services enable` (permissions issue) but continues successfully — Cloud Build and Cloud Run deploy work fine regardless.
