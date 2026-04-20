import { useEffect, useState } from "react";
import { KanbanSquare } from "lucide-react";
import { supabase } from "../services/supabase";
import { crearNotificacion } from "../services/notificaciones";
import {
    DragDropContext,
    Droppable,
    Draggable,
} from "@hello-pangea/dnd";
import {
    elegirTecnicoConMenosTickets,
    obtenerTecnicos,
    resolverNombreTecnico,
} from "../services/asignacion";
import Skeleton from "../components/skeleton";
import EmptyState from "../components/EmptyState";

const base = {
    abierto: { name: "Abiertos", items: [] },
    en_proceso: { name: "En Proceso", items: [] },
    cerrado: { name: "Cerrados", items: [] },
};

export default function Kanban() {
    const [columnas, setColumnas] = useState(base);
    const [tecnicos, setTecnicos] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

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
        await supabase
            .from("tickets")
            .update({
                estado,
                updated_at: new Date(),
            })
            .eq("id", id);
    }

    async function asignar(id, tecnicoId, titulo) {
        await supabase
            .from("tickets")
            .update({
                asignado_a: tecnicoId || null,
                updated_at: new Date(),
            })
            .eq("id", id);

        setTickets((prev) =>
            prev.map((ticket) =>
                ticket.id === id ? { ...ticket, asignado_a: tecnicoId || null } : ticket
            )
        );

        await crearNotificacion(
            "admin@correo.com",
            `Ticket "${titulo}" asignado`
        );
    }

    async function autoAsignar(ticket) {
        const tecnico = elegirTecnicoConMenosTickets(tickets, tecnicos);
        if (!tecnico) return;

        await asignar(ticket.id, tecnico.id, ticket.titulo);
    }

    function getSLAColor(ticket) {
        const horas =
            (new Date() - new Date(ticket.created_at)) /
            (1000 * 60 * 60);

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

        await crearNotificacion(
            "admin@correo.com",
            `Ticket "${moved.titulo}" movido a ${destination.droppableId}`
        );
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
                    Arrastra tickets, asigna técnicos y prioriza trabajo desde una vista visual más clara.
                </p>
            </section>

            <div className="flex gap-4 mb-6 text-sm">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-500 rounded-full" /> OK
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-yellow-400 rounded-full" /> Riesgo
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-500 rounded-full" /> Vencido
                </span>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid md:grid-cols-3 gap-6">
                    {tickets.length === 0 && (
                        <div className="md:col-span-3">
                            <EmptyState
                                icon={KanbanSquare}
                                title="No hay tickets para organizar"
                                description="Cuando entren tickets al sistema podrás moverlos entre columnas y asignarlos a técnicos desde aquí."
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
                                        className="space-y-3 min-h-[200px]"
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
                                                        <div className="flex justify-between">
                                                            <p className="font-medium text-white">{ticket.titulo}</p>
                                                            <span className={`w-3 h-3 rounded-full ${getSLAColor(ticket)}`} />
                                                        </div>

                                                        <p className="text-xs mt-2 text-slate-300">{ticket.prioridad}</p>
                                                        <p className="mt-1 text-xs text-slate-400">
                                                            {resolverNombreTecnico(tecnicos, ticket.asignado_a)}
                                                        </p>

                                                        <select
                                                            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs outline-none"
                                                            value={ticket.asignado_a || ""}
                                                            onChange={(event) =>
                                                                asignar(ticket.id, event.target.value, ticket.titulo)
                                                            }
                                                        >
                                                            <option value="">Sin asignar</option>
                                                            {tecnicos.map((tecnico) => (
                                                                <option key={tecnico.id} value={tecnico.id}>
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
