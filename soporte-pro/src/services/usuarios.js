import { supabase } from "./supabase";

export async function crearUsuarioSiNoExiste(user) {
    const { data } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!data) {
        await supabase.from("usuarios").insert([
            {
                id: user.id,
                email: user.email,
                nombre: user.email,
                rol: "usuario",
            },
        ]);
    }
}

export async function obtenerRol(userId) {
    const { data } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", userId)
        .single();

    return data?.rol || "usuario";
}