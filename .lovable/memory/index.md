# Project Memory

## Core
Capital Crest digital banking app. Navy+emerald theme. Mobile-first 360px.
Supabase backend with full RLS. Super admin: akanbidaniel360@gmail.com
Inter font. Dark/light mode toggle. Transaction PIN for sensitive ops.
PWA installable (manifest + custom prompt, no service worker).
Crypto deposit wallet (USDT ERC-20): 0x56eeb7f7bfab320389b5a1a2666dd290e7cbc645

## Memories
- [DB Schema](mem://features/db-schema) — Banking schema, exchange_rates seeded, admin_assignments table
- [Auth Flow](mem://features/auth) — Supabase Auth, auto-profile+wallet, super_admin auto-role
- [Admin Panel](mem://features/admin) — Hierarchical: super_admin sees all, admin sees only assigned users. Edit balances, exchange rates (manual + simulated via open.er-api.com), promote/demote admins
- [Realtime](mem://features/realtime) — wallets/transactions/notifications/loans on supabase_realtime publication
