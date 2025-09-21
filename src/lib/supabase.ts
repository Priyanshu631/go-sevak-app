import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Add a check to ensure your environment variables are loaded
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase URL and Key must be provided!');
}

// Create a single, exportable Supabase client with persistence configured
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  // NEW: Add a storage adapter to persist sessions
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});