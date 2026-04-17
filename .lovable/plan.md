## Plan: 7 Enhancements to Capital Crest

### 1. Crypto Deposit Option (USDT ERC-20)

Add a new "Cryptocurrency" method to `/deposit` that displays:

- Wallet address: `0x56eeb7f7bfab320389b5a1a2666dd290e7cbc645`
- Network: Ethereum (ERC-20) • USDT
- Copy-to-clipboard button + QR code (using `qrcode.react`)
- Warning to send only USDT on Ethereum
- Submit creates a pending transaction with the TX hash as reference

### 2. About Page (Public)

New route `/about` accessible without login, telling the Capital Crest story:

- Hero: "Banking reimagined for the modern world"
- Mission/Vision section
- What we offer (multi-currency, instant transfers, virtual cards, loans)
- Customer service section: 24/7 support email (`support@capitalcrest.app`), phone, live chat hours
- FAQ section (6-8 common questions)
- Trust indicators (security, encryption, regulation note)
- CTAs to Sign Up / Sign In
- Add "About" link to landing page header + footer

### 3. Transaction History Enhancement

Improve existing `/transactions` page:

- Add **CSV export** button (downloads all filtered transactions)
- Add **date range filter** (this week / this month / this year / all)
- Add **search by description/reference**
- Add summary cards at top: Total In / Total Out / Net
- Add link to transactions page in bottom nav (replaces "Cards" or adds new item)

### 4. PWA Installable App

Convert site to installable PWA using a **simple manifest approach** (no service worker, since SW breaks Lovable preview iframe):

- Create `public/manifest.webmanifest` with name, icons, theme color, `display: "standalone"`
- Create app icons (192x192, 512x512) — generate as SVG-based PNGs with Capital Crest shield logo
- Add manifest link + theme-color meta in `__root.tsx`
- Build a custom **InstallAppPrompSupabase realtime subscriptions so the dashboard updates instantly when deposits are approvedt** component:
  - Listens for `beforeinstallprompt` event
  - Shows a bottom-sheet popup on first visit: "Install Capital Crest App" with Install / Not now buttons
  - On click, triggers native browser install prompt
  - For iOS Safari (no install event), shows instructions ("Tap Share → Add to Home Screen")
  - Remembers dismissal in localStorage (won't nag)
- Mount globally in `__root.tsx`

### 5. Admin Edit User Balances

In `/admin` Users tab:

- Add "Edit Balance" button per user
- Opens a dialog showing all their wallets (per currency)
- Admin enters new available_balance + optional note
- Updates wallet via `supabase.update` (admins have RLS UPDATE on wallets)
- Logs an admin transaction entry for audit trail
- Also add freeze/unfreeze toggle per user

### 6. Currency Conversion / Swap Feature

New route `/convert`:

- Select "From" currency (from user's wallets)
- Select "To" currency (any supported)
- Enter amount → shows real-time converted amount using exchange_rates table
- "Swap" button: deducts from source wallet, credits target wallet (creates one if missing), logs as `currency_conversion` transaction
- Add link from dashboard quick actions
- Display current rate and small fee notice (e.g., 0.5% spread for realism)

### 7. Exchange Rates — Admin Manual + Simulated

Enhance admin panel with a new "Rates" tab:

- Lists all configured rate pairs (USD↔NGN, USD↔GBP, etc.)
- Admin can manually edit any rate inline → saves to `exchange_rates`
- "Simulate Rates" button: fetches realistic rates via free public API `https://open.er-api.com/v6/latest/USD` (no key needed) and updates all pairs
- "Auto-Simulate" toggle: when on, system uses simulated rates with small random fluctuation (±2%) added on each fetch
- Seed initial rates for all 8 supported currency pairs on first load
- Supabase realtime subscriptions so the dashboard updates instantly when deposits /loans are approved and balance are deducted when a transfer or bill payment and other payments are made
  Build a secure role-based admin management system with hierarchical permissions. 
  👤 Roles
  There are 3 roles:
  super_admin (main admin)
  admin (created by super admin)
  user
  🔐 Authentication
  Email and password login (Gmail supported)
  Secure password hashing
  Session-based authentication
  🧠 Role Permissions
  Super Admin:
  Can create new admins using email
  Can promote or demote any user to admin
  Can view ALL users in the system
  Can view ALL admins
  Has full access to admin dashboard
  Admin:
  Can log into admin dashboard
  Can ONLY view users assigned to them
  Cannot see users assigned to other admins
  Cannot promote or demote admins Cannot access super admin features

### Technical Notes

- New dependency: `qrcode.react` for crypto QR codes
- New files: `src/routes/about.tsx`, `src/routes/convert.tsx`, `src/components/install-prompt.tsx`, `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`
- Updated files: `src/routes/deposit.tsx`, `src/routes/transactions.tsx`, `src/routes/admin.tsx`, `src/routes/dashboard.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/lib/currency.ts` (add convert helper)
- Migration: seed `exchange_rates` table with default pairs
- PWA caveat: install prompt only works on the published URL (capitalcrest.lovable.app), not in Lovable editor preview — this is browser behavior

### Layout

```text
/                → Landing (+ About link)
/about           → NEW: Bank info + customer service
/dashboard       → Existing
/deposit         → Enhanced: Bank/Crypto/Card tabs
/transactions    → Enhanced: filters, search, export
/convert         → NEW: Currency swap
/admin           → Enhanced: Edit balances + Rates tab
```