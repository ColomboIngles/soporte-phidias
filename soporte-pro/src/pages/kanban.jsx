import { useEffect, useState } from "react";
import { KanbanSquare } from "lucide-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { supabase } from "../services/supabase";
import API from "../services/api";
import { useToast } from "../hooks/useToast";
import {
    elegirTecnicoConMenosTickets,
    obtenerTecnicos,
    resolverNombreTecnico,
} from "../services/asignacion";
import Skeleton from "../components/skeleton";
import EmptyState from "../components/EmptyState";
import { isAdminRole } from "../utils/permissions";

const base = {
    abierto: { name: "Abiertos", items: [] },
    en_proceso: { name: "En Proceso", items: [] },
    cerrado: { name: "Cerrados", items: [] },
};

export default function Kanban({ rol }) {
    const [columnas, setColumnas] = useState(base);
    const [tecnicos, setTecnicos] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const canAssign = isAdminRole(rol);

    useEffect(() => {
        async function cargarTickets() {
            setLoading(true);
            const { data } = await supabase.from("tickets").select("*");
            const lista = data || [];

            const nuevo = {
                abierto: { ...base.abierto, items: [] },
                en_proceso: { ...base.en_proceso, items: [] },
                cerrado: { ...base.cerrado, items: [] },
            };

            lista.forEach((ticket) => {
                const estado = ticket.estado || "abierto";
                if (nuevo[estado]) nuevo[estado].items.push(ticket);
            });

            setTickets(lista);
            setColumnas(nuevo);
            setLoading(false);
        }

        async function cargarTecnicos() {
            try {
                const data = await obtenerTecnicos();
                setTecnicos(data);
            } catch {
                setTecnicos([]);
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
            supabase.removeChannel(ticketsChannel);
            supabase.removeChannel(usuariosChannel);
        };
    }, []);

    async function actualizarEstado(id, estado) {
        try {
            await API.put(`/tickets/${id}`, {
                estado,
            });
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo mover el ticket",
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Intenta nuevamente en unos segundos.",
            });
        }
    }

    async function asignar(id, tecnicoId, titulo) {
        try {
            await API.put(`/tickets/${id}`, {
                asignado_a: tecnicoId || null,
            });

            setTickets((prev) =>
                prev.map((ticket) =>
                    ticket.id === id
                        ? { ...ticket, asignado_a: tecnicoId || null }
                        : ticket
                )
            );

            showToast({
                type: "success",
                title: tecnicoId ? "Técnico asignado" : "Asignación removida",
                message: tecnicoId
                    ? `“${titulo}” ya tiene responsable.`
                    : `“${titulo}” volvió a quedar sin asignación.`,
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

        await asignar(ticket.id, tecnico.id, ticket.titulo);
    }

    function getSLAColor(ticket) {
        const horas = (new Date() - new Date(ticket.created_at)) / (1000 * 60 * 60);

        if (horas > ticket.tiempo_resolucion) return "bg-red-500";
        if (horas > ticket.tiempo_respuesta) return "bg-yellow-400";
        return "bg-green-500";
    }

    const onDragEnd = async (result) => {
        if (!result.destination) return;

        const { source, destination } = result;

        const sourceCol = columnas[source.droppableId];
        const destCol = columnas[destination.droppableId];

        const sourceItems = [...sourceCol.items];
        const destItems = [...destCol.items];

        const [moved] = sourceItems.splice(source.index, 1);
        destItems.splice(destination.index, 0, moved);

        setColumnas({
            ...columnas,
            [source.droppableId]: { ...sourceCol, items: sourceItems },
            [destination.droppableId]: { ...destCol, items: destItems },
        });

        await actualizarEstado(moved.id, destination.droppableId);
    };

    if (loading) {
        return <Skeleton variant="table" />;
    }

    return (
        <div className="p-6">
            <section className="glass-panel rounded-[2rem] p-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    <KanbanSquare className="h-3.5 w-3.5" />
                    Vista Kanban
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                    Flujo operativo por columnas
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                    Arrastra tickets, actualiza estados y coordina trabajo con una vista visual más clara.
                </p>
            </section>

            <div className="mb-6 flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-green-500" /> OK
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-yellow-400" /> Riesgo
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-red-500" /> Vencido
                </span>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid gap-6 md:grid-cols-3">
                    {tickets.length === 0 && (
                        <div className="md:col-span-3">
                            <EmptyState
                                icon={KanbanSquare}
                                title="No hay tickets para organizar"
                                description="Cuando entren tickets al sistema podrás moverlos entre columnas y asignarlos desde aquí."
                            />
                        </div>
                    )}

                    {Object.entries(columnas).map(([id, col]) => (
                        <div key={id} className="glass-panel rounded-[1.75rem] p-4">
                            <h2 className="mb-4 font-semibold text-white">{col.name}</h2>

                            <Droppable droppableId={id}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="min-h-[200px] space-y-3"
                                    >
                                        {col.items.map((ticket, index) => (
                                            <Draggable
                                                key={ticket.id}
                                                draggableId={ticket.id.toString()}
                                                index={index}
                                            >
                                                {(dragProvided) => (
                                                    <div
                                                        ref={dragProvided.innerRef}
                                                        {...dragProvided.draggableProps}
                                                        {...dragProvided.dragHandleProps}
                                                        className="glass-card soft-hover rounded-[1.5rem] p-4"
                                                    >
                                                        <div className="flex justify-between gap-3">
                                                            <p className="font-medium text-white">
                                                                {ticket.titulo}
                                                            </p>
                                                            <span
                                                                className={`h-3 w-3 rounded-full ${getSLAColor(
                                                                    ticket
                                                                )}`}
                                                            />
                                                        </div>

                                                        <p className="mt-2 text-xs text-slate-300">
                                                            {ticket.prioridad}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-400">
                                                            {resolverNombreTecnico(
                                                                tecnicos,
                                                                ticket.asignado_a
                                                            )}
                                                        </p>

                                                        {canAssign ? (
                                                            <>
                                                                <select
                                                                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs outline-none"
                                                                    value={ticket.asignado_a || ""}
                                                                    onChange={(event) =>
                                                                        asignar(
                                                                            ticket.id,
                                                                            event.target.value,
                                                                            ticket.titulo
                                                                        )
                                                                    }
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

                                                                <button
                                                                    onClick={() => autoAsignar(ticket)}
                                                                    className="mt-2 w-full rounded-lg border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs font-medium text-sky-200 transition hover:bg-sky-400/15"
                                                                >
                                                                    Auto asignar
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
                                                                Responsable:{" "}
                                                                {resolverNombreTecnico(
                                                                    tecnicos,
                                                                    ticket.asignado_a
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}

                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}
