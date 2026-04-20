import { supabase } from "./supabase";

export async function getCurrentUser() {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
}

export function getRole(user) {
    return user?.user_metadata?.role || "user";
}