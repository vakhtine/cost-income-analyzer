# Cost & Income Analyzer

Privacy-first finance analyzer built with **TypeScript + Next.js only**.  
No FastAPI, no Railway, no database.

## How it works

```
Your browser
   ↓
Upload CSV/Excel
   ↓
TypeScript analyzes file locally
   ↓
Live city prices fetched from WhereNext (only for location compare)
```

Your transaction data **never leaves your device**.

---

## Run locally

Install **Node.js** from https://nodejs.org

**From the project root:**

```powershell
cd C:\Users\vakht\Projects\cost-income-analyzer
.\run.ps1
```

**Or from the frontend folder:**

```powershell
cd C:\Users\vakht\Projects\cost-income-analyzer\frontend
npm install
npm run dev
```

Open **http://localhost:3000**

If port 3000 is busy:

```powershell
cd frontend
$env:PORT=3003; npm run dev
```

Then open **http://localhost:3003**

> **Note:** `npm run dev` must be run from the `frontend` folder — there is no `package.json` in the project root. The root `run.ps1` starts the frontend for you.

Upload `sample_transactions.csv` from the project root to test.

---

## Deploy to Vercel

1. Push this project to GitHub
2. Import the `frontend` folder in Vercel
3. Deploy — no backend needed

---

## CSV format

- `Merchant`, `Category`, `Amount`
- Optional: `Date`, `Period`
- Multiple periods: Excel with one tab per month

---

## Live city comparison (Phase 1)

Supported reference cities with **live** WhereNext data:
- Belgrade, Serbia
- Sofia, Bulgaria
- Tirana, Albania
- Tbilisi, Georgia

Shows source, updated date, and citation (CC BY 4.0).

---

## Legacy folders (optional)

| Folder | Status |
|--------|--------|
| `frontend/` | **Main app** — use this |
| `backend/` | Not needed — kept for optional future use |
| `app.py` | Old Streamlit prototype |

---

## Add FastAPI later?

Yes. You can add Railway + FastAPI later without rebuilding the UI. The analyzer module in `frontend/lib/` is designed to be swappable.
