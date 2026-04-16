
-- ============================================
-- CAPITAL CREST DIGITAL BANKING - FULL SCHEMA
-- ============================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.kyc_status AS ENUM ('none', 'pending', 'verified', 'rejected');
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'loan_credit', 'loan_repayment', 'bill_payment', 'savings_lock', 'savings_unlock', 'interest', 'referral_bonus', 'card_payment');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'failed');
CREATE TYPE public.card_status AS ENUM ('pending', 'active', 'frozen', 'cancelled');
CREATE TYPE public.loan_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'paid', 'defaulted');
CREATE TYPE public.notification_type AS ENUM ('deposit', 'withdrawal', 'transfer', 'loan', 'card', 'kyc', 'security', 'system');

-- 2. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  primary_currency TEXT NOT NULL DEFAULT 'USD',
  account_number TEXT NOT NULL UNIQUE,
  pin_hash TEXT,
  kyc_status public.kyc_status NOT NULL DEFAULT 'none',
  credit_score INTEGER NOT NULL DEFAULT 500,
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES auth.users(id),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. USER ROLES TABLE
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. SECURITY DEFINER FUNCTION FOR ROLE CHECK
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. WALLETS TABLE
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  available_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  pending_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency)
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. TRANSACTIONS TABLE
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type public.transaction_type NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  recipient_id UUID REFERENCES auth.users(id),
  reference TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_status ON public.transactions(status);

-- 8. KYC DOCUMENTS TABLE
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  selfie_url TEXT,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_kyc_documents_updated_at BEFORE UPDATE ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. BENEFICIARIES TABLE
CREATE TABLE public.beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  account_number TEXT,
  email TEXT,
  bank_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

-- 10. CARDS TABLE
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_number TEXT NOT NULL,
  card_holder TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  cvv TEXT NOT NULL,
  status public.card_status NOT NULL DEFAULT 'pending',
  spending_limit NUMERIC(18,2) DEFAULT 5000,
  online_payments BOOLEAN NOT NULL DEFAULT true,
  international_payments BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. LOANS TABLE
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  duration_months INTEGER NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  monthly_payment NUMERIC(18,2),
  total_repayment NUMERIC(18,2),
  amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
  status public.loan_status NOT NULL DEFAULT 'pending',
  next_payment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. SAVINGS GOALS TABLE
CREATE TABLE public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(18,2) NOT NULL,
  current_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 3.5,
  lock_period_months INTEGER NOT NULL DEFAULT 3,
  maturity_date DATE,
  is_matured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- 14. EXCHANGE RATES TABLE
CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC(18,6) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_currency, to_currency)
);
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- 15. BILL PAYMENTS TABLE
CREATE TABLE public.bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  provider TEXT NOT NULL,
  account_number TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

-- 16. REFERRALS TABLE
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bonus_amount NUMERIC(18,2) NOT NULL DEFAULT 5.00,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- USER ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- WALLETS
CREATE POLICY "Users can view own wallets" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallets" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all wallets" ON public.wallets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- TRANSACTIONS
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all transactions" ON public.transactions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- KYC DOCUMENTS
CREATE POLICY "Users can view own kyc" ON public.kyc_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kyc" ON public.kyc_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all kyc" ON public.kyc_documents FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all kyc" ON public.kyc_documents FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- BENEFICIARIES
CREATE POLICY "Users can manage own beneficiaries" ON public.beneficiaries FOR ALL USING (auth.uid() = user_id);

-- CARDS
CREATE POLICY "Users can view own cards" ON public.cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON public.cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON public.cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all cards" ON public.cards FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all cards" ON public.cards FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- LOANS
CREATE POLICY "Users can view own loans" ON public.loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own loans" ON public.loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all loans" ON public.loans FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all loans" ON public.loans FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- SAVINGS GOALS
CREATE POLICY "Users can manage own savings" ON public.savings_goals FOR ALL USING (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- EXCHANGE RATES (public read, admin write)
CREATE POLICY "Anyone can view exchange rates" ON public.exchange_rates FOR SELECT USING (true);
CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- BILL PAYMENTS
CREATE POLICY "Users can manage own bill payments" ON public.bill_payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all bill payments" ON public.bill_payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- REFERRALS
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Users can insert referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Generate unique 10-digit account number
CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  acc_num TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    acc_num := LPAD(FLOOR(RANDOM() * 10000000000)::BIGINT::TEXT, 10, '0');
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE account_number = acc_num) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN acc_num;
END;
$$;

-- Generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := 'CC' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- Auto-create profile + wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    NEW.id,
    user_name,
    NEW.email,
    user_country,
    user_currency,
    public.generate_account_number(),
    public.generate_referral_code()
  );

  INSERT INTO public.wallets (user_id, currency, available_balance, pending_balance)
  VALUES (NEW.id, user_currency, 0, 0);

  -- If admin email, grant admin role
  IF NEW.email = 'akanbidaniel360@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage buckets for KYC
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('deposit-proofs', 'deposit-proofs', false);

CREATE POLICY "Users can upload own kyc docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own kyc docs" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all kyc docs" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload deposit proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'deposit-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own deposit proofs" ON storage.objects FOR SELECT USING (bucket_id = 'deposit-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all deposit proofs" ON storage.objects FOR SELECT USING (bucket_id = 'deposit-proofs' AND public.has_role(auth.uid(), 'admin'));

-- Seed default exchange rates
INSERT INTO public.exchange_rates (from_currency, to_currency, rate) VALUES
  ('USD', 'NGN', 1550.00),
  ('USD', 'GBP', 0.79),
  ('USD', 'EUR', 0.92),
  ('NGN', 'USD', 0.000645),
  ('GBP', 'USD', 1.27),
  ('EUR', 'USD', 1.09),
  ('GBP', 'EUR', 1.16),
  ('EUR', 'GBP', 0.86),
  ('NGN', 'GBP', 0.000510),
  ('NGN', 'EUR', 0.000593),
  ('GBP', 'NGN', 1960.00),
  ('EUR', 'NGN', 1685.00);
