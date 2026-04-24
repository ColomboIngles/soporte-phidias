import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { KanbanSquare, LoaderCircle } from "lucide-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { supabase } from "../services/supabase";
import API from "../services/api";
import { useToast } from "../hooks/useToast";
import Button from "../components/ui/Button";
import SectionHeader from "../components/ui/SectionHeader";
import Surface from "../components/ui/Surface";
import {
    elegirTecnicoConMenosTickets,
    obtenerTecnicos,
    resolverNombreTecnico,
} from "../services/asignacion";
import Skeleton from "../components/skeleton";
import EmptyState from "../components/EmptyState";
import { isAdminRole } from "../utils/permissions";
import { MotionItem, MotionPage, MotionSection, MotionStagger } from "../components/AppMotion";

const base = {
    abierto: { name: "Abiertos", items: [] },
    en_proceso: { name: "En proceso", items: [] },
    cerrado: { name: "Cerrados", items: [] },
};

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

function buildColumns(lista) {
    const nuevo = {
        abierto: { ...base.abierto, items: [] },
        en_proceso: { ...base.en_proceso, items: [] },
        cerrado: { ...base.cerrado, items: [] },
    };

    lista.forEach((ticket) => {
        const estado = ticket.estado || "abierto";
        if (nuevo[estado]) {
            nuevo[estado].items.push(ticket);
        }
    });

    return nuevo;
}

function patchColumnsTicket(columnas, ticketId, updater) {
    return Object.fromEntries(
        Object.entries(columnas).map(([columnId, column]) => [
            columnId,
            {
                ...column,
                items: column.items.map((ticket) =>
                    ticket.id === ticketId ? updater(ticket) : ticket
                ),
            },
        ])
    );
}

function TicketCard({
    ticket,
    tecnicos,
    canAssign,
    movingTicketId,
    onAssign,
    onAutoAssign,
    getSLAColor,
}) {
    return (
        <div
            className={`app-surface-muted app-surface-interactive cursor-grab rounded-[1.5rem] p-4 active:cursor-grabbing ${
                movingTicketId === ticket.id ? "opacity-70" : ""
            }`}
        >
            <div className="flex justify-between gap-3">
                <div className="min-w-0">
                    <p className="app-break-anywhere font-medium text-[color:var(--app-text-primary)]">
                        {ticket.titulo}
                    </p>
                    <p className="app-break-anywhere mt-1 text-[11px] text-[color:var(--app-text-tertiary)]">
                        #{ticket.id}
                    </p>
                </div>
                <span
                    className={`mt-1 h-3 w-3 shrink-0 rounded-full ${getSLAColor(
                        ticket
                    )}`}
                />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <span className={priorityChipClass(ticket.prioridad)}>
                    {ticket.prioridad || "baja"}
                </span>
                <span className={statusChipClass(ticket.estado)}>
                    {ticket.estado?.replace("_", " ") || "abierto"}
                </span>
            </div>

            <p className="app-break-anywhere mt-3 text-xs leading-5 text-[color:var(--app-text-secondary)]">
                {resolverNombreTecnico(tecnicos, ticket.asignado_a)}
            </p>

            {canAssign ? (
                <div className="mt-3 space-y-2">
                    <select
                        className="app-input-shell w-full text-xs"
                        aria-label={`Asignar tecnico a ${ticket.titulo}`}
                        value={ticket.asignado_a || ""}
                        onChange={(event) => onAssign(ticket, event.target.value)}
                    >
                        <option value="">Sin asignar</option>
                        {tecnicos.map((tecnico) => (
                            <option key={tecnico.id} value={tecnico.id}>
                                {tecnico.nombre || tecnico.email}
                            </option>
                        ))}
                    </select>

                    <Button
                        onClick={() => onAutoAssign(ticket)}
                        variant="secondary"
                        size="sm"
                        className="w-full"
                    >
                        Auto asignar
                    </Button>
                </div>
            ) : (
                <div className="app-surface app-break-anywhere mt-3 rounded-xl px-3 py-2 text-xs text-[color:var(--app-text-secondary)]">
                    Responsable: {resolverNombreTecnico(tecnicos, ticket.asignado_a)}
                </div>
            )}

            {movingTicketId === ticket.id && (
                <div className="mt-3 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    Actualizando
                </div>
            )}
        </div>
    );
}

export default function Kanban({ rol }) {
    const [columnas, setColumnas] = useState(base);
    const [tecnicos, setTecnicos] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [movingTicketId, setMovingTicketId] = useState(null);
    const { showToast } = useToast();
    const dragPortal = useMemo(
        () => (typeof document !== "undefined" ? document.body : null),
        []
    );

    const canAssign = isAdminRole(rol);

    useEffect(() => {
        let activo = true;

        async function cargarTickets() {
            setLoading(true);

            const { data } = await supabase.from("tickets").select("*");
            const lista = data || [];

            if (!activo) return;

            setTickets(lista);
            setColumnas(buildColumns(lista));
            setLoading(false);
        }

        async function cargarTecnicos() {
            try {
                const data = await obtenerTecnicos();

                if (activo) {
                    setTecnicos(data);
                }
            } catch {
                if (activo) {
                    setTecnicos([]);
                }
            }
        }

        cargarTickets();
        cargarTecnicos();

        const ticketsChannel = supabase
            .channel("kanban-tickets")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tickets" },
                () => cargarTickets()
            )
            .subscribe();

        const usuariosChannel = supabase
            .channel("kanban-tecnicos")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "usuarios" },
                () => cargarTecnicos()
            )
            .subscribe();

        return () => {
            activo = false;
            supabase.removeChannel(ticketsChannel);
            supabase.removeChannel(usuariosChannel);
        };
    }, []);

    function updateTicketEverywhere(ticketId, updater) {
        setTickets((prev) =>
            prev.map((ticket) => (ticket.id === ticketId ? updater(ticket) : ticket))
        );

        setColumnas((prev) => patchColumnsTicket(prev, ticketId, updater));
    }

    async function actualizarEstado(id, estado) {
        try {
            const response = await API.put(`/tickets/${id}`, {
                estado,
            });

            return response.data;
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo mover el ticket",
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Intenta nuevamente en unos segundos.",
            });

            return null;
        }
    }

    async function asignar(id, tecnicoId, titulo) {
        try {
            await API.put(`/tickets/${id}`, {
                asignado_a: tecnicoId || null,
            });

            updateTicketEverywhere(id, (ticket) => ({
                ...ticket,
                asignado_a: tecnicoId || null,
            }));

            showToast({
                type: "success",
                title: tecnicoId ? "Tecnico asignado" : "Asignacion removida",
                message: tecnicoId
                    ? `"${titulo}" ya tiene responsable.`
                    : `"${titulo}" volvio a quedar sin asignacion.`,
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
        }
    }

    async function autoAsignar(ticket) {
        const tecnico = elegirTecnicoConMenosTickets(tickets, tecnicos);

        if (!tecnico) {
            showToast({
                type: "info",
                title: "No hay tecnicos disponibles",
                message: "Crea o habilita usuarios con rol tecnico para usar autoasignacion.",
            });
            return;
        }

        await asignar(ticket.id, tecnico.id, ticket.titulo);
    }

    function getSLAColor(ticket) {
        const horas = (new Date() - new Date(ticket.created_at)) / (1000 * 60 * 60);

        if (horas > ticket.tiempo_resolucion) return "bg-red-500";
        if (horas > ticket.tiempo_respuesta) return "bg-yellow-400";
        return "bg-green-500";
    }

    async function onDragEnd(result) {
        if (!result.destination) return;

        const { source, destination } = result;

        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        const sourceCol = columnas[source.droppableId];
        const destCol = columnas[destination.droppableId];

        if (!sourceCol || !destCol) return;

        if (source.droppableId === destination.droppableId) {
            const reordered = [...sourceCol.items];
            const [moved] = reordered.splice(source.index, 1);
            reordered.splice(destination.index, 0, moved);

            setColumnas((prev) => ({
                ...prev,
                [source.droppableId]: {
                    ...sourceCol,
                    items: reordered,
                },
            }));

            return;
        }

        const previousColumns = columnas;
        const previousTickets = tickets;
        const sourceItems = [...sourceCol.items];
        const destItems = [...destCol.items];
        const [moved] = sourceItems.splice(source.index, 1);
        const optimisticTicket = {
            ...moved,
            estado: destination.droppableId,
            updated_at: new Date().toISOString(),
        };

        destItems.splice(destination.index, 0, optimisticTicket);

        setMovingTicketId(moved.id);
        setColumnas({
            ...columnas,
            [source.droppableId]: { ...sourceCol, items: sourceItems },
            [destination.droppableId]: { ...destCol, items: destItems },
        });
        setTickets((prev) =>
            prev.map((ticket) =>
                ticket.id === moved.id ? optimisticTicket : ticket
            )
        );

        const updatedTicket = await actualizarEstado(
            moved.id,
            destination.droppableId
        );

        if (!updatedTicket) {
            setColumnas(previousColumns);
            setTickets(previousTickets);
            setMovingTicketId(null);
            return;
        }

        updateTicketEverywhere(moved.id, (ticket) => ({
            ...ticket,
            ...updatedTicket,
        }));
        setMovingTicketId(null);
    }

    if (loading) {
        return <Skeleton variant="table" />;
    }

    return (
        <MotionPage className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            <MotionSection className="app-surface-hero rounded-[2rem] p-5 sm:p-6">
                <div className="app-kicker w-max">
                    <KanbanSquare className="h-3.5 w-3.5" />
                    Vista Kanban
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--app-text-primary)]">
                    Flujo operativo por columnas
                </h1>
                <p className="mt-3 text-sm leading-7 text-[color:var(--app-text-secondary)]">
                    Arrastra tickets, actualiza estados y coordina trabajo con una vista visual mas clara.
                </p>
            </MotionSection>

            <MotionSection
                delay={0.06}
                className="mb-2 flex flex-wrap gap-3 text-sm sm:gap-4"
            >
                <span className="app-surface-muted inline-flex items-center gap-2 rounded-full px-3 py-2">
                    <span className="h-3 w-3 rounded-full bg-green-500" /> OK
                </span>
                <span className="app-surface-muted inline-flex items-center gap-2 rounded-full px-3 py-2">
                    <span className="h-3 w-3 rounded-full bg-yellow-400" /> Riesgo
                </span>
                <span className="app-surface-muted inline-flex items-center gap-2 rounded-full px-3 py-2">
                    <span className="h-3 w-3 rounded-full bg-red-500" /> Vencido
                </span>
            </MotionSection>

            <DragDropContext onDragEnd={onDragEnd}>
                {tickets.length === 0 ? (
                    <EmptyState
                        icon={KanbanSquare}
                        eyebrow="Sin columnas activas"
                        title="No hay tickets para organizar"
                        description="Cuando entren tickets al sistema podras moverlos entre columnas y asignarlos desde aqui."
                    />
                ) : (
                    <MotionSection
                        delay={0.1}
                        className="pb-2"
                    >
                        <MotionStagger className="grid gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3 xl:gap-6">
                            {Object.entries(columnas).map(([id, col]) => (
                                <MotionItem
                                    key={id}
                                    className="app-surface min-w-0 rounded-[1.75rem] p-4 sm:p-5"
                                    style={{ boxShadow: "var(--app-shadow-md)" }}
                                >
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <SectionHeader
                                            title={col.name}
                                            description={`${col.items.length} ticket(s) en esta etapa.`}
                                            className="flex-1 gap-2 lg:flex-col lg:items-start lg:justify-start"
                                        />
                                        <span className="app-surface-muted rounded-full px-3 py-1 text-xs font-medium text-[color:var(--app-text-secondary)]">
                                            {col.items.length}
                                        </span>
                                    </div>

                                    <Droppable droppableId={id}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className="min-h-[220px] space-y-3"
                                            >
                                                {col.items.length === 0 ? (
                                                    <div className="rounded-[1.35rem] border border-dashed border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] px-4 py-5 text-sm text-[color:var(--app-text-secondary)]">
                                                        Arrastra un ticket aqui para mover el flujo.
                                                    </div>
                                                ) : null}

                                                {col.items.map((ticket, index) => (
                                                    <Draggable
                                                        key={ticket.id}
                                                        draggableId={String(ticket.id)}
                                                        index={index}
                                                    >
                                                        {(dragProvided, snapshot) => {
                                                            const card = (
                                                                <div
                                                                    ref={dragProvided.innerRef}
                                                                    {...dragProvided.draggableProps}
                                                                    {...dragProvided.dragHandleProps}
                                                                    style={dragProvided.draggableProps.style}
                                                                    className={`${
                                                                        snapshot.isDragging
                                                                            ? "z-[90] rotate-[1deg] border-[color:var(--app-accent)] shadow-[0_22px_56px_rgba(102,124,112,0.22)]"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    <TicketCard
                                                                        ticket={ticket}
                                                                        tecnicos={tecnicos}
                                                                        canAssign={canAssign}
                                                                        movingTicketId={movingTicketId}
                                                                        onAssign={(currentTicket, tecnicoId) =>
                                                                            asignar(
                                                                                currentTicket.id,
                                                                                tecnicoId,
                                                                                currentTicket.titulo
                                                                            )
                                                                        }
                                                                        onAutoAssign={autoAsignar}
                                                                        getSLAColor={getSLAColor}
                                                                    />
                                                                </div>
                                                            );

                                                            if (
                                                                snapshot.isDragging &&
                                                                dragPortal
                                                            ) {
                                                                return createPortal(
                                                                    card,
                                                                    dragPortal
                                                                );
                                                            }

                                                            return card;
                                                        }}
                                                    </Draggable>
                                                ))}

                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </MotionItem>
                            ))}
                        </MotionStagger>
                    </MotionSection>
                )}
            </DragDropContext>
        </MotionPage>
    );
}
