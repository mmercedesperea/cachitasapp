import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

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
