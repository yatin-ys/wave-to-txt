import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

// Helper function to get redirect URL
export const getRedirectUrl = () => {
  return import.meta.env.VITE_AUTH_REDIRECT_URL || window.location.origin;
};

// Check if Google auth is enabled
export const isGoogleAuthEnabled = () => {
  return import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true";
};
