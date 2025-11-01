import { supabaseAdmin } from './supabase';

export async function logAudit({
  userId,
  method,
  path,
  status,
  ip,
  body,
  meta,
}: {
  userId?: string | null;
  method: string;
  path: string;
  status: number;
  ip?: string | null;
  body?: any;
  meta?: any;
}) {
  try {
    const payload = {
      user_id: userId || null,
      method,
      path,
      status,
      ip: ip || null,
      body: body ? JSON.stringify(body) : null,
      meta: meta ? JSON.stringify(meta) : null,
      created_at: new Date().toISOString(),
    };

    await supabaseAdmin.from('audit_logs').insert(payload);
  } catch (err) {
    console.error('[audit] Failed to insert audit log', err);
  }
}
