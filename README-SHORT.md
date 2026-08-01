# Money Malume

An AI financial assistant for South African micro-businesses. Drop in receipts
or transaction text, and it extracts the details, categorises the spend,
calculates 15% VAT, flags anomalies, and explains everything in plain language
through "Malume" — a warm South African uncle voice.

## What it does

- **Capture** — paste or upload transaction text; merchant, date, total and
  category are extracted automatically.
- **Ledger** — a running list of every expense, with flagged rows shown in red.
- **VAT** — 15% inclusive/exclusive arithmetic done in code (never by the model).
- **Insights** — biggest cost driver, reclaimable input VAT, missing VAT status,
  and items waiting for review.
- **Review queue** — human-in-the-loop confirmation before a period is closed.
- **Invoices** — issue and track client invoices.

## Stack

| Layer | Tech |
|---|---|
| Frontend | TanStack Start v1, React 19, Vite 7, TypeScript, Tailwind v4, shadcn/ui |
| Backend | Django 5.1 + Django REST Framework (Token auth) |
| Database | SQLite by default, Postgres via `DATABASE_URL` |
| AI | Hugging Face `meta-llama/Llama-3.1-8B-Instruct` (prose only) |

## Run it locally

Backend:

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

Frontend:

```bash
npm install
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
npm run dev
```

Without `VITE_API_BASE_URL` the app runs in local mock mode — fully usable,
but nothing is persisted.

## Environment variables

| Where | Variable | Purpose |
|---|---|---|
| Frontend (build time) | `VITE_API_BASE_URL` | Django base URL, no `/api/v1` suffix |
| Backend | `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` | Django basics |
| Backend | `CORS_ALLOWED_ORIGINS` | The frontend's exact origin |
| Backend | `DATABASE_URL` | Postgres connection string |
| Both | `HUGGINGFACE_API_KEY` | Enables Malume's generated voice |

## A note on the AI

The model never does arithmetic. Every figure is computed in code first and
handed to the model as fixed text; it only writes the explanation. If the key
is missing or the call fails, the UI falls back to written lines — never an
error, never a blank card.

## More

- Full documentation: [`README.md`](./README.md)
- Deployment handshake: [`docs/deployment-connection.md`](./docs/deployment-connection.md)
- API contract: [`docs/backend-api-contract.md`](./docs/backend-api-contract.md)
