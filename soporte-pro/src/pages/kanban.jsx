import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { crearNotificacion } from "../services/notificaciones";
import {
    DragDropContext,
    Droppable,
    Draggable,
} from "@hello-pangea/dnd";

const base = {
    abierto: { name: "Abiertos", items: [] },
    en_proceso: { name: "En Proceso", items: [] },
    cerrado: { name: "Cerrados", items: [] },
};

export default function Kanban() {
    const [columnas, setColumnas] = useState(base);
    const [usuarios, setUsuarios] = useState([]);

    useEffect(() => {
        cargar();
        cargarUsuarios();

        // 🔥 REALTIME
        const channel = supabase
            .channel("kanban")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tickets" },
                () => cargar()
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    async function cargar() {
        const { data } = await supabase.from("tickets").select("*");

        const nuevo = { ...base };

        data.forEach((t) => {
            const estado = t.estado || "abierto";
            if (nuevo[estado]) nuevo[estado].items.push(t);
        });

        setColumnas(nuevo);
    }

    async function cargarUsuarios() {
        const { data } = await supabase.from("usuarios").select("*");
        setUsuarios(data || []);
    }

    async function actualizarEstado(id, estado) {
        await supabase
            .from("tickets")
            .update({
                estado,
                updated_at: new Date(),
            })
            .eq("id", id);
    }

    async function asignar(id, userId, titulo) {
        await supabase
            .from("tickets")
            .update({ asignado_a: userId })
            .eq("id", id);

        await crearNotificacion(
            "admin@correo.com",
            `Ticket "${titulo}" asignado`
        );
    }

    function getSLAColor(t) {
        const horas =
            (new Date() - new Date(t.created_at)) /
            (1000 * 60 * 60);

        if (horas > t.tiempo_resolucion) return "bg-red-500";
        if (horas > t.tiempo_respuesta) return "bg-yellow-400";
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

    return (
        <div className="p-6">

            <h1 className="text-2xl font-bold mb-4">
                🚀 Kanban PRO
            </h1>

            {/* SLA */}
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

                    {Object.entries(columnas).map(([id, col]) => (
                        <div key={id} className="bg-gray-100 dark:bg-gray-900 p-4 rounded-2xl">
                            <h2 className="mb-4 font-semibold">{col.name}</h2>

                            <Droppable droppableId={id}>
                                {(provided) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3 min-h-[200px]">

                                        {col.items.map((t, i) => (
                                            <Draggable key={t.id} draggableId={t.id.toString()} index={i}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow"
                                                    >
                                                        <div className="flex justify-between">
                                                            <p className="font-medium">{t.titulo}</p>
                                                            <span className={`w-3 h-3 rounded-full ${getSLAColor(t)}`} />
                                                        </div>

                                                        <p className="text-xs mt-2">{t.prioridad}</p>

                                                        {/* asignación */}
                                                        <select
                                                            className="mt-2 w-full text-xs"
                                                            value={t.asignado_a || ""}
                                                            onChange={(e) =>
                                                                asignar(t.id, e.target.value, t.titulo)
                                                            }
                                                        >
                                                            <option value="">Sin asignar</option>
                                                            {usuarios.map((u) => (
                                                                <option key={u.id} value={u.id}>
                                                                    {u.nombre}
                                                                </option>
                                                            ))}
                                                        </select>
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