import { createClient } from '@supabase/supabase-js';

// Single Supabase client instance for the entire frontend.
// Import this everywhere instead of calling createClient() directly.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jexipkocsmrqdzomqddy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGlwa29jc21ycWR6b21xZGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDg4OTUsImV4cCI6MjA4NTA4NDg5NX0.un6HrQOPFwsLnkQt1MC9SuhPC5bB49y-cY-RtTUx344';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,        // Keep session across page reloads
        autoRefreshToken: true,      // Auto-refresh before token expiry (~1h)
        detectSessionInUrl: true     // Pick up OAuth tokens from URL hash
    }
});
