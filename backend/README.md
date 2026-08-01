# Money Malume — Django API

The backend for the Money Malume frontend. Built to `docs/backend-api-contract.md`.

## Run it locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then edit
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8000
```

Point the frontend at it:

```
VITE_API_BASE_URL=http://localhost:8000
```

Everything is served under `/api/v1/`. Django admin is at `/admin/`.

## Apps

| App | Owns |
| --- | --- |
| `accounts` | Email-based `User`, token auth, profile (`owner_name`, `business_name`, `vat_registered`) |
| `uploads` | `Upload` — PDF/text intake, pasted batches, extraction status |
| `extraction` | Receipt text parsing, rule-based categorisation, optional AI gap-filling (no HTTP surface) |
| `vat` | The 15% VAT arithmetic, in `Decimal` (no HTTP surface) |
| `ledger` | `Transaction`, `Revision` (before/after audit), `Anomaly` detection |
| `insights` | `Insight` generation with supporting transactions, category and client breakdowns |
| `periods` | `Period` — one per month, totals, income, profit, close |
| `invoices` | `Invoice` — server-assigned numbers, server-computed totals, paid → income |

## Rules the code enforces

1. Money is `Decimal(12, 2)`, serialized as strings.
2. VAT is computed server-side in `vat/services.py`. `vat_amount` and `net_amount` are read-only on the API.
3. Every transaction has a category; unknown falls back to `other`, with `category_source` of `rule`, `ai` or `user`.
4. Every queryset is filtered by `request.user`.
5. Edits append a `Revision` row so the UI can show before and after.
6. Anomalies are recomputed on every edit: duplicates, missing fields, VAT mismatch, line-item mismatch, outliers, large cash, recurring subscriptions.

## AI extraction (optional)

Set `LOVABLE_AI_API_KEY` and the parser will ask a model to fill in only the
fields the regex pass missed (merchant, date, category). The model never does
arithmetic — all money maths stays in `vat/services.py`.

## Deploy

Any Python host (Railway, Fly, Render, a VPS):

```bash
gunicorn config.wsgi --bind 0.0.0.0:$PORT
```

Set `SECRET_KEY`, `DEBUG=0`, `ALLOWED_HOSTS`, `DATABASE_URL` (Postgres) and
`CORS_ALLOWED_ORIGINS` (your frontend origin) in the environment.
