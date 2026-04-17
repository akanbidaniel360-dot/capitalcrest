-- 1. Add super_admin role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Add currency_conversion to transaction_type enum
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'currency_conversion';

-- 3. Add admin_credit / admin_debit transaction types for audit trail
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'admin_adjustment';