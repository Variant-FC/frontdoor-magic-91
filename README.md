# Money Malume

> An AI-assisted financial assistant for South African micro-businesses. Paste or upload your receipts, and Malume extracts them, calculates 15% VAT correctly in code, flags anomalies, explains what it found in plain language, and turns the month into a clean ledger, insights and invoices.

---

## Table of Contents

- [Introduction](#introduction)
- [Objectives](#objectives)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [How the System Works](#how-the-system-works)
- [Feature Domains](#feature-domains)
- [Database Design](#database-design)
- [API Documentation](#api-documentation)
- [Design System](#design-system)
- [Security Model](#security-model)
- [Testing](#testing)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)
- [Known Limitations](#known-limitations)
- [Contributors](#contributors)
- [License](#license)

---

# Introduction

Most South African micro-businesses — spaza shops, plumbers, hair salons, freelance designers — keep their books in a shoebox of till slips and a WhatsApp thread. At the end of the month, nobody knows what was actually spent, how much VAT is reclaimable, or whether the same invoice was paid twice. Accounting software assumes you already understand accounting; it asks for a chart of accounts before it gives you a single answer.

**Money Malume** flips that around. You give it raw text or a receipt file. It gives you back a structured, categorised, VAT-correct ledger, plus a short plain-language explanation from "Malume" — the knowledgeable uncle who tells you what the numbers actually mean.

The critical design decision: **the AI never does arithmetic.** Language models are used for reading messy text (what merchant is this? what date?), and nothing else. Every rand of VAT, every subtotal, every profit figure is computed in deterministic `Decimal` code on the server. That is the difference between a demo and something a business can file with.

---

# Objectives

- **Remove the data-entry barrier.** Turn unstructured receipt text into structured transactions with zero manual typing.
- **Get the money maths right, always.** 15% VAT computed in `Decimal`, server-side, never by a language model, never in floating point.
- **Never leave an expense uncategorised.** Every transaction gets a category from a rule pass, an AI pass, or the user — falling back to `other`, never blank.
- **Surface what a human would miss.** Duplicates, VAT mismatches, line-item totals that don't add up, unusual amounts, silent recurring subscriptions.
- **Explain, don't just display.** Every insight is written in plain language and linked to the exact transactions that prove it.
- **Keep a human in the loop.** Nothing is final until a person approves it, and every edit is recorded with a before/after audit trail.
- **Separate concerns cleanly.** A standalone React frontend that holds no secrets, talking to a self-hosted Django API that owns all business logic and data.

---

# Features

## Core Features

- **Batch ingestion** — paste a block of receipt text or upload a PDF/text file; one upload can produce many transactions.
- **Automatic extraction** — merchant, date, description, line items, total, stated VAT, payment method, and missing-field detection.
- **Automatic categorisation** — nine expense categories via a keyword rule pass, with an optional AI pass to fill gaps. Always correctable by the user, and the source (`rule` / `ai` / `user`) is recorded.
- **VAT engine** — 15% inclusive, exclusive, or unknown. `unknown` never guesses; it reports no VAT figure rather than a wrong one.
- **Running ledger** — every transaction for the period in one table, with flagged rows highlighted in red.
- **Anomaly detection** — seven detectors run on ingest and re-run on every edit.
- **Insights with evidence** — findings such as "your top spend category is X" or "you have R Y in reclaimable VAT", each linking straight to the supporting rows.
- **Malume's voice** — a persona layer that restates each finding in plain, warm, non-jargon language.
- **Human review queue** — approve or reject each extracted transaction; resolve or dismiss individual anomaly flags.
- **Append-only revisions** — every field edit writes a `Revision` row with `before` and `after`.
- **Invoicing** — line-item invoices with server-assigned numbers (`INV-2026-0001`), server-computed totals, and a printable letterhead. A `paid` invoice becomes income for the period.
- **Monthly periods** — the ledger rolls over each calendar month; each period carries total expenses, income, profit, VAT and transaction count, and can be closed.
- **Markdown export** — a monthly summary containing totals, insights and flagged anomalies.

## Optional Features

- **AI gap-filling extraction** — enabled by setting `LOVABLE_AI_API_KEY`; fills only the fields the regex pass missed.
- **Profile personalisation** — owner name, business name and VAT-registration status drive the greeting, the invoice letterhead and the VAT view.
- **Prototype mode** — a bundled sample South African transaction batch so the app is useful before any real data exists.

---

# Technologies Used

## Frontend

- **React 19** with **TanStack Start v1** (full-stack React framework, SSR)
- **TanStack Router** — file-based routing from `src/routes/`
- **TanStack Query** — server-state caching
- **Vite 7** — build tool, targeting an edge/Cloudflare Worker runtime
- **TypeScript** (strict)
- **Tailwind CSS v4** — configured in `src/styles.css` via `@theme`, no `tailwind.config.js`
- **shadcn/ui** (new-york variant) + **Radix UI** primitives
- **lucide-react** — icon set
- **Inter** — typeface

## Backend

- **Python 3.11+** / **Django 5.1**
- **Django REST Framework 3.15** — serializers, viewsets, pagination
- **DRF TokenAuthentication** — `Authorization: Token <token>`
- **django-cors-headers** — browser origin allowlist
- **WhiteNoise** — static file serving
- **Gunicorn** — WSGI server
- **pypdf** — PDF text extraction

## Database

- **PostgreSQL** in production (via `psycopg` + `dj-database-url`)
- **SQLite** for local development (default when `DATABASE_URL` is unset)

## AI / Machine Learning

- **Lovable AI Gateway** (`google/gemini-3-flash` by default) — used *only* for reading messy text: inferring merchant, date and category when the deterministic parser can't. It is never asked to compute money.
- **Rule-based keyword categoriser** — the first and primary categorisation pass (`backend/extraction/categorise.py`).
- **Regex extraction pipeline** — deterministic first pass over raw receipt text.

## Other Tools

- ESLint, Prettier
- `bun` / `npm` for the frontend toolchain
- Django admin at `/admin/` for back-office inspection

---

# System Architecture

Two independently deployable services with one contract between them.

```text
┌───────────────────────────────────────────────────────────────┐
│  BROWSER                                                      │
│                                                               │
│  React 19 + TanStack Start (SSR)                              │
│   ├── src/routes/*          pages                             │
│   ├── src/components/malume/*  UI                             │
│   ├── src/lib/malume/*      client-side prototype logic       │
│   └── src/lib/api/*         THE ONLY code that calls Django   │
│         config.ts  → VITE_API_BASE_URL, token storage         │
│         client.ts  → fetch wrapper, auth header, 401 handling │
│         types.ts   → wire types mirroring DRF serializers     │
│         resources.ts → typed methods per domain               │
└────────────────────────────┬──────────────────────────────────┘
                             │  HTTPS  JSON
                             │  Authorization: Token <token>
                             │  {VITE_API_BASE_URL}/api/v1/...
                             ▼
┌───────────────────────────────────────────────────────────────┐
│  DJANGO API  (self-hosted: Railway / Fly / Render / VPS)      │
│                                                               │
│  config/      settings, urls, wsgi/asgi                       │
│  accounts/    User, token auth, profile         [HTTP]        │
│  uploads/     Upload intake, pasted batches     [HTTP]        │
│  extraction/  parser + categoriser + AI pass    [no HTTP]     │
│  vat/         Decimal 15% arithmetic            [no HTTP]     │
│  ledger/      Transaction, Revision, Anomaly    [HTTP]        │
│  insights/    Insight generation, breakdowns    [HTTP]        │
│  periods/     Monthly rollover and totals       [HTTP]        │
│  invoices/    Numbering, totals, status         [HTTP]        │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
                  ┌────────────────────┐      ┌──────────────────┐
                  │  PostgreSQL        │      │  AI Gateway      │
                  │  (or SQLite dev)   │      │  (optional)      │
                  └────────────────────┘      └──────────────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │  MEDIA_ROOT        │
                  │  receipts/<user>/  │
                  └────────────────────┘
```

**Communication rules**

1. The frontend holds **no business data and no secrets**. Anything in a `VITE_*` variable is public by definition.
2. No component calls `fetch` against the API directly — everything goes through `src/lib/api/`.
3. `vat/` and `extraction/` are pure service layers with **no HTTP surface**. They are imported, never routed to.
4. Every Django queryset is filtered by `request.user`. There is no cross-tenant read path.
5. A `401` from any endpoint clears the client session automatically.

---

# Project Structure

```text
money-malume/
│
├── src/                              # Frontend (React / TanStack Start)
│   ├── routes/
│   │   ├── __root.tsx                # Shell: sidebar, top bar, providers, head metadata
│   │   ├── index.tsx                 # Dashboard — greeting, profile card, period stats
│   │   ├── expenses.tsx              # Recorded expenses — paste/upload and review extraction
│   │   ├── ledger.tsx                # Running ledger, ?ids= highlights linked evidence
│   │   ├── insights.tsx              # Insights, anomalies, markdown export
│   │   ├── invoices.tsx              # Invoice builder and printable view
│   │   └── review.tsx                # Human-in-the-loop approval queue
│   │
│   ├── components/malume/
│   │   ├── TransactionCard.tsx       # Editable single-transaction card
│   │   ├── LedgerView.tsx            # Ledger table; flagged rows in red
│   │   ├── InsightsView.tsx          # Findings + evidence links
│   │   ├── AnomalyBlock.tsx          # Flag rendering and resolution
│   │   ├── ReviewView.tsx            # Approve / reject queue
│   │   ├── VatView.tsx               # VAT breakdown panel
│   │   ├── MalumeSays.tsx            # Persona callout with portrait
│   │   ├── ProfileCard.tsx           # Owner / business / VAT-registered
│   │   └── PrototypeNote.tsx         # Prototype-mode disclosure
│   │
│   ├── components/ui/                # shadcn/ui primitives
│   │
│   ├── lib/
│   │   ├── api/                      # ← the only Django boundary
│   │   │   ├── config.ts             # base URL + SSR-safe token storage
│   │   │   ├── client.ts             # fetch wrapper, ApiError, 401 handling
│   │   │   ├── types.ts              # wire types (snake_case)
│   │   │   ├── resources.ts          # api.auth, api.uploads, api.transactions, ...
│   │   │   └── index.ts
│   │   └── malume/
│   │       ├── types.ts              # Transaction, LineItem, Anomaly, Insight, Invoice
│   │       ├── parser.ts             # client-side prototype extraction
│   │       ├── vat.ts                # ZAR formatting + client VAT display maths
│   │       ├── analysis.ts           # client-side anomaly + insight generation
│   │       ├── export.ts             # monthly markdown summary
│   │       ├── samples.ts            # bundled SA sample batch
│   │       ├── features.ts           # the 14 feature-domain objects
│   │       └── store.tsx             # React context store + localStorage
│   │
│   ├── assets/                       # logo, Malume portrait
│   ├── styles.css                    # Tailwind v4 theme, OKLCH tokens, utilities
│   ├── router.tsx  start.ts  server.ts
│   └── routeTree.gen.ts              # generated — never edit
│
├── backend/                          # Django API
│   ├── config/                       # settings.py, urls.py, wsgi.py, asgi.py
│   ├── accounts/                     # User model, register/login/logout/me
│   ├── uploads/                      # Upload model, file + text intake, services.py
│   ├── extraction/                   # readers.py, services.py, categorise.py
│   ├── vat/                          # services.py — the Decimal money engine
│   ├── ledger/                       # models, anomalies.py, views, serializers
│   ├── insights/                     # models, services.py, views
│   ├── periods/                      # Period model, totals, close
│   ├── invoices/                     # Invoice model, numbering, status
│   ├── manage.py  requirements.txt  .env.example  README.md
│
├── docs/
│   └── backend-api-contract.md       # the frontend↔backend contract
│
├── public/                           # favicon, robots.txt
├── .env.example
├── package.json  vite.config.ts  tsconfig.json  components.json
└── README.md
```

---

# Installation

## Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 20+ (install via [nvm](https://github.com/nvm-sh/nvm)) |
| npm or bun | latest |
| Python | 3.11+ |
| PostgreSQL | 14+ (optional — SQLite works for dev) |

## Clone Repository

```bash
git clone <this-repository-url>
cd money-malume
```

## Install Dependencies

Frontend:

```bash
npm install
```

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Configure Environment

Frontend — create `.env` in the repo root:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Backend — create `backend/.env`:

```env
SECRET_KEY=change-me
DEBUG=1
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:8080

# Optional: AI-assisted receipt extraction
LOVABLE_AI_API_KEY=
AI_EXTRACTION_MODEL=google/gemini-3-flash
```

## Start the Project

Terminal 1 — the API:

```bash
cd backend
source .venv/bin/activate
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8000
```

Terminal 2 — the frontend:

```bash
npm run dev
```

| Surface | URL |
| --- | --- |
| Frontend | http://localhost:8080 |
| API root | http://localhost:8000/api/v1/ |
| Django admin | http://localhost:8000/admin/ |

---

# Configuration

## Frontend

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | — | Base URL of the Django service, no trailing slash. When unset, `isBackendConfigured` is false and the app runs on the in-memory prototype store. |

Only `VITE_*` variables reach the browser, and they are public. Never put a key here.

## Backend

| Variable | Default | Description |
| --- | --- | --- |
| `SECRET_KEY` | insecure dev key | Django signing key. Must be set in production. |
| `DEBUG` | `1` | Set `0` in production. |
| `ALLOWED_HOSTS` | `*` | Comma-separated hostnames. |
| `DATABASE_URL` | local SQLite | Any `dj-database-url` URL; use Postgres in production. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:8080` | Comma-separated frontend origins. Also used for `CSRF_TRUSTED_ORIGINS`. |
| `LOVABLE_AI_API_KEY` | empty | Enables the AI gap-filling pass. Extraction still works without it. |
| `AI_EXTRACTION_MODEL` | `google/gemini-3-flash` | Model used for the gap-filling pass. |

## Domain constants

| Setting | Value | Where |
| --- | --- | --- |
| VAT rate | `0.15` | `backend/vat/services.py` |
| Rounding | `ROUND_HALF_UP` to 2dp | `backend/vat/services.py` |
| Money field | `Decimal(12, 2)`, serialized as string | all models |
| Locale / timezone | `en-za` / `Africa/Johannesburg` | `config/settings.py` |
| Page size | 50 | DRF pagination |

---

# Usage

1. **Set up your profile.** On the dashboard, enter your name, business name and whether you're VAT-registered. This drives the greeting, the VAT view and your invoice letterhead.
2. **Add expenses.** Go to **Recorded expenses**, paste a block of receipt text (or load the sample batch), and submit. Multiple receipts in one paste are split into separate transactions.
3. **Check the extraction.** Each transaction appears as an editable card: merchant, date, line items, total, VAT status, category. Fix anything that's wrong — your edit is recorded as a revision and marks the category source as `user`.
4. **Read the flags.** Anything suspicious is highlighted in red with a reason. Resolve a flag once you've confirmed it's fine.
5. **Open the Ledger.** The full month in one table, with running totals, VAT and profit.
6. **Read the Insights.** Malume tells you where the money went and what to do about it. Click any insight to jump to the exact rows it's based on.
7. **Work the Review queue.** Approve or reject each transaction. Nothing is final until you say so.
8. **Raise invoices.** Build line items, pick VAT treatment, and the server numbers and totals it for you. Marking one **paid** turns it into income for the period.
9. **Export the month.** From Insights, download a markdown summary with totals, insights and flags — hand it to your accountant.

---

# How the System Works

## Step 1 — Ingestion

A user pastes text (`POST /uploads/text/`) or uploads a file (`POST /uploads/`, multipart). An `Upload` row is created with `status: pending`. For files, `extraction/readers.py` pulls text out — `pypdf` for PDFs, direct decode for text. If the file type can't be read, the upload lands in `failed` with an `error_message` and the transaction never gets fabricated.

## Step 2 — Extraction

`extraction/services.py:extract()` splits the raw text into receipt blocks and runs a deterministic regex pass over each:

- **merchant** — from header lines and known merchant patterns
- **date** — multiple SA date formats, normalised to `YYYY-MM-DD`
- **total / stated VAT** — currency-aware amount matching
- **line items** — quantity × unit price rows
- **payment method** — card, cash, EFT, SnapScan
- **missing_information** — an explicit list of fields it could not find

If `LOVABLE_AI_API_KEY` is set, a second pass asks the model to fill *only* the still-missing fields (merchant, date, category). The model is never given arithmetic to do and never overwrites a value the regex pass already found.

## Step 3 — Categorisation

`extraction/categorise.py` maps merchant and description keywords onto nine categories: `office_supplies`, `transport`, `food_and_entertainment`, `utilities`, `software_and_subscriptions`, `stock_and_materials`, `professional_services`, `marketing`, `other`.

The result is stored with a `category_source` of `rule`, `ai` or `user`. **A transaction is never uncategorised** — unknown falls back to `other`, and the user can correct it, which flips the source to `user`.

## Step 4 — VAT calculation

`vat/services.py` runs in `Decimal`, quantised to two places with `ROUND_HALF_UP`:

| `vat_status` | `vat_amount` | `net_amount` | `gross` |
| --- | --- | --- | --- |
| `inclusive` | `total × 0.15 / 1.15` | `total − vat` | `total` |
| `exclusive` | `total × 0.15` | `total` | `total + vat` |
| `unknown` | `null` | `null` | `total` |

`unknown` deliberately returns nothing. A wrong VAT figure is worse than a missing one. `vat_amount` and `net_amount` are read-only on the API — supplying them from the client is ignored.

## Step 5 — Period assignment

The transaction date determines its `YYYY-MM` period. `Period.get_or_open()` lazily creates the month. Each period aggregates total expenses, total VAT, transaction count, income from paid invoices, and profit.

## Step 6 — Anomaly detection

`ledger/anomalies.py` runs on ingest and **re-runs on every edit**:

| Type | Trigger |
| --- | --- |
| `probable_duplicate` | Same merchant, same total, dates within a short window |
| `missing_required_field` | Merchant, date or total absent |
| `vat_mismatch` | Stated VAT differs from the computed 15% figure beyond a cent tolerance |
| `line_item_total_mismatch` | Σ(quantity × unit_price) ≠ stated subtotal |
| `unusual_amount` | Statistical outlier against the user's history for that category |
| `large_cash_transaction` | Cash payment above the threshold |
| `recurring_subscription` | Same merchant and amount appearing month after month |

## Step 7 — Insight generation

`insights/services.py` aggregates the period and produces findings, each carrying `insight`, `malume_take` (the plain-language version), `financial_effect`, `recommended_action`, and `supporting_transactions` — the IDs that prove it. The frontend links those IDs into `/ledger?ids=...`, which scrolls to and highlights the evidence.

## Step 8 — Human review and revisions

Every `PATCH /transactions/{id}/` writes a `Revision` row containing `field`, `before`, `after` and a timestamp, sets `edited = true`, recomputes VAT, and re-runs anomaly detection. Approve/reject endpoints set the review state. Nothing is destructive; the audit trail is append-only.

## Step 9 — Invoicing and income

An invoice is created with line items and a VAT treatment. The server assigns `INV-<year>-<0000>` and calls `recalculate()` — client-supplied money is discarded. Moving an invoice to `paid` makes its total count as income for the period, which feeds the profit figure.

---

# Feature Domains

`src/lib/malume/features.ts` exports `FEATURE_DOMAINS` — the product split into 14 self-contained objects, each with a `key`, `name`, `purpose`, `entities`, `dependsOn`, and `capabilities` (every capability tagged `done`, `partial` or `planned`). The `dependsOn` chain is effectively the build order.

| # | Domain | Owns | Status |
| --- | --- | --- | --- |
| 1 | `ingestion` | `Upload` | paste done, file upload/OCR partial |
| 2 | `extraction` | parser, categoriser | done |
| 3 | `ledger` | `Transaction` | done |
| 4 | `vat` | VAT service | done |
| 5 | `anomalies` | `Anomaly` | done |
| 6 | `insights` | `Insight` | done |
| 7 | `review` | `Revision`, approval state | done |
| 8 | `invoicing` | `Invoice` | done |
| 9 | `persistence` | localStorage / Postgres | partial |
| 10 | `accounts` | `User`, profile | partial (backend done, UI pending) |
| 11 | `persona` | Malume's voice | done |
| 12 | `reporting` | markdown export | done |
| 13 | `shell` | navigation, branding | done |
| 14 | `prototype` | sample batch, disclosure | done |

---

# Database Design

All primary keys are UUIDs. All money is `DecimalField(max_digits=12, decimal_places=2)`, serialized as strings. Every table below has a `user` foreign key and every queryset is filtered by it.

```text
User 1───∞ Upload 1───∞ Transaction ∞───1 Period
 │                          │
 │                          ├──∞ Revision
 │                          └──∞ Anomaly
 ├───∞ Invoice
 └───∞ Insight ∞───1 Period
```

## Tables

### `accounts_user`

Email-first user. Owns every other record.

| Field | Type | Description |
| --- | --- | --- |
| `id` | BigAuto | Primary key |
| `email` | Email, unique | Login identifier (`USERNAME_FIELD`) |
| `password` | Char | Hashed |
| `owner_name` | Char(120) | Person's name, used in greetings |
| `business_name` | Char(160) | Used on the invoice letterhead |
| `vat_registered` | Boolean | Drives the VAT view |
| `is_staff` / `is_superuser` | Boolean | Admin access |

### `uploads_upload`

A single intake event — one file or one pasted batch.

| Field | Type | Description |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user` | FK → User | Owner, cascade |
| `file` | File | `receipts/<user_id>/<uuid>/<filename>`, nullable for pasted text |
| `filename` | Char(255) | Original name, or `pasted-batch.txt` |
| `content_type` | Char(120) | MIME type |
| `size_bytes` | PositiveInt | File size |
| `raw_text` | Text | Extracted or pasted source text |
| `status` | Char(12) | `pending` / `processing` / `extracted` / `failed` |
| `transaction_count` | PositiveInt, null | Rows produced |
| `error_message` | Text, null | Failure reason |
| `uploaded_at` | DateTime | Auto |

### `ledger_transaction`

One expense record. Always owned, always categorised.

| Field | Type | Description |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user` | FK → User | Owner, cascade |
| `period` | FK → Period | Protected; month this belongs to |
| `upload` | FK → Upload, null | Source intake, `SET_NULL` |
| `merchant` | Char(200), null | Who was paid |
| `date` | Date, null | Transaction date |
| `description` | Text | Free text |
| `line_items` | JSON | `[{ description, quantity, unit_price }]` |
| `total` | Decimal(12,2), null | Amount as stated on the receipt |
| `stated_vat` | Decimal(12,2), null | VAT printed on the receipt |
| `vat_status` | Char(16) | `inclusive` / `exclusive` / `unknown` |
| `vat_amount` | Decimal(12,2), null | **Server-computed, read-only** |
| `net_amount` | Decimal(12,2), null | **Server-computed, read-only** |
| `category` | Char(40) | One of nine; defaults `other` |
| `category_source` | Char(8) | `rule` / `ai` / `user` |
| `payment_method` | Char(60), null | Card, cash, EFT, SnapScan |
| `missing_information` | JSON | Field names extraction could not find |
| `raw_text` | Text | The source snippet |
| `edited` | Boolean | Any user edit applied |
| `approved` / `rejected` | Boolean | Review state |
| `created_at` / `updated_at` | DateTime | Auto |

Indexes: `(user, period)`, `(user, category)`. Ordering: `-date, -created_at`.

### `ledger_revision`

Append-only audit trail. One row per field change.

| Field | Type | Description |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `transaction` | FK → Transaction | Cascade |
| `field` | Char | Field name changed |
| `before` | Text/JSON | Prior value |
| `after` | Text/JSON | New value |
| `changed_at` | DateTime | Auto |

### `ledger_anomaly`

| Field | Type | Description |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `transaction` | FK → Transaction | Cascade |
| `type` | Char(40) | One of the seven anomaly types |
| `message` | Text | Human-readable explanation |
| `resolved` | Boolean | Dismissed by the user |
| `detected_at` | DateTime | Auto |

### `periods_period`

| Field | Type | Description |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user` | FK → User | Cascade |
| `month` | Char(7) | `YYYY-MM`; unique per user |
| `opened_at` | DateTime | Auto |
| `closed_at` | DateTime, null | Set when the month is locked |

Computed via `totals()`: `total_expenses`, `total_income`, `profit`, `total_vat`, `transaction_count`.

### `invoices_invoice`

| Field | Type | Description |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user` | FK → User | Cascade |
| `invoice_number` | Char(32) | `INV-<year>-<0000>`, unique per user, server-assigned |
| `client_name` | Char(200) | Bill-to |
| `client_details` | Text | Address / contact |
| `issue_date` / `due_date` | Date | Dates |
| `line_items` | JSON | `[{ description, quantity, unit_price }]` |
| `vat_status` | Char(12) | `inclusive` / `exclusive` / `none` |
| `subtotal` / `vat_amount` / `total` | Decimal(12,2) | **Server-computed** |
| `payment_details_note` | Text | Banking details |
| `status` | Char(8) | `draft` / `sent` / `paid` |
| `finalised` | Boolean | Locked |
| `created_at` | DateTime | Auto |

### `insights_insight`

| Field | Type | Description |
| --- | --- | --- |
| `id` | UUID | Primary key |
| `user` | FK → User | Cascade |
| `period` | FK → Period | Cascade |
| `insight` | Text | The finding |
| `malume_take` | Text | Plain-language restatement |
| `supporting_transactions` | JSON | Transaction IDs that prove it |
| `financial_effect` | Char(200) | Rand impact |
| `recommended_action` | Char(250) | What to do |
| `status` | Char(10) | `pending` / `approved` / `rejected` |
| `generated_at` | DateTime | Auto |

---

# API Documentation

Base: `{VITE_API_BASE_URL}/api/v1/`
Auth header: `Authorization: Token <token>`
Pagination: DRF envelope `{ count, next, previous, results }`
Errors: `{ "detail": "..." }` for general failures, `{ "field": ["msg"] }` for validation.
Dates `YYYY-MM-DD`; timestamps ISO 8601 UTC; periods `YYYY-MM`. Money is always a string.

## Auth

### POST

```
POST /api/v1/auth/register/
```

Create an account and return a token.

Request body:

```json
{
  "email": "thabo@example.co.za",
  "password": "correct-horse-battery",
  "owner_name": "Thabo",
  "business_name": "Thabo's Plumbing"
}
```

Response `201`:

```json
{
  "token": "9c1f...e2",
  "user": {
    "id": 1,
    "email": "thabo@example.co.za",
    "owner_name": "Thabo",
    "business_name": "Thabo's Plumbing",
    "vat_registered": false
  }
}
```

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `/auth/login/` | `email`, `password` | `{ token, user }` |
| POST | `/auth/logout/` | — | `204` |
| GET | `/auth/me/` | — | `User` |
| PATCH | `/auth/me/` | `owner_name`, `business_name`, `vat_registered` | `User` |

## Uploads

### POST

```
POST /api/v1/uploads/text/
```

Submit a pasted batch of receipt text. Extraction runs immediately and the response already carries the outcome.

Request body:

```json
{ "text": "MAKRO WOODMEAD\n2026-07-14\nA4 paper x2 @ 89.99\nTOTAL R205.98 (VAT incl)" }
```

Response `201`:

```json
{
  "id": "3f2a...",
  "filename": "pasted-batch.txt",
  "content_type": "text/plain",
  "size_bytes": 68,
  "status": "extracted",
  "transaction_count": 1,
  "error_message": null,
  "uploaded_at": "2026-07-14T09:12:03Z"
}
```

| Method | Path | Body / Notes | Returns |
| --- | --- | --- | --- |
| GET | `/uploads/` | `?period=YYYY-MM&page=` | paginated `Upload[]` |
| POST | `/uploads/` | multipart `file` | `Upload` |
| GET | `/uploads/{id}/` | poll `status` | `Upload` |
| DELETE | `/uploads/{id}/` | — | `204` |

## Transactions

### GET

```
GET /api/v1/transactions/?period=2026-07&category=transport&flagged=true
```

List the user's transactions for a period. Filters: `period`, `category`, `flagged`, `page`.

Response `200`:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "b71c...",
      "merchant": "Makro Woodmead",
      "date": "2026-07-14",
      "description": "A4 paper",
      "line_items": [{ "description": "A4 paper", "quantity": 2, "unit_price": "89.99" }],
      "total": "205.98",
      "stated_vat": "26.87",
      "vat_status": "inclusive",
      "vat_amount": "26.87",
      "net_amount": "179.11",
      "category": "office_supplies",
      "category_source": "rule",
      "payment_method": "card",
      "missing_information": [],
      "edited": false,
      "approved": false,
      "rejected": false,
      "anomalies": []
    }
  ]
}
```

### PATCH

```
PATCH /api/v1/transactions/{id}/
```

Edit any editable field. The server writes a `Revision`, recomputes VAT and re-runs anomaly detection. `vat_amount` and `net_amount` in the request body are ignored.

Request body:

```json
{ "category": "stock_and_materials", "vat_status": "inclusive" }
```

Response `200`: the updated `Transaction`, with `edited: true`, `category_source: "user"` and a refreshed `anomalies` array.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/transactions/{id}/` | Single transaction |
| DELETE | `/transactions/{id}/` | `204` |
| GET | `/transactions/{id}/revisions/` | `Revision[]` before/after trail |
| POST | `/transactions/{id}/approve/` | Mark reviewed and accepted |
| POST | `/transactions/{id}/reject/` | Mark reviewed and rejected |
| POST | `/transactions/{id}/anomalies/{anomalyId}/resolve/` | Dismiss one flag |

## Insights

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/insights/?period=` | `Insight[]`, each with `supporting_transactions` |
| POST | `/insights/{id}/status/` | `{ status: "approved" \| "rejected" }` |
| GET | `/insights/spend-by-category/?period=` | `CategoryBreakdown[]` |
| GET | `/insights/income-by-client/?period=` | `ClientIncome[]` |

## Periods

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/periods/` | `Period[]` history |
| GET | `/periods/current/` | `Period`, opens the month lazily |
| GET | `/periods/{YYYY-MM}/` | `Period` with totals, VAT, profit |
| POST | `/periods/{YYYY-MM}/close/` | `Period`, locked |

## Invoices

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/invoices/` | `?status=&page=` |
| POST | `/invoices/` | Server assigns the number and computes totals |
| GET / PATCH / DELETE | `/invoices/{id}/` | |
| POST | `/invoices/{id}/status/` | `{ status: "draft" \| "sent" \| "paid" }`; `paid` becomes period income |

## Calling it from the frontend

```ts
import { api } from "@/lib/api";

const { results } = await api.transactions.list({ period: "2026-08" });
await api.transactions.update(id, { category: "transport" });
```

---

# Design System

Defined in `src/styles.css` using Tailwind v4 `@theme` tokens. Never hardcode colour utilities in components.

| Token | Value | Use |
| --- | --- | --- |
| Background | `#F8FAFC` | Page canvas |
| Primary | `#16A34A` (growth green) | Actions, positives |
| Accent | `#2563EB` (trust blue) | Links, secondary emphasis |
| Border | `#E2E8F0` | Hairlines, card edges |
| Destructive | red | **Flagged ledger rows render in red** |

- **Type:** Inter throughout. Tabular numerals (`num` utility) for all money.
- **Radius:** 24px on cards (`card-paper`).
- **Layout:** floating 280px left sidebar, 72px top bar with search / notifications / avatar, generous whitespace.
- **Utilities:** `card-paper`, `float-panel`, `ink-panel` (green→blue gradient), `num`.
- **Shadows:** `--shadow-paper` (resting), `--shadow-float` (raised panels).
- **Reference feel:** Apple Wallet, Stripe, Linear, Arc — calm, premium, human.

---

# Security Model

- **Token authentication.** DRF tokens sent as `Authorization: Token <token>`; a `401` clears the client session automatically.
- **Per-user isolation.** Every queryset filters on `request.user`. There is no endpoint that accepts an arbitrary user ID.
- **No secrets in the browser.** `VITE_*` variables are public by construction. `SECRET_KEY`, `DATABASE_URL` and `LOVABLE_AI_API_KEY` exist only on the Django host.
- **Server-authoritative money.** `vat_amount`, `net_amount`, `subtotal` and invoice `total` are read-only on the API and recomputed server-side on every write.
- **Input validation.** All writes go through DRF serializers; failures return `400` with per-field error arrays.
- **CORS allowlist.** Only the origins in `CORS_ALLOWED_ORIGINS` may call the API; the same list backs `CSRF_TRUSTED_ORIGINS`.
- **Uploads are namespaced** per user under `receipts/<user_id>/<uuid>/`.

---

# Testing

## Unit Testing

Target the pure service layers, which have no HTTP surface and no database dependency:

- `backend/vat/services.py` — inclusive, exclusive and unknown VAT; `ROUND_HALF_UP` at the half-cent boundary; `line_items_subtotal` with missing or zero quantities.
- `backend/extraction/services.py` — merchant, date and total extraction across SA receipt formats; `missing_information` population; multi-receipt splitting.
- `backend/extraction/categorise.py` — keyword-to-category mapping and the `other` fallback.
- `backend/ledger/anomalies.py` — one focused test per detector, plus a negative case each.

```bash
cd backend && python manage.py test
```

Frontend equivalents live alongside `src/lib/malume/vat.ts`, `parser.ts` and `analysis.ts`:

```bash
bunx vitest run
```

## Integration Testing

An end-to-end smoke test exercises the full lifecycle against a live SQLite database:

1. Register a user and capture the token
2. `POST /uploads/text/` with a multi-receipt batch
3. Assert `status: extracted` and the expected `transaction_count`
4. Assert VAT figures, categories and anomaly flags on the created rows
5. `PATCH` a transaction, assert a `Revision` was written and anomalies re-ran
6. `POST` an invoice, assert the server-assigned number and totals
7. Mark the invoice `paid`, assert the period income and profit move
8. Assert a second user cannot read any of it

This flow has been run and passes. Django's `APITestCase` is the right home for it going forward.

---

# Deployment

## Backend

Any Python host — Railway, Fly, Render, or a VPS:

```bash
gunicorn config.wsgi --bind 0.0.0.0:$PORT
```

Set in the environment: `SECRET_KEY`, `DEBUG=0`, `ALLOWED_HOSTS`, a Postgres `DATABASE_URL`, and `CORS_ALLOWED_ORIGINS` pointing at your deployed frontend origin. Run `python manage.py migrate` and `collectstatic` on release. For real file volume, move `MEDIA_ROOT` to object storage.

## Frontend

```bash
npm run build
```

Builds to an edge/Cloudflare Worker target. Set `VITE_API_BASE_URL` to the deployed API origin at build time — it is baked into the bundle.

---

# Future Improvements

- **Wire the pages to Django.** The UI still reads from the in-memory store in `src/lib/malume/store.tsx`. Migrate domain by domain via TanStack Query: auth first, then uploads and ledger, then insights and invoices.
- **Login and registration screens.** The backend endpoints exist; the UI does not.
- **Async extraction.** Move `process()` onto Celery + Redis so large uploads don't block the request, and let the client poll `status`.
- **OCR for photographed receipts.** Currently only PDF and text are readable; phone photos are the actual input most users have.
- **Charts.** Spend-by-category and income-by-client endpoints exist but are not visualised.
- **Bank statement import.** CSV/OFX ingestion to reconcile against extracted receipts.
- **Invoice PDF generation** server-side, plus email delivery.
- **SARS-ready VAT201 export** rather than generic markdown.
- **Multi-currency** and non-15% VAT jurisdictions.
- **Mobile app / WhatsApp intake** — photograph a slip, send it, done.

---

# Known Limitations

- **The frontend is not yet connected to Django.** Both halves work; the wiring between them is the next task. Without `VITE_API_BASE_URL`, the app runs entirely on the client-side prototype store with localStorage persistence.
- **Extraction is synchronous.** A large batch blocks the HTTP request. There is no queue yet.
- **No OCR.** Image uploads cannot be read; only PDF and plain text.
- **AI extraction is optional and best-effort.** Without `LOVABLE_AI_API_KEY` you get regex-only extraction, which leaves more fields in `missing_information`.
- **VAT is hard-coded at 15% ZAR.** No other rates or currencies.
- **Anomaly thresholds are heuristics,** not learned. Expect false positives on unusual but legitimate spending until they're tuned.
- **Income only comes from paid invoices.** Cash sales and other income streams aren't modelled yet.
- **Closing a period is a soft lock** — it records `closed_at` but does not hard-prevent every downstream write.
- **Local media storage.** `MEDIA_ROOT` is the filesystem; not durable on ephemeral hosts.
- **Sample data is synthetic.** The bundled batch is realistic but invented.

---

# Contributors

| Name | Role |
| --- | --- |
| Jaden | Product owner, design direction |
| Lovable | Frontend, Django backend, extraction and VAT engines |

---

# License

No licence has been specified yet. Until one is added, all rights are reserved by the project owner.

Suggested if you want it open: **MIT** — add a `LICENSE` file at the repo root.
