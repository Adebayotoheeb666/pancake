-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Enum types (create only if missing)
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_category') THEN
   CREATE TYPE transaction_category AS ENUM (
     'Food and Drink',
     'Travel',
     'Transfer',
     'Payment',
     'Bank Fees',
     'Processing',
     'Success',
     'Other'
   );
 END IF;

 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_channel') THEN
   CREATE TYPE transfer_channel AS ENUM ('online', 'ach');
 END IF;

 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bank_provider') THEN
   CREATE TYPE bank_provider AS ENUM (
     'plaid',
     'flutterwave',
     'paystack',
     'opay',
     'monnify'
   );
 END IF;

 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'country_code') THEN
   CREATE TYPE country_code AS ENUM (
     'US',
     'NG',
     'GH',
     'KE'
   );
 END IF;
END$$;

-- 3) Users table
CREATE TABLE IF NOT EXISTS public.users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 auth_user_id uuid UNIQUE, -- Supabase auth UID
 email text UNIQUE NOT NULL,
 first_name text,
 last_name text,
 address1 text,
 city text,
 state text,
 postal_code text,
 date_of_birth date,
 ssn text,
 dwolla_customer_id text,
 dwolla_customer_url text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Banks table (for Plaid/Dwolla integration)
CREATE TABLE IF NOT EXISTS public.banks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 bank_id text,
 account_id text,
 access_token text,
 funding_source_url text,
 shareable_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Linked Accounts table (for multi-provider integration: Flutterwave, Paystack, Opay, Monnify)
CREATE TABLE IF NOT EXISTS public.linked_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 provider bank_provider NOT NULL,
 bank_name text NOT NULL,
 account_number text NOT NULL,
 account_name text NOT NULL,
 country country_code NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, provider, account_number)
);

-- 6) Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text,
 amount numeric(12,2) NOT NULL,
 channel transfer_channel NOT NULL DEFAULT 'online',
 category transaction_category NOT NULL DEFAULT 'Other',
 sender_id uuid REFERENCES public.users(id),
 receiver_id uuid REFERENCES public.users(id),
 sender_bank_id uuid REFERENCES public.banks(id),
 receiver_bank_id uuid REFERENCES public.banks(id),
 email text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7) Indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_banks_user_id ON public.banks (user_id);
CREATE INDEX IF NOT EXISTS idx_banks_account_id ON public.banks (account_id);
CREATE INDEX IF NOT EXISTS idx_banks_shareable_id ON public.banks (shareable_id);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_id ON public.linked_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_provider ON public.linked_accounts (provider);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_country ON public.linked_accounts (country);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_provider ON public.linked_accounts (user_id, provider);
CREATE INDEX IF NOT EXISTS idx_transactions_sender_bank_id ON public.transactions (sender_bank_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_bank_id ON public.transactions (receiver_bank_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sender_id ON public.transactions (sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_id ON public.transactions (receiver_id);

-- 8) Timestamp trigger function
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.updated_at := now();
 IF TG_OP = 'INSERT' THEN
   NEW.created_at := now();
 END IF;
 RETURN NEW;
END;
$$;

-- attach timestamp trigger to tables
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_users') THEN
   CREATE TRIGGER set_timestamp_users
     BEFORE INSERT OR UPDATE ON public.users
     FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_banks') THEN
   CREATE TRIGGER set_timestamp_banks
     BEFORE INSERT OR UPDATE ON public.banks
     FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_linked_accounts') THEN
   CREATE TRIGGER set_timestamp_linked_accounts
     BEFORE INSERT OR UPDATE ON public.linked_accounts
     FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_transactions') THEN
   CREATE TRIGGER set_timestamp_transactions
     BEFORE INSERT OR UPDATE ON public.transactions
     FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();
 END IF;
END$$;

-- 9) Shareable ID generator and trigger
CREATE OR REPLACE FUNCTION public.generate_shareable_id(p_account_id text)
RETURNS text LANGUAGE sql STABLE AS $$
 SELECT encode(digest(p_account_id::text, 'sha256'), 'hex')::text;
$$;

CREATE OR REPLACE FUNCTION public.set_bank_shareable_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.shareable_id IS NULL OR NEW.shareable_id = '' THEN
   NEW.shareable_id := public.generate_shareable_id(NEW.account_id);
 END IF;
 RETURN NEW;
END;
$$;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_shareable_id_on_banks') THEN
   CREATE TRIGGER set_shareable_id_on_banks
     BEFORE INSERT OR UPDATE ON public.banks
     FOR EACH ROW EXECUTE FUNCTION public.set_bank_shareable_id();
 END IF;
END$$;

-- 10) Prevent self-transfer trigger (optional safety)
CREATE OR REPLACE FUNCTION public.prevent_self_transfer()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
   IF NEW.sender_bank_id IS NOT NULL AND NEW.receiver_bank_id IS NOT NULL AND NEW.sender_bank_id = NEW.receiver_bank_id THEN
     RAISE EXCEPTION 'Sender and receiver bank must differ';
   END IF;
 END IF;
 RETURN NEW;
END;
$$;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_self_transfer') THEN
   CREATE TRIGGER trg_prevent_self_transfer
     BEFORE INSERT ON public.transactions
     FOR EACH ROW EXECUTE FUNCTION public.prevent_self_transfer();
 END IF;
END$$;

-- 11) Constraint: amount non-negative
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint WHERE conname = 'transactions_amount_positive'
 ) THEN
   ALTER TABLE public.transactions
     ADD CONSTRAINT transactions_amount_positive CHECK (amount >= 0);
 END IF;
END$$;

-- 12) Row-Level Security enablement
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 13) Policies: create conditionally (safe to run multiple times)
-- users: insert, select, update
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'users_insert_own' AND n.nspname = 'public' AND c.relname = 'users'
 ) THEN
   CREATE POLICY users_insert_own
     ON public.users
     FOR INSERT
     WITH CHECK (auth_user_id = auth.uid());
 END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'users_select_own' AND n.nspname = 'public' AND c.relname = 'users'
 ) THEN
   CREATE POLICY users_select_own
     ON public.users
     FOR SELECT
     USING (auth_user_id = auth.uid());
 END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'users_update_own' AND n.nspname = 'public' AND c.relname = 'users'
 ) THEN
   CREATE POLICY users_update_own
     ON public.users
     FOR UPDATE
     USING (auth_user_id = auth.uid())
     WITH CHECK (auth_user_id = auth.uid());
 END IF;
END$$;

-- banks: select, insert, update, delete
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'banks_select_owner' AND n.nspname = 'public' AND c.relname = 'banks'
 ) THEN
   CREATE POLICY banks_select_owner
     ON public.banks
     FOR SELECT
     USING (user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
 END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'banks_insert_owner' AND n.nspname = 'public' AND c.relname = 'banks'
 ) THEN
   CREATE POLICY banks_insert_owner
     ON public.banks
     FOR INSERT
     WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
 END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'banks_update_owner' AND n.nspname = 'public' AND c.relname = 'banks'
 ) THEN
   CREATE POLICY banks_update_owner
     ON public.banks
     FOR UPDATE
     USING (user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
     WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
 END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'banks_delete_owner' AND n.nspname = 'public' AND c.relname = 'banks'
 ) THEN
   CREATE POLICY banks_delete_owner
     ON public.banks
     FOR DELETE
     USING (user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
 END IF;
END$$;

-- linked_accounts: select, insert, update, delete
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'linked_accounts_select_owner' AND n.nspname = 'public' AND c.relname = 'linked_accounts'
 ) THEN
   CREATE POLICY linked_accounts_select_owner
     ON public.linked_accounts
     FOR SELECT
     USING (user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
 END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'linked_accounts_insert_owner' AND n.nspname = 'public' AND c.relname = 'linked_accounts'
 ) THEN
   CREATE POLICY linked_accounts_insert_owner
     ON public.linked_accounts
     FOR INSERT
     WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
 END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'linked_accounts_update_owner' AND n.nspname = 'public' AND c.relname = 'linked_accounts'
 ) THEN
   CREATE POLICY linked_accounts_update_owner
     ON public.linked_accounts
     FOR UPDATE
     USING (user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
     WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
 END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'linked_accounts_delete_owner' AND n.nspname = 'public' AND c.relname = 'linked_accounts'
 ) THEN
   CREATE POLICY linked_accounts_delete_owner
     ON public.linked_accounts
     FOR DELETE
     USING (user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
 END IF;
END$$;

-- transactions: select, insert, update
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'transactions_select_owner' AND n.nspname = 'public' AND c.relname = 'transactions'
 ) THEN
   CREATE POLICY transactions_select_owner
     ON public.transactions
     FOR SELECT
     USING (
       sender_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
       OR receiver_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
     );
 END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'transactions_insert_owner' AND n.nspname = 'public' AND c.relname = 'transactions'
 ) THEN
   CREATE POLICY transactions_insert_owner
     ON public.transactions
     FOR INSERT
     WITH CHECK (
       sender_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
       OR receiver_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
     );
 END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_policy p
   JOIN pg_class c ON p.polrelid = c.oid
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE p.polname = 'transactions_update_owner' AND n.nspname = 'public' AND c.relname = 'transactions'
 ) THEN
   CREATE POLICY transactions_update_owner
     ON public.transactions
     FOR UPDATE
     USING (
       sender_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
       OR receiver_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
     )
     WITH CHECK (
       sender_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
       OR receiver_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
     );
 END IF;
END$$;

-- 14) Public view (no sensitive fields)
CREATE OR REPLACE VIEW public.user_public AS
SELECT
 id,
 auth_user_id,
 email,
 first_name,
 last_name,
 address1,
 city,
 state,
 postal_code,
 date_of_birth,
 dwolla_customer_id,
 dwolla_customer_url,
 created_at,
 updated_at
FROM public.users;

-- 15) Linked Accounts view for users
CREATE OR REPLACE VIEW public.user_linked_accounts AS
SELECT
 id,
 user_id,
 provider,
 bank_name,
 account_name,
 country,
 created_at,
 updated_at
FROM public.linked_accounts
WHERE user_id = auth.uid();

-- End of script
