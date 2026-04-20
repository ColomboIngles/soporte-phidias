import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { crearNotificacion } from "../services/notificaciones";
import { useNavigate } from "react-router-dom";

export default function Tickets({ role }) {
    const [tickets, setTickets] = useState([]);
    const [filtro, setFiltro] = useState("todos");
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        obtenerUsuario();
    }, []);

    useEffect(() => {
        if (user) cargar();

        const channel = supabase
            .channel("tickets-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tickets" },
                () => cargar()
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user]);

    async function obtenerUsuario() {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
    }

    async function cargar() {
        let query = supabase.from("tickets").select("*");

        // 🔐 FILTRO POR ROL
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
    }

    async function cerrar(t) {
        await supabase
            .from("tickets")
            .update({
                estado: "cerrado",
                updated_at: new Date(),
            })
            .eq("id", t.id);

        await crearNotificacion(
            user.email,
            `Ticket "${t.titulo}" fue cerrado`
        );
    }

    async function eliminar(t) {
        if (!confirm("¿Eliminar ticket?")) return;

        await supabase.from("tickets").delete().eq("id", t.id);

        await crearNotificacion(
            user.email,
            `Ticket "${t.titulo}" fue eliminado`
        );
    }

    // 🎯 SLA VISUAL
    function getSLAColor(ticket) {
        const ahora = new Date();
        const creado = new Date(ticket.created_at);
        const horas = (ahora - creado) / (1000 * 60 * 60);

        if (horas > ticket.tiempo_resolucion) return "bg-red-500";
        if (horas > ticket.tiempo_respuesta) return "bg-yellow-400";
        return "bg-green-500";
    }

    const filtrados =
        filtro === "todos"
            ? tickets
            : tickets.filter((t) => t.estado === filtro);

    return (
        <div className="p-6 space-y-6">

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">🎫 Tickets</h1>
                    <p className="text-gray-500 text-sm">
                        Gestión de soporte
                    </p>
                </div>

                {role === "admin" && (
                    <button
                        onClick={() => navigate("/tickets/nuevo")}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:scale-105 transition"
                    >
                        + Nuevo Ticket
                    </button>
                )}
            </div>

            {/* FILTROS */}
            <div className="flex gap-2 flex-wrap">
                {["todos", "abierto", "en_proceso", "cerrado"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFiltro(f)}
                        className={`px-4 py-2 rounded-xl text-sm capitalize ${filtro === f
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-200 dark:bg-gray-800"
                            }`}
                    >
                        {f.replace("_", " ")}
                    </button>
                ))}
            </div>

            {/* TABLA */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="p-4 text-left">Título</th>
                            <th>Estado</th>
                            <th>Prioridad</th>
                            <th>SLA</th>
                            <th>Fecha</th>
                            {role === "admin" && <th>Acciones</th>}
                        </tr>
                    </thead>

                    <tbody>
                        {filtrados.map((t) => (
                            <tr
                                key={t.id}
                                className="border-t hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                            >
                                <td
                                    className="p-4 font-medium cursor-pointer"
                                    onClick={() => navigate(`/tickets/${t.id}`)}
                                >
                                    {t.titulo}
                                </td>

                                <td className="capitalize">{t.estado.replace("_", " ")}</td>

                                <td>{t.prioridad}</td>

                                {/* SLA */}
                                <td>
                                    <span
                                        className={`w-3 h-3 inline-block rounded-full ${getSLAColor(t)}`}
                                    />
                                </td>

                                <td>
                                    {new Date(t.created_at).toLocaleDateString()}
                                </td>

                                {role === "admin" && (
                                    <td className="space-x-2">
                                        <button
                                            onClick={() => cerrar(t)}
                                            className="text-green-600 hover:scale-110"
                                        >
                                            ✔
                                        </button>

                                        <button
                                            onClick={() => eliminar(t)}
                                            className="text-red-600 hover:scale-110"
                                        >
                                            🗑
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}

                        {filtrados.length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center p-6 text-gray-400">
                                    No hay tickets
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}