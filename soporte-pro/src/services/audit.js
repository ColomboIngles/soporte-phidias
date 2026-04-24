import { supabase } from "./supabase";

function normalizarUsuario(usuario) {
    if (!usuario) return "Sistema";
    if (typeof usuario === "string") return usuario;

    return usuario.email || usuario.user_metadata?.name || usuario.id || "Sistema";
}

export async function registrarAuditoria({
    usuario,
    accion,
    ticketId,
    fecha = new Date().toISOString(),
}) {
    const payload = {
        usuario: normalizarUsuario(usuario),
        accion,
        ticket_id: ticketId,
        created_at: fecha,
    };

    const { error } = await supabase.from("auditoria").insert([payload]);

    if (error) {
        throw error;
    }

    return payload;
}

export async function obtenerAuditoria() {
    const { data, error } = await supabase
        .from("auditoria")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }

    return data || [];
}
