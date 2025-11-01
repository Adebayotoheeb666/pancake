#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

(async () => {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
    const RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE env vars.');
      process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Deleting audit logs older than ${cutoff}`);

    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoff);

    if (error) {
      console.error('Error deleting audit logs:', error);
      process.exit(1);
    }

    console.log('Cleanup completed');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup script failed', err);
    process.exit(1);
  }
})();
