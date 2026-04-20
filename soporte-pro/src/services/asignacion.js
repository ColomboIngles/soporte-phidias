import { supabase } from "./supabase";

export async function obtenerTecnicos() {
    const { data, error } = await supabase
        .from("usuarios")
        .select("id, nombre, email, rol")
        .eq("rol", "tecnico")
        .order("nombre", { ascending: true });

    if (error) {
        throw error;
    }

    return data || [];
}

export function resolverNombreTecnico(tecnicos, tecnicoId) {
    if (!tecnicoId) {
        return "Sin asignar";
    }

    const tecnico = tecnicos.find((item) => item.id === tecnicoId);
    return tecnico?.nombre || tecnico?.email || "Técnico";
}

export function elegirTecnicoConMenosTickets(tickets, tecnicos) {
    if (!tecnicos.length) {
        return null;
    }

    const cargaPorTecnico = tecnicos.map((tecnico) => {
        const ticketsActivos = tickets.filter((ticket) => {
            if (ticket.asignado_a !== tecnico.id) return false;
            return ticket.estado !== "cerrado";
        }).length;

        return {
            ...tecnico,
            ticketsActivos,
        };
    });

    cargaPorTecnico.sort((a, b) => {
        if (a.ticketsActivos !== b.ticketsActivos) {
            return a.ticketsActivos - b.ticketsActivos;
        }

        return (a.nombre || a.email || "").localeCompare(b.nombre || b.email || "");
    });

    return cargaPorTecnico[0] || null;
}
