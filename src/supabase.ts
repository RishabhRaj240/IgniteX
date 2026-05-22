import { createClient } from "@supabase/supabase-js";

// Fallback placeholders prevent createClient from throwing when env vars are
// missing (e.g. on Vercel before you add the env vars in Project Settings).
// The app will still render — Supabase features will just be inactive.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ukhmtvgamisrgnbqegyx.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVraG10dmdhbWlzcmduYnFlZ3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMzg1OTAsImV4cCI6MjA5NDkxNDU5MH0.32AtInlIrmwMRYLvmdSGPZx2R3pEz57_5SdzaNkseRs";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "[IgniteX] Supabase env vars are missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). " +
    "Add them in Vercel → Project Settings → Environment Variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    console.error("Error signing in with Google:", error.message);
    throw error;
  }
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out:", error.message);
    throw error;
  }
}
