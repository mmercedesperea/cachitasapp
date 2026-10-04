import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

function checkKeySecurity(key: string) {
  if (!key || key === 'placeholder-key') return;
  const isSecretKey =
    key.startsWith('sbp_') ||
    key.startsWith('sb_sk_') ||
    key.includes('service_role');

  let isServiceRoleJwt = false;
  try {
    const parts = key.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.role === 'service_role') {
        isServiceRoleJwt = true;
      }
    }
  } catch {
    // Ignore invalid JWT parsing
  }

  if (isSecretKey || isServiceRoleJwt) {
    console.error(
      '[Supabase Security Error] You are using a secret API key or service_role key in VITE_SUPABASE_ANON_KEY!\n' +
      'Secret keys bypass RLS and must NEVER be exposed in browser/client applications.\n' +
      'Please replace VITE_SUPABASE_ANON_KEY with your public "anon" key from Supabase Dashboard -> Project Settings -> API.'
    );
  }
}

checkKeySecurity(supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: (...args) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1200); // 1.2s timeout for network call
      const options = args[1] || {};
      return fetch(args[0], { ...options, signal: controller.signal })
        .finally(() => clearTimeout(id));
    }
  }
});
