import { useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import API from "../services/api";
import { useToast } from "../hooks/useToast";
import { registrarAuditoria } from "../services/audit";
import {
    elegirTecnicoConMenosTickets,
    obtenerTecnicos,
    resolverNombreTecnico,
} from "../services/asignacion";
import Skeleton from "../components/skeleton";
import EmptyState from "../components/EmptyState";
import {
    canCreateTickets,
    isAdminRole,
    isEndUserRole,
    isStaffRole,
} from "../utils/permissions";

function formatTicketDate(value) {
    if (!value) return "Sin fecha";

    return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

export default function Tickets({ role }) {
    const [tickets, setTickets] = useState([]);
    const [filtro, setFiltro] = useState("todos");
    const [user, setUser] = useState(null);
    const [tecnicos, setTecnicos] = useState([]);
    const [asignandoId, setAsignandoId] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const canCreateTicket = canCreateTickets(role);
    const isAdmin = isAdminRole(role);
    const isEndUser = isEndUserRole(role);
    const showInternalMetrics = isStaffRole(role);

    useEffect(() => {
        async function obtenerUsuario() {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        }

        async function cargarTecnicos() {
            try {
                const data = await obtenerTecnicos();
                setTecnicos(data);
            } catch {
                setTecnicos([]);
            }
        }

        obtenerUsuario();
        cargarTecnicos();
    }, []);

    useEffect(() => {
        if (!user) return undefined;

        async function cargar() {
            setLoading(true);
            let query = supabase.from("tickets").select("*");

            if (role === "usuario") {
                query = query.eq("email", user.email);
            }

            if (role === "tecnico") {
                query = query.eq("asignado_a", user.id);
            }

            const { data } = await query.order("created_at", {
                ascending: false,
            });

            setTickets(data || []);
            setLoading(false);
        }

        cargar();

        const ticketsChannel = supabase
            .channel("tickets-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tickets" },
                () => cargar()
            )
            .subscribe();

        const usuariosChannel = supabase
            .channel("tickets-tecnicos")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "usuarios" },
                async () => {
                    const data = await obtenerTecnicos();
                    setTecnicos(data);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ticketsChannel);
            supabase.removeChannel(usuariosChannel);
        };
    }, [role, user]);

    async function cerrar(ticket) {
        try {
            await API.put(`/tickets/${ticket.id}`, {
                estado: "cerrado",
            });

            await registrarAuditoria({
                usuario: user,
                accion: "cerrar",
                ticketId: ticket.id,
            });

            showToast({
                type: "success",
                title: "Ticket cerrado",
                message: `“${ticket.titulo}” quedó marcado como cerrado.`,
            });
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo cerrar el ticket",
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Intenta nuevamente en unos segundos.",
            });
        }
    }

    async function eliminar(ticket) {
        if (!confirm("¿Eliminar ticket?")) {
            showToast({
                type: "info",
                title: "Eliminación cancelada",
                message: "El ticket se mantuvo sin cambios.",
                duration: 2600,
            });
            return;
        }

        try {
            await API.delete(`/tickets/${ticket.id}`);

            await registrarAuditoria({
                usuario: user,
                accion: "eliminar",
                ticketId: ticket.id,
            });

            showToast({
                type: "success",
                title: "Ticket eliminado",
                message: `“${ticket.titulo}” salió del tablero correctamente.`,
            });
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo eliminar el ticket",
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Verifica tu conexión e intenta otra vez.",
            });
        }
    }

    async function actualizarAsignacion(ticket, tecnicoId) {
        setAsignandoId(ticket.id);

        try {
            await API.put(`/tickets/${ticket.id}`, {
                asignado_a: tecnicoId || null,
            });

            const nombreTecnico = resolverNombreTecnico(tecnicos, tecnicoId);

            showToast({
                type: "success",
                title: tecnicoId ? "Técnico asignado" : "Asignación removida",
                message: tecnicoId
                    ? `“${ticket.titulo}” ahora pertenece a ${nombreTecnico}.`
                    : `“${ticket.titulo}” quedó pendiente de asignación.`,
            });
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo actualizar la asignación",
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Intenta nuevamente en unos segundos.",
            });
        } finally {
            setAsignandoId(null);
        }
    }

    async function autoAsignar(ticket) {
        const tecnico = elegirTecnicoConMenosTickets(tickets, tecnicos);

        if (!tecnico) {
            showToast({
                type: "info",
                title: "No hay técnicos disponibles",
                message: "Crea o habilita usuarios con rol técnico para usar autoasignación.",
            });
            return;
        }

        await actualizarAsignacion(ticket, tecnico.id);
    }

    function getSLAColor(ticket) {
        const ahora = new Date();
        const creado = new Date(ticket.created_at);
        const horas = (ahora - creado) / (1000 * 60 * 60);

        if (horas > ticket.tiempo_resolucion) return "bg-red-500";
        if (horas > ticket.tiempo_respuesta) return "bg-yellow-400";
        return "bg-green-500";
    }

    const filtrados = useMemo(
        () =>
            filtro === "todos"
                ? tickets
                : tickets.filter((ticket) => ticket.estado === filtro),
        [filtro, tickets]
    );

    if (loading) {
        return <Skeleton variant="table" />;
    }

    return (
        <div className="space-y-6 p-6">
            <section className="glass-panel rounded-[2rem] p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                            <ClipboardList className="h-3.5 w-3.5" />
                            {isEndUser ? "Seguimiento personal" : "Operación tickets"}
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                            Tickets
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            {isEndUser
                                ? "Crea solicitudes, consulta el estado de cada caso y mantén la conversación con soporte desde un solo flujo."
                                : "Gestiona soporte con mejor visibilidad, asignación y acciones rápidas."}
                        </p>
                    </div>

                    {canCreateTicket && (
                        <button
                            onClick={() => navigate("/tickets/nuevo")}
                            className="rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(56,189,248,0.28)] transition hover:-translate-y-0.5"
                        >
                            + Nuevo Ticket
                        </button>
                    )}
                </div>
            </section>

            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    {isEndUser
                        ? "Sigue tus tickets activos, en proceso o cerrados."
                        : "Filtra y administra el backlog operativo."}
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {["todos", "abierto", "en_proceso", "cerrado"].map((item) => (
                    <button
                        key={item}
                        onClick={() => setFiltro(item)}
                        className={`rounded-xl px-4 py-2 text-sm capitalize ${
                            filtro === item
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-200 dark:bg-gray-800"
                        }`}
                    >
                        {item.replace("_", " ")}
                    </button>
                ))}
            </div>

            <div className="glass-panel overflow-hidden rounded-[2rem]">
                {filtrados.length === 0 ? (
                    <div className="p-5">
                        <EmptyState
                            icon={ClipboardList}
                            compact
                            title="Sin tickets en esta vista"
                            description={
                                isEndUser
                                    ? "Todavía no tienes tickets en este estado. Cuando abras uno nuevo podrás seguirlo desde aquí."
                                    : "Ajusta los filtros o crea un nuevo ticket para empezar a trabajar sobre el flujo de soporte."
                            }
                            action={
                                canCreateTicket ? (
                                    <button
                                        onClick={() => navigate("/tickets/nuevo")}
                                        className="rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(56,189,248,0.28)] transition hover:-translate-y-0.5"
                                    >
                                        Crear ticket
                                    </button>
                                ) : null
                            }
                        />
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-white/[0.06] text-slate-300">
                            <tr>
                                <th className="p-4 text-left">Título</th>
                                <th>Estado</th>
                                <th>Prioridad</th>
                                <th>{isEndUser ? "Responsable" : "Técnico"}</th>
                                {showInternalMetrics && <th>SLA</th>}
                                <th>{isEndUser ? "Actualización" : "Fecha"}</th>
                                {isAdmin && <th>Acciones</th>}
                            </tr>
                        </thead>

                        <tbody>
                            {filtrados.map((ticket) => (
                                <tr
                                    key={ticket.id}
                                    className="border-t border-white/10 bg-slate-950/20 hover:bg-white/[0.04]"
                                >
                                    <td
                                        className="cursor-pointer p-4 font-medium"
                                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                                    >
                                        {ticket.titulo}
                                    </td>

                                    <td className="capitalize">
                                        {ticket.estado.replace("_", " ")}
                                    </td>

                                    <td className="capitalize">{ticket.prioridad}</td>

                                    <td>
                                        {isAdmin ? (
                                            <div className="min-w-[190px] space-y-2">
                                                <div className="rounded-xl border border-white/10 bg-white/[0.05] p-1">
                                                    <select
                                                        value={ticket.asignado_a || ""}
                                                        onChange={(event) =>
                                                            actualizarAsignacion(ticket, event.target.value)
                                                        }
                                                        disabled={asignandoId === ticket.id}
                                                        className="w-full rounded-lg bg-transparent px-2 py-1.5 text-xs outline-none"
                                                    >
                                                        <option value="">Sin asignar</option>
                                                        {tecnicos.map((tecnico) => (
                                                            <option key={tecnico.id} value={tecnico.id}>
                                                                {tecnico.nombre || tecnico.email}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="text-[11px] text-slate-500">
                                                    {resolverNombreTecnico(tecnicos, ticket.asignado_a)}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-300">
                                                {resolverNombreTecnico(tecnicos, ticket.asignado_a)}
                                            </span>
                                        )}
                                    </td>

                                    {showInternalMetrics && (
                                        <td>
                                            <span
                                                className={`inline-block h-3 w-3 rounded-full ${getSLAColor(
                                                    ticket
                                                )}`}
                                            />
                                        </td>
                                    )}

                                    <td>{formatTicketDate(ticket.updated_at || ticket.created_at)}</td>

                                    {isAdmin && (
                                        <td className="space-x-2">
                                            <button
                                                onClick={() => autoAsignar(ticket)}
                                                className="rounded-lg bg-sky-500/15 px-2 py-1 text-xs font-medium text-sky-200 transition hover:bg-sky-500/25"
                                            >
                                                Auto
                                            </button>

                                            <button
                                                onClick={() => cerrar(ticket)}
                                                className="text-green-600 hover:scale-110"
                                            >
                                                ✔
                                            </button>

                                            <button
                                                onClick={() => eliminar(ticket)}
                                                className="text-red-600 hover:scale-110"
                                            >
                                                🗑
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
