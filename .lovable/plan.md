# Capital Crest — Digital Banking Platform

## Brand & Design

- **Name**: Capital Crest
- **Style**: Premium fintech UI inspired by Revolut/OPay — clean cards, subtle gradients, dark/light mode
- **Mobile-first**: Optimized for 360px viewport, scales up beautifully
- **Colors**: Deep navy primary, emerald accents, clean whites

## Phase 1: Foundation (This Implementation)

### 1. Authentication & Profiles

- Signup: Full Name, Email, Password, Country, Currency selection (USD, NGN, GBP, EUR, etc.)
- Login with email/password
- Supabase Auth + profiles table with currency preference
- Auto-generate unique 10-digit account number on signup
- Transaction PIN setup (4-digit, hashed)

### 2. Database Schema (Supabase)

- `profiles` — name, country, currency, account_number, pin_hash, kyc_status, credit_score, is_frozen
- `user_roles` — admin role system ([akanbidaniel360@gmail.com](mailto:akanbidaniel360@gmail.com) as admin)
- `wallets` — multi-currency balances (available, pending)
- `transactions` — all financial activity with status tracking
- `kyc_documents` — ID uploads, selfie, verification status
- `beneficiaries` — saved recipients
- `cards` — virtual card applications and details
- `loans` — applications, repayment schedules
- `savings_goals` — locked funds with interest simulation
- `notifications` — real-time alerts
- `exchange_rates` — admin-managed currency rates
- `bill_payments` — airtime, electricity, internet
- `referrals` — invite tracking and bonuses
- Full RLS policies on all tables

### 3. User Dashboard

- Welcome header with name and greeting
- Balance card showing available/pending in user's currency
- Account number + "Capital Crest" bank name display
- Quick action grid: Deposit, Withdraw, Transfer, Pay Bills, Loan, Card
- Recent transactions list
- Dark/light mode toggle

### 4. Core Banking Features

- **Deposits**: Bank transfer/crypto method, upload proof, status tracking (Pending → Approved)
- **Withdrawals**: Amount + bank details input, PIN verification, admin approval flow
- **Transfers**: To other users by email/account number, PIN required, instant balance update
- **Beneficiary Management**: Save/delete frequent recipients, quick transfer

### 5. Multi-Currency System

- Primary currency per user
- Currency conversion with admin-set exchange rates
- All balances displayed in user's currency

### 6. KYC Verification

- Upload ID document + selfie (Supabase Storage)
- Status: Pending / Verified / Rejected
- Restrict withdrawals, loans, cards until verified

### 7. Card System

- Apply for virtual debit card
- Admin approval flow
- Display card details (number, expiry, CVV — generated)
- Freeze/unfreeze, spending limits, online/international toggles

### 8. Loan System

- Apply: amount + duration
- Admin approval → balance credited
- Repayment schedule generation
- Credit score impact

### 9. Credit Score

- Score based on: loan repayments, transaction behavior, account age
- Affects loan approval and limits
- Displayed on dashboard

### 10. Bill Payments

- Airtime, Electricity, Internet categories
- Amount input, deduct from balance

### 11. Savings Feature

- Create savings goal with lock period
- Simulated interest earnings
- Auto-unlock on maturity

### 12. Analytics & Statements

- Spending by category charts
- Monthly insights
- Generate downloadable PDF statements

### 13. Notifications

- In-app notification center
- Alerts for all financial activity

### 14. Referral System

- Unique referral code per user
- Track invites, earn bonus on signup

### 15. Fraud Detection (Basic)

- Flag large transactions (configurable threshold)
- Flag rapid consecutive withdrawals
- Auto-freeze suspicious accounts

### 16. Admin Panel (Full Control)

- Route: `/admin` — restricted to admin role
- **Users**: Viewing 

17. Create everything at once, don't ask me any questions, approve cloud and create everything at once 
  &nbsp;