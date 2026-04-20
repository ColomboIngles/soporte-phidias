import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import Skeleton from "../components/skeleton";

const COLORS = ["#4f46e5", "#f59e0b", "#22c55e"];

export default function Dashboard() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function cargar() {
            setLoading(true);
            const { data } = await supabase.from("tickets").select("*");
            setTickets(data || []);
            setLoading(false);
        }

        cargar();

        const channel = supabase
            .channel("dashboard")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tickets" },
                () => cargar()
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    // 📊 KPIs
    const abiertos = tickets.filter(t => t.estado === "abierto").length;
    const proceso = tickets.filter(t => t.estado === "en_proceso").length;
    const cerrados = tickets.filter(t => t.estado === "cerrado").length;

    const dataChart = [
        { name: "Abiertos", value: abiertos },
        { name: "Proceso", value: proceso },
        { name: "Cerrados", value: cerrados },
    ];

    // ⏱ SLA promedio
    const tiempoPromedio =
        tickets.reduce((acc, t) => {
            const horas =
                (new Date() - new Date(t.created_at)) / (1000 * 60 * 60);
            return acc + horas;
        }, 0) / (tickets.length || 1);

    if (loading) return <Skeleton />;

    return (
        <div className="space-y-6">

            <h1 className="text-2xl font-bold">📊 Dashboard BI</h1>

            {/* KPIs */}
            <div className="grid md:grid-cols-4 gap-6">
                <Card title="Abiertos" value={abiertos} color="bg-indigo-500" />
                <Card title="En proceso" value={proceso} color="bg-yellow-500" />
                <Card title="Cerrados" value={cerrados} color="bg-green-500" />
                <Card
                    title="Tiempo Promedio (hrs)"
                    value={tiempoPromedio.toFixed(1)}
                    color="bg-pink-500"
                />
            </div>

            {/* GRID PRO */}
            <div className="grid md:grid-cols-2 gap-6">

                {/* GRÁFICA */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow hover:scale-[1.02] transition">

                    <h2 className="mb-4 font-semibold">Distribución de Tickets</h2>

                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={dataChart}
                                dataKey="value"
                                outerRadius={90}
                                label
                            >
                                {dataChart.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* LISTA RECIENTE */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow">

                    <h2 className="mb-4 font-semibold">Últimos tickets</h2>

                    <div className="space-y-3">
                        {tickets.slice(0, 5).map(t => (
                            <div
                                key={t.id}
                                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
                            >
                                <p className="font-medium">{t.titulo}</p>
                                <span className="text-xs text-gray-400">
                                    {t.estado}
                                </span>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}

function Card({ title, value, color }) {
    return (
        <div className="p-5 rounded-2xl bg-white/5 backdrop-blur border border-white/10 shadow hover:scale-105 transition">
            <p className="text-gray-400 text-sm">{title}</p>
            <h2 className="text-2xl font-bold mt-1">{value}</h2>
            <div className={`w-8 h-2 mt-3 rounded ${color}`} />
        </div>
    );
}
