-- ============ GRANTS TABLE ============
CREATE TABLE public.grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','claimed')),
  clearance_code TEXT,
  admin_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own grants" ON public.grants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own grants" ON public.grants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own grants" ON public.grants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view managed grants" ON public.grants FOR SELECT USING (admin_manages_user(auth.uid(), user_id));
CREATE POLICY "Admins update managed grants" ON public.grants FOR UPDATE USING (admin_manages_user(auth.uid(), user_id));

CREATE TRIGGER grants_updated_at BEFORE UPDATE ON public.grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TAX REFUNDS TABLE ============
CREATE TABLE public.tax_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tax_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tax refunds" ON public.tax_refunds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tax refunds" ON public.tax_refunds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view managed tax refunds" ON public.tax_refunds FOR SELECT USING (admin_manages_user(auth.uid(), user_id));
CREATE POLICY "Admins update managed tax refunds" ON public.tax_refunds FOR UPDATE USING (admin_manages_user(auth.uid(), user_id));

CREATE TRIGGER tax_refunds_updated_at BEFORE UPDATE ON public.tax_refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ WALLET SYNC TRIGGER ============
CREATE OR REPLACE FUNCTION public.sync_wallet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta NUMERIC := 0;
  v_owner UUID;
  v_currency TEXT;
BEGIN
  -- Only act on completed transactions
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
    v_owner := NEW.user_id;
    v_currency := NEW.currency;
    v_delta := CASE NEW.type
      WHEN 'deposit' THEN NEW.amount
      WHEN 'transfer_in' THEN NEW.amount
      WHEN 'loan_credit' THEN NEW.amount
      WHEN 'interest' THEN NEW.amount
      WHEN 'referral_bonus' THEN NEW.amount
      WHEN 'admin_adjustment' THEN NEW.amount
      WHEN 'savings_unlock' THEN NEW.amount
      WHEN 'grant' THEN NEW.amount
      WHEN 'tax_refund' THEN NEW.amount
      WHEN 'crypto_deposit' THEN NEW.amount
      WHEN 'withdrawal' THEN -NEW.amount
      WHEN 'transfer_out' THEN -NEW.amount
      WHEN 'bill_payment' THEN -NEW.amount
      WHEN 'loan_repayment' THEN -NEW.amount
      WHEN 'card_payment' THEN -NEW.amount
      WHEN 'savings_lock' THEN -NEW.amount
      WHEN 'currency_conversion' THEN -NEW.amount
      ELSE 0
    END;
  ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status <> 'completed') THEN
    v_owner := NEW.user_id;
    v_currency := NEW.currency;
    v_delta := CASE NEW.type
      WHEN 'deposit' THEN NEW.amount
      WHEN 'transfer_in' THEN NEW.amount
      WHEN 'loan_credit' THEN NEW.amount
      WHEN 'interest' THEN NEW.amount
      WHEN 'referral_bonus' THEN NEW.amount
      WHEN 'admin_adjustment' THEN NEW.amount
      WHEN 'savings_unlock' THEN NEW.amount
      WHEN 'grant' THEN NEW.amount
      WHEN 'tax_refund' THEN NEW.amount
      WHEN 'crypto_deposit' THEN NEW.amount
      WHEN 'withdrawal' THEN -NEW.amount
      WHEN 'transfer_out' THEN -NEW.amount
      WHEN 'bill_payment' THEN -NEW.amount
      WHEN 'loan_repayment' THEN -NEW.amount
      WHEN 'card_payment' THEN -NEW.amount
      WHEN 'savings_lock' THEN -NEW.amount
      WHEN 'currency_conversion' THEN -NEW.amount
      ELSE 0
    END;
  ELSE
    RETURN NEW;
  END IF;

  IF v_delta = 0 THEN RETURN NEW; END IF;

  -- Ensure wallet exists then update
  INSERT INTO public.wallets (user_id, currency, available_balance)
  VALUES (v_owner, v_currency, 0)
  ON CONFLICT DO NOTHING;

  UPDATE public.wallets
    SET available_balance = available_balance + v_delta,
        updated_at = now()
    WHERE user_id = v_owner AND currency = v_currency;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_wallet_balance
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_balance();

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.grants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tax_refunds;