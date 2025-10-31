# Database Schema Documentation

This document describes the Supabase tables required for the Horizon fintech application.

## Tables Overview

### 1. `users` (Already exists)
Stores user authentication and profile information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  address1 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  date_of_birth DATE,
  ssn VARCHAR(50),
  dwolla_customer_url VARCHAR(500),
  dwolla_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### 2. `banks` (Already exists)
Stores Plaid-connected bank account information.

```sql
CREATE TABLE banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  access_token VARCHAR(500) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  funding_source_url VARCHAR(500),
  shareable_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### 3. `linked_accounts` (NEW - For international transfers)
Stores international bank accounts linked for Flutterwave, Paystack, OPay, Monnify transfers.

```sql
CREATE TABLE linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  provider VARCHAR(50) NOT NULL, -- 'flutterwave', 'paystack', 'opay', 'monnify'
  account_number VARCHAR(50) NOT NULL,
  bank_code VARCHAR(20) NOT NULL,
  bank_name VARCHAR(255),
  account_name VARCHAR(255),
  country VARCHAR(2) DEFAULT 'NG',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, provider, account_number)
);
```

### 4. `transfers` (NEW - For transfer status tracking)
Stores transfer records with status tracking.

```sql
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL, -- 'dwolla', 'flutterwave', 'paystack', 'opay', 'monnify'
  amount DECIMAL(15, 2) NOT NULL,
  sender_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  status_message TEXT,
  reference VARCHAR(255) UNIQUE,
  external_transfer_id VARCHAR(255), -- ID from payment provider
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);
```

### 5. `transactions` (Already exists)
Stores transaction history for all transfers.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  sender_id UUID NOT NULL REFERENCES users(id),
  sender_bank_id UUID REFERENCES banks(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  receiver_bank_id UUID REFERENCES banks(id),
  email VARCHAR(255),
  provider VARCHAR(50), -- 'dwolla', 'flutterwave', 'paystack', 'opay', 'monnify'
  transfer_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT now()
);
```

## Migration Instructions

To apply these schemas to your Supabase database:

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to SQL Editor
4. Create a new query
5. Run the SQL statements above
6. Enable RLS (Row Level Security) as needed

## Relationships

```
users
├── banks (1:N) - Plaid-connected US bank accounts
├── linked_accounts (1:N) - International bank accounts
├── transfers (1:N as sender_id and receiver_id) - Transfer records
└── transactions (1:N) - Transaction history
```

## Indexes to Create

For better performance:

```sql
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_banks_user_id ON banks(user_id);
CREATE INDEX idx_linked_accounts_user_id ON linked_accounts(user_id);
CREATE INDEX idx_linked_accounts_provider ON linked_accounts(provider);
CREATE INDEX idx_transfers_sender_id ON transfers(sender_id);
CREATE INDEX idx_transfers_receiver_id ON transfers(receiver_id);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_reference ON transfers(reference);
CREATE INDEX idx_transactions_sender_id ON transactions(sender_id);
CREATE INDEX idx_transactions_receiver_id ON transactions(receiver_id);
CREATE INDEX idx_transactions_provider ON transactions(provider);
```

## Notes

- All tables use UUID for primary keys
- Timestamps are UTC
- The `linked_accounts` table is crucial for international transfers
- The `transfers` table tracks all transfer status changes
- RLS policies should be configured to ensure users can only access their own data
