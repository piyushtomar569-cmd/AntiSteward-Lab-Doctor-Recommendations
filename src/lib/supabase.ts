import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.SUPABASE_URL ?? '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY ?? '';

// Fallback to valid URL structure so createClient never throws an initialization error
const supabaseUrl = rawUrl.trim() || 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey.trim() || 'placeholder-anon-key';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    rawUrl &&
    rawKey &&
    !rawUrl.includes('placeholder') &&
    !rawUrl.includes('fvpvacksncovoverneaw')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
