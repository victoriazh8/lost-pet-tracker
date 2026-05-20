# Lost Pet Tracker

A full-stack app that consolidates lost and found pet posts from across the web and uses AI/ML to match them — helping reunite pets with their owners faster.

**Live:** [lost-pet-tracker.vercel.app](https://lost-pet-tracker.vercel.app) · API: [lost-pet-tracker-api.fly.dev](https://lost-pet-tracker-api.fly.dev/api/stats)

---

## The Problem

When a pet goes missing, owners post on a dozen different platforms — Nextdoor, Reddit, Craigslist, Facebook, Citizen. Someone who finds a stray checks a different platform. The information is siloed. Lost Pet Tracker bridges that gap by pulling posts into one place and automatically scoring potential matches.

---

## How It Works

**1. Consolidate**
Posts are synced from Reddit (`r/lostpets`) and Craigslist (Lost & Found section). A Chrome extension lets users bulk-import posts from any site they're already browsing (Facebook, Nextdoor, etc.) — without needing API access. Users can also paste text from any platform and Claude extracts structured fields.

**2. Tag**
When a photo is uploaded, a CLIP ViT-B-32 model runs zero-shot classification to auto-populate breed, color, size, and coat pattern — so scraped posts with photos but no text metadata become searchable.

**3. Match**
A multi-factor algorithm scores potential matches by breed, color, location, description keywords, date proximity, and CLIP image embedding similarity.

**4. Show your work**
Every match includes a confidence score and a plain-English explanation of why it matched (e.g. "Same breed (Golden Retriever) · Images look visually similar · Reported within the same week").

---

## Matching Algorithm

Text scoring (0–100 points):

| Factor | Points | Method |
|--------|--------|--------|
| Breed | 25 | Exact (25) or substring overlap (12) |
| Color | 25 | Exact (25) or word-level overlap (12) |
| Location | 20 | Exact (20) or partial (10), skips "Unknown" |
| Description | 20 | Keyword overlap with stop-word filtering |
| Date proximity | 10 | Within 7 days (10) or 30 days (5) |

Image scoring (when both pets have photos):

```
blendedScore = Math.max(textScore, imageScore × 0.7 + textScore × 0.3)
```

CLIP cosine similarity is the primary signal (70%) with text as confirmation (30%). `Math.max` ensures a strong text-only match is never penalized when image quality is low.

---

## Architecture

```
┌─────────────────────────────────────────┐
│         React 19 + Vite (Vercel)        │
│              Tailwind CSS               │
│                                         │
│  Home · Lost · Found · Report · Detail  │
└──────────────────┬──────────────────────┘
                   │ REST
┌──────────────────▼──────────────────────┐
│         Express 5 API (Fly.io)          │
│                                         │
│  POST /api/report      — file upload    │
│  GET  /api/pets        — listings       │
│  GET  /api/pets/:id/matches             │
│  POST /api/parse-post  — Claude NLP     │
│  POST /api/sync/reddit                  │
│  POST /api/sync/craigslist              │
│  POST /api/batch-report — extension     │
│  GET  /api/stats                        │
│                                         │
│  Rate limiting · CORS · Multer          │
└──────┬──────────────────┬───────────────┘
       │                  │
┌──────▼──────┐  ┌────────▼──────────────┐
│  SQLite DB  │  │   External Services   │
│ better-     │  │                       │
│  sqlite3    │  │  Reddit JSON API      │
│             │  │  Craigslist HTML      │
│  pets       │  │  Claude Haiku (NLP)   │
│  embeddings │  │  CLIP ViT-B-32        │
└─────────────┘  └───────────────────────┘
         ▲
┌────────┴────────────────────────────────┐
│       Chrome Extension (MV3)            │
│                                         │
│  Scans feed pages for pet posts         │
│  Bulk-imports via /api/batch-report     │
│  Works on Reddit, Nextdoor, Facebook    │
│  (uses user's authenticated session)    │
└─────────────────────────────────────────┘
```

**Database:** SQLite with `better-sqlite3` on a Fly.io persistent volume. Synchronous API simplifies the async story; migration-safe `ALTER TABLE` loop handles schema evolution. Production path: Postgres with connection pooling.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, React Router |
| Backend | Express 5, Node.js |
| Database | SQLite (`better-sqlite3`) |
| ML | CLIP ViT-B-32 (`open-clip-torch`), PyTorch |
| AI | Anthropic Claude Haiku (structured extraction) |
| Infrastructure | Docker, Fly.io (backend), Vercel (frontend) |
| CI/CD | GitHub Actions |
| Extension | Chrome MV3 |

---

## Local Setup

### Prerequisites
- Node.js 20+
- Python 3.9+ with `pip` (for CLIP embeddings)

### Install

```bash
# Frontend
npm install

# Backend
cd backend && npm install

# Python ML dependencies (optional — app works without them, embeddings are skipped)
cd backend
python3 -m venv .venv
.venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv/bin/pip install open-clip-torch Pillow numpy
.venv/bin/python ml/fetch_breeds.py   # populates breeds.json for zero-shot tagging
```

### Environment

```bash
# Root (.env) — frontend
cp .env.example .env

# Backend (.env)
cp backend/.env.example backend/.env
# Fill in ANTHROPIC_API_KEY if you want AI-powered extraction
# USE_AI=false works without a key (rule-based extraction only)
```

### Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
npm run dev
```

Frontend: `http://localhost:5173` · Backend: `http://localhost:3001`

### Tests

```bash
cd backend && npm test
# 44 tests across matching, extractors, and similarity modules
```

---

## Project Structure

```
├── src/                     # React frontend
│   ├── pages/               # Home, LostPets, FoundPets, ReportPet, PetDetails
│   └── components/          # Navbar, PetCard, PetHero, PetList, FilterBar
├── backend/
│   ├── server.js            # Express API + route handlers
│   ├── db.js                # SQLite schema + safe migration loop
│   ├── ml/
│   │   ├── embed_image.py   # CLIP embedding + zero-shot tagging
│   │   └── fetch_breeds.py  # Fetches breed lists from public APIs at build time
│   ├── services/
│   │   ├── reddit.js        # Reddit JSON API + field extraction
│   │   └── craigslist.js    # Craigslist HTML scraper
│   ├── utils/
│   │   ├── matching.js      # Multi-factor scoring algorithm
│   │   ├── similarity.js    # Cosine similarity for embeddings
│   │   ├── embeddings.js    # Spawns Python subprocess for CLIP
│   │   └── extractors.js    # Rule-based breed/color/location/date extraction
│   └── tests/               # Node built-in test runner (no Jest dependency)
└── extension/               # Chrome MV3 extension
    ├── manifest.json
    ├── popup.js             # UI + single/bulk report logic
    └── content.js           # Feed scanner + image extraction
```
