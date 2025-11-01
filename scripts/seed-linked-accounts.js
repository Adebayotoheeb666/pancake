#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

(async () => {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_SUPABASE_SERVICE_ROLE_KEY are set.');
      process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const provider = process.env.REAL_PROVIDER || 'flutterwave';
    const senderAccountName = `ci-test-sender-${provider}`;
    const receiverAccountName = `ci-test-receiver-${provider}`;
    const senderUserId = process.env.REAL_SEED_USER_ID || `ci-user-${Date.now()}`;

    // Look for existing seeded accounts
    const { data: existingSender } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('account_name', senderAccountName)
      .limit(1)
      .maybeSingle();

    const { data: existingReceiver } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('account_name', receiverAccountName)
      .limit(1)
      .maybeSingle();

    let senderId = existingSender?.id;
    let receiverId = existingReceiver?.id;

    if (!senderId) {
      const rawAccount = `000${Math.floor(Math.random() * 9000) + 1000}`;
      const encAccount = process.env.ENCRYPTION_KEY ? Buffer.from(rawAccount).toString('base64') : rawAccount;
      const insert = {
        user_id: senderUserId,
        provider: provider,
        bank_name: `${provider}-bank`,
        account_number: encAccount,
        account_name: senderAccountName,
        bank_code: '000',
        country: 'NG',
        metadata: { ci: true },
      };
      const { data, error } = await supabase.from('linked_accounts').insert(insert).select().single();
      if (error) {
        console.error('Error inserting sender linked_account:', error);
        process.exit(1);
      }
      senderId = data.id;
    }

    if (!receiverId) {
      const insert = {
        user_id: `ci-receiver-${Date.now()}`,
        provider: provider,
        bank_name: `${provider}-bank`,
        account_number: `000${Math.floor(Math.random() * 9000) + 1000}`,
        account_name: receiverAccountName,
        bank_code: '000',
        country: 'NG',
        metadata: { ci: true },
      };
      const { data, error } = await supabase.from('linked_accounts').insert(insert).select().single();
      if (error) {
        console.error('Error inserting receiver linked_account:', error);
        process.exit(1);
      }
      receiverId = data.id;
    }

    // Output env vars lines for GitHub Actions
    console.log(`REAL_SENDER_LINKED_ACCOUNT_ID=${senderId}`);
    console.log(`REAL_RECEIVER_LINKED_ACCOUNT_ID=${receiverId}`);
    console.log(`REAL_SENDER_USER_ID=${senderUserId}`);
    console.log(`REAL_PROVIDER=${provider}`);

    process.exit(0);
  } catch (err) {
    console.error('Seed script failed:', err);
    process.exit(1);
  }
})();
