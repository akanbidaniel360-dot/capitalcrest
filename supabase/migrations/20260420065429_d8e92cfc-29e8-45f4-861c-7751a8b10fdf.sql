-- Add new transaction types
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'grant';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'tax_refund';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'crypto_deposit';