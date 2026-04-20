import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://dvvcfgfklvgjlaqauaul.supabase.co";
const fallbackSupabaseAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmNmZ2ZrbHZnamxhcWF1YXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjQ5ODEsImV4cCI6MjA5MTg0MDk4MX0.Ehl_dCLMeyKqewvm2xXQZdzZt7IcDbhaisdwD_QUJXQ";

export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl,
    import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey
);
