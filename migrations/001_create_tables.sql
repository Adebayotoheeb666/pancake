-- Create users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address1 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  date_of_birth TEXT,
  ssn TEXT,
  dwolla_customer_id TEXT,
  dwolla_customer_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create banks table
CREATE TABLE public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bank_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  funding_source_url TEXT,
  shareable_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  sender_id UUID REFERENCES public.users(id),
  sender_bank_id UUID REFERENCES public.banks(id),
  receiver_id UUID REFERENCES public.users(id),
  receiver_bank_id UUID REFERENCES public.banks(id),
  email TEXT,
  payment_channel TEXT,
  type TEXT,
  category TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_banks_user_id ON public.banks(user_id);
CREATE INDEX idx_banks_account_id ON public.banks(account_id);
CREATE INDEX idx_transactions_sender_id ON public.transactions(sender_id);
CREATE INDEX idx_transactions_receiver_id ON public.transactions(receiver_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Create RLS policies for banks table
CREATE POLICY "Users can view their own banks" ON public.banks
  FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own banks" ON public.banks
  FOR UPDATE USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- Create RLS policies for transactions table
CREATE POLICY "Users can view transactions involving them" ON public.transactions
  FOR SELECT USING (
    sender_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );
