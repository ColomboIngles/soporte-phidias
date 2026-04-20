import { supabase } from "./supabase";

export async function crearNotificacion(usuario, mensaje) {
    await supabase.from("notificaciones").insert([
        {
            usuario,
            mensaje,
        },
    ]);
}