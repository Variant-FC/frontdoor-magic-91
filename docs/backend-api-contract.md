# Money Malume — Django backend contract

The frontend in this repo is a **standalone client**. It holds no business data
and no secrets. Everything durable — uploads, transactions, VAT figures,
anomalies, insights, invoices, users — lives in a separate Django service that
you deploy yourself (Railway, Fly, Render, a VPS, wherever).

This document is the contract between the two. Build the Django side to match
it and the frontend will work without further changes.

---

## 1. Connection

The client reads one environment variable:

```
VITE_API_BASE_URL=https://api.moneymalume.co.za
```

All endpoints are served under `{VITE_API_BASE_URL}/api/v1/`.

Client code lives in `src/lib/api/` and is the **only** place that talks to
Django:

| File | Role |
| --- | --- |
| `config.ts` | Base URL, token storage |
| `client.ts` | Single `fetch` wrapper: auth header, error normalisation, 401 handling |
| `types.ts` | Wire types mirroring the DRF serializers |
| `resources.ts` | Typed methods grouped by feature domain |

No component may call `fetch` against the API directly.

---

## 2. Suggested Django project layout

One Django app per feature domain, matching `src/lib/malume/features.ts`:

```
malume_api/
  config/            settings, urls, asgi
  accounts/          User, Profile, token auth
  uploads/           Upload model, file intake, extraction queue
  extraction/        AI/OCR pipeline, categorisation (no HTTP surface)
  ledger/            Transaction, LineItem, Revision, Anomaly
  vat/               VAT calculation service (no HTTP surface)
  insights/          Insight, chart aggregations
  periods/           Period model, monthly rollover
  invoices/          Invoice model, numbering, PDF
```

Recommended stack: Django 5 + Django REST Framework + PostgreSQL, Celery +
Redis for extraction jobs, `django-cors-headers` for the browser origin.

---

## 3. Non-negotiable server rules

1. **Money is `Decimal`, never `float`.** `DecimalField(max_digits=12, decimal_places=2)`.
   Serialize as strings — the client types them as `string` for this reason.
2. **VAT is computed server-side at 15%** and returned as `vat_amount` /
   `net_amount`. Never accept these from the client.
3. **Every transaction always has a category.** Fall back to `other`; record
   `category_source` as `ai`, `rule`, or `user`.
4. **Every record is owned by a user.** Filter every queryset by
   `request.user`; never expose another user's data by ID.
5. **Corrections are append-only.** Writing a transaction field creates a
   `Revision` row with `before` and `after` so the UI can show both.
6. **Validate all input** with DRF serializers; return `400` with per-field
   error arrays.

---

## 4. Endpoints

### Auth — `accounts`

| Method | Path | Body / Notes | Returns |
| --- | --- | --- | --- |
| POST | `/auth/register/` | `email`, `password`, `owner_name`, `business_name` | `{ token, user }` |
| POST | `/auth/login/` | `email`, `password` | `{ token, user }` |
| POST | `/auth/logout/` | — | `204` |
| GET | `/auth/me/` | — | `User` |
| PATCH | `/auth/me/` | `owner_name`, `business_name`, `vat_registered` | `User` |

Auth header: `Authorization: Token <token>`. A `401` clears the client session
automatically.

### Uploads — `uploads`

| Method | Path | Body / Notes | Returns |
| --- | --- | --- | --- |
| GET | `/uploads/` | `?period=YYYY-MM&page=` | paginated `Upload[]` |
| POST | `/uploads/` | multipart `file` (PDF / image / text) | `Upload` (`status: pending`) |
| POST | `/uploads/text/` | `{ text }` — pasted batch | `Upload` |
| GET | `/uploads/{id}/` | poll for `status` | `Upload` |
| DELETE | `/uploads/{id}/` | — | `204` |

Extraction runs async. `status` moves `pending → processing → extracted`
(or `failed` with `error_message`), and `transaction_count` fills in on success.

### Transactions — `ledger`

| Method | Path | Body / Notes | Returns |
| --- | --- | --- | --- |
| GET | `/transactions/` | `?period=&category=&flagged=&page=` | paginated `Transaction[]` |
| GET | `/transactions/{id}/` | — | `Transaction` |
| PATCH | `/transactions/{id}/` | any editable field | `Transaction` (recomputes VAT + anomalies) |
| DELETE | `/transactions/{id}/` | — | `204` |
| GET | `/transactions/{id}/revisions/` | before/after audit trail | `Revision[]` |
| POST | `/transactions/{id}/approve/` | human review | `Transaction` |
| POST | `/transactions/{id}/reject/` | human review | `Transaction` |
| POST | `/transactions/{id}/anomalies/{anomalyId}/resolve/` | dismiss a flag | `Transaction` |

Anomaly types the server should emit: `probable_duplicate`,
`missing_required_field`, `vat_mismatch`, `line_item_total_mismatch`,
`unusual_amount`, `large_cash_transaction`, `recurring_subscription`.

### Insights — `insights`

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/insights/?period=` | `Insight[]` — each carries `supporting_transactions` so the UI can link to its evidence |
| POST | `/insights/{id}/status/` | `{ status: "approved" \| "rejected" }` |
| GET | `/insights/spend-by-category/?period=` | `CategoryBreakdown[]` |
| GET | `/insights/income-by-client/?period=` | `ClientIncome[]` |

### Periods — `periods`

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/periods/` | `Period[]` (history) |
| GET | `/periods/current/` | `Period` — opens the month lazily |
| GET | `/periods/{YYYY-MM}/` | `Period` with totals, VAT, profit |
| POST | `/periods/{YYYY-MM}/close/` | `Period` (locks the month) |

### Invoices — `invoices`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/invoices/` | `?status=&page=` |
| POST | `/invoices/` | server assigns `invoice_number` and computes totals |
| GET / PATCH / DELETE | `/invoices/{id}/` | |
| POST | `/invoices/{id}/status/` | `{ status: "draft" \| "sent" \| "paid" }` — a paid invoice becomes income for the period |

---

## 5. Conventions

- **Pagination:** DRF default envelope — `{ count, next, previous, results }`.
- **Dates:** `YYYY-MM-DD`. **Timestamps:** ISO 8601 UTC. **Periods:** `YYYY-MM`.
- **Errors:** `{ "detail": "..." }` for general failures, `{ "field": ["msg"] }`
  for validation. The client surfaces both.
- **CORS:** allow the frontend origin and the `Authorization` header; handle
  `OPTIONS` preflight.
- **Secrets** (AI keys, database URL, `SECRET_KEY`) live on the Django host
  only. Nothing sensitive belongs in `VITE_*` — those are public.

---

## 6. Wiring the frontend up

Once the API is running:

```ts
import { api } from "@/lib/api";

const { results } = await api.transactions.list({ period: "2026-08" });
await api.transactions.update(id, { category: "transport" });
```

The current pages still read from the in-memory store in
`src/lib/malume/store.tsx`. Swapping that store over to these calls (via
TanStack Query) is the next step, and is best done one domain at a time —
auth first, then uploads and the ledger, then insights and invoices.
