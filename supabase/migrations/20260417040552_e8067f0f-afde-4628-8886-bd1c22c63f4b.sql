-- =============================================
-- ADMIN ASSIGNMENTS TABLE (which admin manages which user)
-- =============================================
CREATE TABLE IF NOT EXISTS public.admin_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  user_id UUID NOT NULL,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.admin_assignments ENABLE ROW LEVEL SECURITY;

-- Helper: is super admin?
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

-- Helper: is any kind of admin (admin or super_admin)?
CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin')
  );
$$;

-- Helper: does this admin manage this user? (true for super_admin OR direct assignment)
CREATE OR REPLACE FUNCTION public.admin_manages_user(_admin_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_admin_id)
    OR EXISTS (
      SELECT 1 FROM public.admin_assignments
      WHERE admin_id = _admin_id AND user_id = _target_user_id
    );
$$;

-- RLS for admin_assignments
CREATE POLICY "Super admins manage assignments"
ON public.admin_assignments FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins view their assignments"
ON public.admin_assignments FOR SELECT
USING (admin_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- =============================================
-- UPDATE RLS POLICIES — admins see only assigned users
-- =============================================

-- PROFILES: drop & recreate admin select/update
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins view managed profiles"
ON public.profiles FOR SELECT
USING (public.admin_manages_user(auth.uid(), user_id));

CREATE POLICY "Admins update managed profiles"
ON public.profiles FOR UPDATE
USING (public.admin_manages_user(auth.uid(), user_id));

-- WALLETS
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins can update all wallets" ON public.wallets;

CREATE POLICY "Admins view managed wallets"
ON public.wallets FOR SELECT
USING (public.admin_manages_user(auth.uid(), user_id));

CREATE POLICY "Admins update managed wallets"
ON public.wallets FOR UPDATE
USING (public.admin_manages_user(auth.uid(), user_id));

CREATE POLICY "Admins insert managed wallets"
ON public.wallets FOR INSERT
WITH CHECK (public.admin_manages_user(auth.uid(), user_id));

-- TRANSACTIONS
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update all transactions" ON public.transactions;

CREATE POLICY "Admins view managed transactions"
ON public.transactions FOR SELECT
USING (public.admin_manages_user(auth.uid(), user_id));

CREATE POLICY "Admins update managed transactions"
ON public.transactions FOR UPDATE
USING (public.admin_manages_user(auth.uid(), user_id));

CREATE POLICY "Admins insert transactions"
ON public.transactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR public.admin_manages_user(auth.uid(), user_id)
);

-- KYC
DROP POLICY IF EXISTS "Admins can view all kyc" ON public.kyc_documents;
DROP POLICY IF EXISTS "Admins can update all kyc" ON public.kyc_documents;

CREATE POLICY "Admins view managed kyc"
ON public.kyc_documents FOR SELECT
USING (public.admin_manages_user(auth.uid(), user_id));

CREATE POLICY "Admins update managed kyc"
ON public.kyc_documents FOR UPDATE
USING (public.admin_manages_user(auth.uid(), user_id));

-- LOANS
DROP POLICY IF EXISTS "Admins can view all loans" ON public.loans;
DROP POLICY IF EXISTS "Admins can update all loans" ON public.loans;

CREATE POLICY "Admins view managed loans"
ON public.loans FOR SELECT
USING (public.admin_manages_user(auth.uid(), user_id));

CREATE POLICY "Admins update managed loans"
ON public.loans FOR UPDATE
USING (public.admin_manages_user(auth.uid(), user_id));

-- CARDS
DROP POLICY IF EXISTS "Admins can view all cards" ON public.cards;
DROP POLICY IF EXISTS "Admins can update all cards" ON public.cards;

CREATE POLICY "Admins view managed cards"
ON public.cards FOR SELECT
USING (public.admin_manages_user(auth.uid(), user_id));

CREATE POLICY "Admins update managed cards"
ON public.cards FOR UPDATE
USING (public.admin_manages_user(auth.uid(), user_id));

-- BILL PAYMENTS
DROP POLICY IF EXISTS "Admins can view all bill payments" ON public.bill_payments;

CREATE POLICY "Admins view managed bill payments"
ON public.bill_payments FOR SELECT
USING (public.admin_manages_user(auth.uid(), user_id));

-- USER_ROLES: super admin manages all roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Super admins manage all roles"
ON public.user_roles FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins view roles"
ON public.user_roles FOR SELECT
USING (public.is_any_admin(auth.uid()));

-- =============================================
-- ENABLE REALTIME on key tables
-- =============================================
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.wallets REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.loans REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.loans; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- =============================================
-- PROMOTE existing admin to SUPER ADMIN
-- =============================================
DO $$
DECLARE
  super_uid uuid;
BEGIN
  SELECT id INTO super_uid FROM auth.users WHERE email = 'akanbidaniel360@gmail.com' LIMIT 1;
  IF super_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (super_uid, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Update handle_new_user: super_admin instead of admin for the main email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  raw_meta JSONB;
  user_name TEXT;
  user_country TEXT;
  user_currency TEXT;
BEGIN
  raw_meta := NEW.raw_user_meta_data;
  user_name := COALESCE(raw_meta->>'full_name', raw_meta->>'name', 'User');
  user_country := COALESCE(raw_meta->>'country', 'US');
  user_currency := COALESCE(raw_meta->>'currency', 'USD');

  INSERT INTO public.profiles (user_id, full_name, email, country, primary_currency, account_number, referral_code)
  VALUES (
    NEW.id, user_name, NEW.email, user_country, user_currency,
    public.generate_account_number(), public.generate_referral_code()
  );

  INSERT INTO public.wallets (user_id, currency, available_balance, pending_balance)
  VALUES (NEW.id, user_currency, 0, 0);

  IF NEW.email = 'akanbidaniel360@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();