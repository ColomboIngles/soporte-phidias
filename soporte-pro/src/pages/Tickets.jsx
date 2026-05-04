import { useEffect, useMemo, useState } from "react";
import {
    Check,
    CheckCircle2,
    ClipboardList,
    Sparkles,
    Trash2,
} from "lucide-react";
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
import ConfirmDialog from "../components/ConfirmDialog";
import Button from "../components/ui/Button";
import {
    MotionItem,
    MotionPage,
    MotionSection,
    MotionStagger,
} from "../components/AppMotion";
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

function formatTicketId(id) {
    if (!id) return "Sin ID";
    return String(id).slice(0, 8);
}

function statusChipClass(estado) {
    if (estado === "cerrado") return "status-chip status-chip-cerrado";
    if (estado === "en_proceso") return "status-chip status-chip-en-proceso";
    return "status-chip status-chip-abierto";
}

function priorityChipClass(prioridad) {
    if (prioridad === "alta") return "priority-chip priority-chip-alta";
    if (prioridad === "media") return "priority-chip priority-chip-media";
    return "priority-chip priority-chip-baja";
}

export default function Tickets({ role }) {
    const [tickets, setTickets] = useState([]);
    const [filtro, setFiltro] = useState("todos");
    const [user, setUser] = useState(null);
    const [tecnicos, setTecnicos] = useState([]);
    const [asignandoId, setAsignandoId] = useState(null);
    const [ticketToDelete, setTicketToDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
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
            const response = await API.put(`/tickets/${ticket.id}`, {
                estado: "cerrado",
            });

            setTickets((prev) =>
                prev.map((item) =>
                    item.id === ticket.id
                        ? {
                              ...item,
                              ...response.data,
                              estado: "cerrado",
                              updated_at:
                                  response.data?.updated_at ||
                                  new Date().toISOString(),
                          }
                        : item
                )
            );

            await registrarAuditoria({
                usuario: user,
                accion: "cerrar",
                ticketId: ticket.id,
            });

            showToast({
                type: "success",
                title: "Ticket cerrado",
                message: `"${ticket.titulo}" quedo marcado como cerrado.`,
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

    function requestDelete(ticket) {
        setTicketToDelete(ticket);
    }

    async function confirmDelete() {
        if (!ticketToDelete) return;

        try {
            setDeletingId(ticketToDelete.id);
            await API.delete(`/tickets/${ticketToDelete.id}`);
            setTickets((prev) =>
                prev.filter((item) => item.id !== ticketToDelete.id)
            );

            await registrarAuditoria({
                usuario: user,
                accion: "eliminar",
                ticketId: ticketToDelete.id,
            });

            showToast({
                type: "success",
                title: "Ticket eliminado",
                message: `"${ticketToDelete.titulo}" salio del tablero correctamente.`,
            });
            setTicketToDelete(null);
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo eliminar el ticket",
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Verifica tu conexion e intenta otra vez.",
            });
        } finally {
            setDeletingId(null);
        }
    }

    async function actualizarAsignacion(ticket, tecnicoId) {
        setAsignandoId(ticket.id);

        try {
            await API.put(`/tickets/${ticket.id}`, {
                asignado_a: tecnicoId || null,
            });

            setTickets((prev) =>
                prev.map((item) =>
                    item.id === ticket.id
                        ? { ...item, asignado_a: tecnicoId || null }
                        : item
                )
            );

            const nombreTecnico = resolverNombreTecnico(tecnicos, tecnicoId);

            showToast({
                type: "success",
                title: tecnicoId ? "Tecnico asignado" : "Asignacion removida",
                message: tecnicoId
                    ? `"${ticket.titulo}" ahora pertenece a ${nombreTecnico}.`
                    : `"${ticket.titulo}" quedo pendiente de asignacion.`,
            });
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo actualizar la asignacion",
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
                title: "No hay tecnicos disponibles",
                message:
                    "Crea o habilita usuarios con rol tecnico para usar autoasignacion.",
            });
            return;
        }

        await actualizarAsignacion(ticket, tecnico.id);
    }

    function getSLAColor(ticket) {
        const ahora = new Date();
        const creado = new Date(ticket.created_at);
        const horas = (ahora - creado) / (1000 * 60 * 60);

        if (ticket.tiempo_resolucion && horas > ticket.tiempo_resolucion) {
            return "bg-red-500";
        }

        if (ticket.tiempo_respuesta && horas > ticket.tiempo_respuesta) {
            return "bg-yellow-400";
        }

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
        <>
            <MotionPage className="space-y-5 p-4 sm:space-y-6 sm:p-6">
                <MotionSection className="app-surface rounded-[2rem] p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="app-kicker">
                                <ClipboardList className="h-3.5 w-3.5" />
                                {isEndUser ? "Seguimiento personal" : "Operacion tickets"}
                            </div>
                            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--app-text-primary)] sm:text-4xl">
                                Tickets
                            </h1>
                            <p className="mt-3 text-sm leading-7 text-[color:var(--app-text-secondary)]">
                                {isEndUser
                                    ? "Crea solicitudes, consulta el estado de cada caso y manten la conversacion con soporte desde un solo flujo."
                                    : "Gestiona soporte con mejor visibilidad, asignacion y acciones rapidas."}
                            </p>
                        </div>

                        {canCreateTicket ? (
                            <Button
                                onClick={() => navigate("/tickets/nuevo")}
                                className="w-full sm:w-auto"
                            >
                                + Nuevo ticket
                            </Button>
                        ) : null}
                    </div>
                </MotionSection>

                <MotionSection
                    delay={0.06}
                    className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                    <p className="text-sm text-[color:var(--app-text-secondary)]">
                        {isEndUser
                            ? "Sigue tus tickets activos, en proceso o cerrados."
                            : "Filtra y administra el backlog operativo."}
                    </p>

                    <div className="flex flex-wrap gap-2">
                        {["todos", "abierto", "en_proceso", "cerrado"].map((item) => (
                            <button
                                key={item}
                                onClick={() => setFiltro(item)}
                                className={`app-button shrink-0 h-10 px-4 text-sm capitalize ${
                                    filtro === item
                                        ? "app-button-primary"
                                        : "app-button-secondary"
                                }`}
                            >
                                {item.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                </MotionSection>

                <MotionSection
                    delay={0.1}
                    className="app-surface rounded-[1.85rem] p-3 shadow-sm sm:p-4"
                >
                    {filtrados.length === 0 ? (
                        <div className="p-2">
                            <EmptyState
                                icon={ClipboardList}
                                compact
                                eyebrow={isEndUser ? "Sin seguimiento" : "Sin backlog"}
                                title="Sin tickets en esta vista"
                                description={
                                    isEndUser
                                        ? "Todavia no tienes tickets en este estado. Cuando abras uno nuevo podras seguirlo desde aqui."
                                        : "Ajusta los filtros o crea un nuevo ticket para empezar a trabajar sobre el flujo de soporte."
                                }
                                action={
                                    canCreateTicket ? (
                                        <Button
                                            onClick={() => navigate("/tickets/nuevo")}
                                        >
                                            Crear ticket
                                        </Button>
                                    ) : null
                                }
                            />
                        </div>
                    ) : (
                        <>
                            <MotionStagger className="space-y-3 lg:hidden">
                                {filtrados.map((ticket) => (
                                    <MotionItem
                                        key={ticket.id}
                                        className="app-surface-muted rounded-[1.6rem] p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/tickets/${ticket.id}`)}
                                                className="min-w-0 text-left"
                                            >
                                                <h3
                                                    title={ticket.titulo}
                                                    className="truncate text-base font-semibold text-[color:var(--app-text-primary)]"
                                                >
                                                    {ticket.titulo}
                                                </h3>
                                                <p
                                                    title={ticket.id}
                                                    className="mt-1 text-xs text-[color:var(--app-text-tertiary)]"
                                                >
                                                    #{formatTicketId(ticket.id)}
                                                </p>
                                            </button>

                                            {showInternalMetrics ? (
                                                <span
                                                    className={`mt-1 inline-block h-3 w-3 shrink-0 rounded-full ${getSLAColor(
                                                        ticket
                                                    )}`}
                                                    aria-label="Indicador SLA"
                                                />
                                            ) : null}
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <span className={statusChipClass(ticket.estado)}>
                                                {ticket.estado.replace("_", " ")}
                                            </span>
                                            <span className={priorityChipClass(ticket.prioridad)}>
                                                {ticket.prioridad || "baja"}
                                            </span>
                                        </div>

                                        <div className="app-surface mt-4 grid gap-3 rounded-[1.35rem] p-3 sm:grid-cols-2">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                                                    {isEndUser ? "Responsable" : "Tecnico"}
                                                </p>
                                                <p className="mt-1 text-sm text-[color:var(--app-text-secondary)]">
                                                    {resolverNombreTecnico(
                                                        tecnicos,
                                                        ticket.asignado_a
                                                    )}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                                                    {isEndUser ? "Actualizacion" : "Fecha"}
                                                </p>
                                                <p className="mt-1 text-sm text-[color:var(--app-text-secondary)]">
                                                    {formatTicketDate(
                                                        ticket.updated_at || ticket.created_at
                                                    )}
                                                </p>
                                            </div>

                                            {showInternalMetrics ? (
                                                <div className="sm:col-span-2">
                                                    <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                                                        SLA
                                                    </p>
                                                    <div className="mt-1 inline-flex items-center gap-2 text-sm text-[color:var(--app-text-secondary)]">
                                                        <span
                                                            className={`inline-block h-3 w-3 rounded-full ${getSLAColor(
                                                                ticket
                                                            )}`}
                                                        />
                                                        Seguimiento activo
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>

                                        {isAdmin ? (
                                            <div className="mt-4 space-y-3">
                                                <select
                                                    value={ticket.asignado_a || ""}
                                                    onChange={(event) =>
                                                        actualizarAsignacion(
                                                            ticket,
                                                            event.target.value
                                                        )
                                                    }
                                                    disabled={asignandoId === ticket.id}
                                                    aria-label={`Asignar tecnico a ${ticket.titulo}`}
                                                    className="app-input-shell w-full text-sm"
                                                >
                                                    <option value="">Sin asignar</option>
                                                    {tecnicos.map((tecnico) => (
                                                        <option
                                                            key={tecnico.id}
                                                            value={tecnico.id}
                                                        >
                                                            {tecnico.nombre || tecnico.email}
                                                        </option>
                                                    ))}
                                                </select>

                                                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                                                    <Button
                                                        onClick={() => autoAsignar(ticket)}
                                                        variant="secondary"
                                                        iconLeft={Sparkles}
                                                    >
                                                        Auto asignar
                                                    </Button>

                                                    <Button
                                                        onClick={() => cerrar(ticket)}
                                                        variant="secondary"
                                                        iconLeft={Check}
                                                        aria-label={`Cerrar ${ticket.titulo}`}
                                                    >
                                                        Cerrar
                                                    </Button>

                                                    <Button
                                                        onClick={() => requestDelete(ticket)}
                                                        variant="danger"
                                                        iconLeft={Trash2}
                                                        aria-label={`Eliminar ${ticket.titulo}`}
                                                    >
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : null}
                                    </MotionItem>
                                ))}
                            </MotionStagger>

                            <div className="hidden lg:block">
                                <div className="data-table-wrap">
                                    <table className="data-table table-fixed min-w-[1060px]">
                                        <thead>
                                            <tr>
                                                <th className="w-[17%]">Titulo</th>
                                                <th className="w-[10%]">Estado</th>
                                                <th className="w-[10%]">Prioridad</th>
                                                <th className={showInternalMetrics ? "w-[21%]" : "w-[31%]"}>
                                                    {isEndUser ? "Responsable" : "Tecnico"}
                                                </th>
                                                {showInternalMetrics ? <th className="w-[10%]">SLA</th> : null}
                                                <th className={isAdmin ? "w-[15%]" : "w-[22%]"}>
                                                    {isEndUser ? "Actualizacion" : "Fecha"}
                                                </th>
                                                {isAdmin ? <th className="w-[18%] min-w-[11.5rem]">Acciones</th> : null}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {filtrados.map((ticket) => (
                                                <tr key={ticket.id}>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                                                            className="group max-w-[11rem] text-left xl:max-w-[13rem]"
                                                        >
                                                            <div
                                                                title={ticket.titulo}
                                                                className="truncate font-semibold text-[color:var(--app-text-primary)] transition group-hover:text-[color:var(--app-accent)]"
                                                            >
                                                                {ticket.titulo}
                                                            </div>
                                                            <div
                                                                title={ticket.id}
                                                                className="mt-1 text-xs text-[color:var(--app-text-tertiary)]"
                                                            >
                                                                #{formatTicketId(ticket.id)}
                                                            </div>
                                                        </button>
                                                    </td>

                                                    <td>
                                                        <span className={statusChipClass(ticket.estado)}>
                                                            {ticket.estado.replace("_", " ")}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span className={priorityChipClass(ticket.prioridad)}>
                                                            {ticket.prioridad || "baja"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {isAdmin ? (
                                                            <div className="min-w-0 max-w-[12rem] space-y-2 xl:max-w-[13rem]">
                                                                <select
                                                                    value={ticket.asignado_a || ""}
                                                                    onChange={(event) =>
                                                                        actualizarAsignacion(
                                                                            ticket,
                                                                            event.target.value
                                                                        )
                                                                    }
                                                                    disabled={asignandoId === ticket.id}
                                                                    aria-label={`Asignar tecnico a ${ticket.titulo}`}
                                                                    className="app-input-shell w-full text-xs"
                                                                >
                                                                    <option value="">Sin asignar</option>
                                                                    {tecnicos.map((tecnico) => (
                                                                        <option
                                                                            key={tecnico.id}
                                                                            value={tecnico.id}
                                                                        >
                                                                            {tecnico.nombre || tecnico.email}
                                                                        </option>
                                                                    ))}
                                                                </select>

                                                                <div
                                                                    title={resolverNombreTecnico(
                                                                        tecnicos,
                                                                        ticket.asignado_a
                                                                    )}
                                                                    className="truncate text-[11px] text-[color:var(--app-text-tertiary)]"
                                                                >
                                                                    {resolverNombreTecnico(
                                                                        tecnicos,
                                                                        ticket.asignado_a
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span
                                                                title={resolverNombreTecnico(
                                                                    tecnicos,
                                                                    ticket.asignado_a
                                                                )}
                                                                className="block truncate text-sm text-[color:var(--app-text-secondary)]"
                                                            >
                                                                {resolverNombreTecnico(
                                                                    tecnicos,
                                                                    ticket.asignado_a
                                                                )}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {showInternalMetrics ? (
                                                        <td>
                                                            <div className="inline-flex items-center gap-2">
                                                                <span
                                                                    className={`inline-block h-3 w-3 rounded-full ${getSLAColor(
                                                                        ticket
                                                                    )}`}
                                                                />
                                                                <span className="text-xs text-[color:var(--app-text-tertiary)]">
                                                                    Seguimiento
                                                                </span>
                                                            </div>
                                                        </td>
                                                    ) : null}

                                                    <td>
                                                        <div className="text-xs leading-5 text-[color:var(--app-text-secondary)] xl:text-sm">
                                                            {formatTicketDate(
                                                                ticket.updated_at || ticket.created_at
                                                            )}
                                                        </div>
                                                    </td>

                                                    {isAdmin ? (
                                                        <td>
                                                            <div className="flex min-w-[11rem] items-center justify-end gap-2 whitespace-nowrap">
                                                                <Button
                                                                    onClick={() => autoAsignar(ticket)}
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="min-w-[5.75rem] justify-center px-3"
                                                                    aria-label={`Auto asignar ${ticket.titulo}`}
                                                                    title="Auto asignar"
                                                                >
                                                                    Auto
                                                                </Button>

                                                                <Button
                                                                    onClick={() => cerrar(ticket)}
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="h-11 w-11 shrink-0 rounded-full border-[color:var(--app-border-strong)] bg-[color:var(--app-surface-strong)] px-0 text-[color:var(--app-accent)] shadow-sm"
                                                                    aria-label={`Cerrar ${ticket.titulo}`}
                                                                    title="Cerrar ticket"
                                                                >
                                                                    <CheckCircle2 className="h-[1.1rem] w-[1.1rem] [stroke-width:2.15]" />
                                                                </Button>

                                                                <Button
                                                                    onClick={() => requestDelete(ticket)}
                                                                    variant="danger"
                                                                    size="sm"
                                                                    className="h-11 w-11 shrink-0 rounded-full px-0 text-[color:var(--brand-danger)]"
                                                                    aria-label={`Eliminar ${ticket.titulo}`}
                                                                    title="Eliminar ticket"
                                                                >
                                                                    <Trash2 className="h-[1.05rem] w-[1.05rem] [stroke-width:2.15]" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    ) : null}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </MotionSection>
            </MotionPage>

            <ConfirmDialog
                open={Boolean(ticketToDelete)}
                onClose={() => setTicketToDelete(null)}
                onConfirm={confirmDelete}
                title="Eliminar ticket"
                description={
                    ticketToDelete
                        ? `Se eliminara "${ticketToDelete.titulo}" y dejara de estar disponible en el flujo de soporte.`
                        : ""
                }
                confirmLabel="Eliminar ticket"
                busy={deletingId === ticketToDelete?.id}
            />
        </>
    );
}
