import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import ChatTicket from "../components/ChatTicket";

export default function TicketDetalle() {
    const { id } = useParams();
    const [ticket, setTicket] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        async function cargar() {
            const { data } = await supabase
                .from("tickets")
                .select("*")
                .eq("id", id)
                .single();

            setTicket(data);
        }

        async function obtenerUsuario() {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        }

        cargar();
        obtenerUsuario();
    }, [id]);

    async function cambiarEstado(nuevoEstado) {
        if (!ticket) return;

        // 🔄 actualizar ticket
        await supabase
            .from("tickets")
            .update({
                estado: nuevoEstado,
                updated_at: new Date(),
            })
            .eq("id", id);

        // 🔔 crear notificación
        await supabase.from("notificaciones").insert([
            {
                usuario: ticket.email || "admin@correo.com",
                mensaje: `El ticket "${ticket.titulo}" cambió a ${nuevoEstado}`,
            },
        ]);
        const { data } = await supabase
            .from("tickets")
            .select("*")
            .eq("id", id)
            .single();

        setTicket(data);
    }

    if (!ticket) return <p className="p-6">Cargando...</p>;

    return (
        <div className="p-6 space-y-6">

            {/* HEADER */}
            <div>
                <h1 className="text-2xl font-bold">{ticket.titulo}</h1>
                <p className="text-gray-500">{ticket.descripcion}</p>
            </div>

            {/* INFO */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <p><strong>Estado:</strong> {ticket.estado}</p>
                <p><strong>Prioridad:</strong> {ticket.prioridad}</p>
                <p><strong>Categoría:</strong> {ticket.categoria}</p>
                <p>
                    <strong>Fecha:</strong>{" "}
                    {new Date(ticket.created_at).toLocaleString()}
                </p>
            </div>

            {/* ACCIONES */}
            <div className="flex gap-2">
                <button
                    onClick={() => cambiarEstado("abierto")}
                    className="px-3 py-1 bg-yellow-500 text-white rounded"
                >
                    Reabrir
                </button>

                <button
                    onClick={() => cambiarEstado("en_proceso")}
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                >
                    En proceso
                </button>

                <button
                    onClick={() => cambiarEstado("cerrado")}
                    className="px-3 py-1 bg-green-600 text-white rounded"
                >
                    Cerrar
                </button>
            </div>

            {/* 💬 CHAT */}
            {user && (
                <ChatTicket
                    ticketId={id}
                    user={user.email}
                />
            )}

        </div>
    );
}
