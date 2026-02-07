import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// SOTA Supabase Client with Graceful Degradation
// =============================================================================
// This client safely handles the case where Supabase environment variables
// are not configured (e.g., Cloudflare Pages deployments without Supabase).
// The app will function in "offline mode" using only localStorage persistence.
// =============================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

// Validate Supabase configuration
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.')
);

// Create a type-safe nullable client
let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'wp-content-optimizer-pro',
        },
      },
    });
    console.log('[Supabase] ✓ Client initialized successfully');
  } catch (error) {
    console.error('[Supabase] ✗ Failed to initialize client:', error);
    supabaseInstance = null;
  }
} else {
  console.info('[Supabase] ℹ Running in offline mode (no Supabase configured)');
  if (supabaseUrl || supabaseAnonKey) {
    console.warn('[Supabase] ⚠ Partial configuration detected but invalid:');
    if (!supabaseUrl) console.warn('  - VITE_SUPABASE_URL is missing');
    if (!supabaseAnonKey) console.warn('  - VITE_SUPABASE_ANON_KEY is missing');
    if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
      console.warn('  - VITE_SUPABASE_URL must start with https://');
    }
  }
}

// Export the client (may be null if not configured)
export const supabase = supabaseInstance;

// Helper function to safely execute Supabase operations
export async function withSupabase<T>(
  operation: (client: SupabaseClient) => Promise<T>,
  fallback: T
): Promise<T> {
  if (!supabaseInstance) {
    return fallback;
  }
  try {
    return await operation(supabaseInstance);
  } catch (error) {
    console.error('[Supabase] Operation failed:', error);
    return fallback;
  }
}
