import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    "https://dvvcfgfklvgjlaqauaul.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dmNmZ2ZrbHZnamxhcWF1YXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjQ5ODEsImV4cCI6MjA5MTg0MDk4MX0.Ehl_dCLMeyKqewvm2xXQZdzZt7IcDbhaisdwD_QUJXQ"
);