import { createClient, SupabaseClient } from '@supabase/supabase-js';

type SupabaseConfigSource = 'env' | 'runtime' | 'none';

export type SupabaseRuntimeConfig = {
  url: string;
  anonKey: string;
};

const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const RUNTIME_STORAGE_KEY = 'supabase_runtime_config_v1';

function readRuntimeConfig(): SupabaseRuntimeConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(RUNTIME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const url = typeof parsed?.url === 'string' ? parsed.url.trim() : '';
    const anonKey = typeof parsed?.anonKey === 'string' ? parsed.anonKey.trim() : '';
    if (!url || !anonKey) return null;
    return { url, anonKey };
  } catch {
    return null;
  }
}

function getEffectiveConfig(): { url: string; anonKey: string; source: SupabaseConfigSource } | null {
  if (ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY) {
    return { url: ENV_SUPABASE_URL, anonKey: ENV_SUPABASE_ANON_KEY, source: 'env' };
  }
  const runtime = readRuntimeConfig();
  if (runtime) return { ...runtime, source: 'runtime' };
  return null;
}

export let supabase: SupabaseClient | null = null;
let supabaseSource: SupabaseConfigSource = 'none';

function initSupabaseClient() {
  const cfg = getEffectiveConfig();
  if (!cfg) {
    supabase = null;
    supabaseSource = 'none';
    return;
  }

  supabase = createClient(cfg.url, cfg.anonKey);
  supabaseSource = cfg.source;
}

// Initialize immediately (and again after runtime config updates)
initSupabaseClient();

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => !!supabase;

export const getSupabaseConfigSource = (): SupabaseConfigSource => supabaseSource;

// Get Supabase URL for direct function calls (fallback)
export const getSupabaseUrl = (): string | null => {
  return getEffectiveConfig()?.url ?? null;
};

export const getSupabaseAnonKey = (): string | null => {
  return getEffectiveConfig()?.anonKey ?? null;
};

export const setSupabaseRuntimeConfig = (config: SupabaseRuntimeConfig) => {
  if (typeof window === 'undefined') return;
  const url = String(config.url ?? '').trim();
  const anonKey = String(config.anonKey ?? '').trim();
  if (!url || !anonKey) return;

  window.localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify({ url, anonKey }));
  initSupabaseClient();
};

export const clearSupabaseRuntimeConfig = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(RUNTIME_STORAGE_KEY);
  initSupabaseClient();
};
