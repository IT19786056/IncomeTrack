# Payground — Income, expenses and Sri Lankan income tax

A mobile-first PWA for tracking consulting income and expenses, and working out
what you owe the Inland Revenue Department. Built for a single independent
consultant billing in foreign currency, so tax is treated as a first-class
feature rather than an export-to-CSV afterthought.

## Features

- **Income and expense tracking** in LKR, with back-dating so a year of
  assessment can be reconstructed from real dates.
- **Deductible expense flagging.** Expenses marked as business costs reduce
  taxable income, and the app shows what that flagging has saved you.
- **Income tax engine** for Sri Lankan individuals: personal relief, progressive
  bands, and the 15% cap on foreign-currency service income.
- **Deadline tracking** for quarterly self-assessment instalments and the annual
  return, with a countdown and a record of what you've settled.
- **Personal and business expenses side by side.** The deductible flag only
  affects tax; personal spending is tracked exactly the same way.
- **Spending breakdown by category**, month by month, ranked, with a personal
  versus claimable split.
- **Savings view** — cumulative running total across the year, savings rate,
  and your best and tightest months.
- **Monthly budgets** per category, with spend-against-plan bars.
- **Net cash flow chart** across the year of assessment.
- **AI suggestions** (Gemini) for commentary only — never for arithmetic.
- **Invitation-only access** with Google sign-in and an admin panel.

## Tech stack

- **React 19** + **TypeScript**, built with **Vite 6**
- **Tailwind CSS v4** (design tokens in `src/index.css`)
- **Firebase** — Google Auth and Firestore
- **Recharts** for the cash flow chart, **Motion** for transitions
- **vite-plugin-pwa** for offline support
- **Vitest** for the tax engine tests

There is no backend server and no SQL database. All persistence is Firestore,
secured by `firestore.rules`.

## Project structure

```
src/
  lib/tax/            The tax engine — pure, no React, no Firestore
    rates.ts          Rate tables keyed by year of assessment
    periods.ts        YA boundaries and statutory deadlines
    calculate.ts      The computation itself
    *.test.ts         Anchored on published worked examples
  lib/
    transactions.ts   Normalising and aggregating records
    repository.ts     Every Firestore write
    format.ts         Currency and date formatting
  hooks/              Live data subscriptions, tax overview derivation
  context/            Auth provider
  components/         UI, with ui/ primitives and forms/
```

## The tax model

Sri Lanka's year of assessment runs **1 April to 31 March**. For an individual:

```
gross income − deductible expenses = net business income
net business income − personal relief = taxable income
taxable income → progressive bands
```

From YA 2025/26 the personal relief is **LKR 1,800,000** and the bands are 6% on
the first 1,000,000 of taxable income, then 18%, 24% and 30% on 500,000 each,
then 36%. For foreign-currency service income remitted through a licensed Sri
Lankan bank, every marginal rate is **capped at 15%** — so the ladder collapses
to 6% then 15%. That income was fully **exempt up to YA 2024/25**; the exemption
ended 1 April 2025.

Self-assessment instalments are due **15 August, 15 November, 15 February and
15 May**, with the annual return due **30 November** after the year ends.

Rates live in `src/lib/tax/rates.ts` as data keyed by year, so a rate change is
a new table entry rather than a logic change. Tax is always derived from the
underlying records and never stored, so editing or back-dating a transaction
updates every figure immediately.

> These figures are an estimate to plan with, not tax advice. Confirm anything
> material with a qualified adviser before filing.

## Getting started

Requires Node 18 or newer.

```bash
npm install
cp .env.example .env   # then fill in your Firebase config
npm run dev
```

`VITE_ADMIN_EMAIL` sets the bootstrap admin. It must match the literal in
`firestore.rules`, because security rules cannot read environment variables.

Deploy the rules with:

```bash
firebase deploy --only firestore:rules
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |
| `npm run lint` | Typecheck with `tsc --noEmit` |
| `npm test` | Run the tax engine tests |

## Known gaps

- **`VITE_GEMINI_API_KEY` ships in the client bundle** and can be extracted from
  the deployed JavaScript. It needs to move behind a server endpoint before the
  app is shared publicly.
- No recurring transactions — regular income is entered each time.
- No multi-currency support; amounts are recorded in LKR.
- No accounts or wallets, so there is no transfer concept or net worth view.
- Only the tax engine has tests; the UI has none.
