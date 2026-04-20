import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    CalendarRange,
    Clock3,
    Filter,
    Gauge,
    PieChart as PieChartIcon,
    Users,
} from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { supabase } from "../services/supabase";
import Skeleton from "../components/skeleton";

const STATUS_COLORS = ["#38bdf8", "#f59e0b", "#34d399"];

function formatDateInput(date) {
    return date.toISOString().slice(0, 10);
}

function formatShortDate(value) {
    return new Intl.DateTimeFormat("es-CO", {
        month: "short",
        day: "numeric",
    }).format(new Date(value));
}

function formatLongDate(value) {
    return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
    }).format(new Date(value));
}

function formatHours(value) {
    return `${value.toFixed(1)} h`;
}

function calcularDuracionHoras(ticket) {
    const inicio = new Date(ticket.created_at);
    const fin =
        ticket.estado === "cerrado" && ticket.updated_at
            ? new Date(ticket.updated_at)
            : new Date();

    return Math.max((fin - inicio) / (1000 * 60 * 60), 0);
}

function DashboardCard({ title, value, subtitle, icon, accentClassName }) {
    const IconComponent = icon;

    return (
        <div className="group rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.22)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.07]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        {title}
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="mt-2 text-sm text-slate-400">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className={`rounded-2xl border border-white/10 p-3 ${accentClassName}`}>
                    <IconComponent className="h-5 w-5 text-white" />
                </div>
            </div>
        </div>
    );
}

function Panel({ title, subtitle, children, Icon, className = "" }) {
    return (
        <section className={`rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.24)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-white/15 ${className}`}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    {subtitle && (
                        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
                    )}
                </div>

                {Icon && (
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                        <Icon className="h-5 w-5 text-cyan-300" />
                    </div>
                )}
            </div>

            <div className="mt-6">{children}</div>
        </section>
    );
}

export default function Dashboard() {
    const [tickets, setTickets] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fechaInicio, setFechaInicio] = useState(() => {
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 29);
        return formatDateInput(start);
    });
    const [fechaFin, setFechaFin] = useState(() => formatDateInput(new Date()));

    useEffect(() => {
        let activo = true;

        async function cargar() {
            setLoading(true);

            const [{ data: ticketsData }, { data: usuariosData }] = await Promise.all([
                supabase.from("tickets").select("*"),
                supabase.from("usuarios").select("id, nombre, email"),
            ]);

            if (!activo) return;

            setTickets(ticketsData || []);
            setUsuarios(usuariosData || []);
            setLoading(false);
        }

        cargar();

        const ticketsChannel = supabase
            .channel("dashboard-tickets")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tickets" },
                () => cargar()
            )
            .subscribe();

        const usuariosChannel = supabase
            .channel("dashboard-usuarios")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "usuarios" },
                () => cargar()
            )
            .subscribe();

        return () => {
            activo = false;
            supabase.removeChannel(ticketsChannel);
            supabase.removeChannel(usuariosChannel);
        };
    }, []);

    const analytics = useMemo(() => {
        const inicio = fechaInicio ? new Date(`${fechaInicio}T00:00:00`) : null;
        const fin = fechaFin ? new Date(`${fechaFin}T23:59:59.999`) : null;

        const usuariosMap = new Map(
            usuarios.map((usuario) => [
                usuario.id,
                usuario.nombre || usuario.email || "Sin nombre",
            ])
        );

        const filtrados = tickets.filter((ticket) => {
            const createdAt = new Date(ticket.created_at);

            if (inicio && createdAt < inicio) return false;
            if (fin && createdAt > fin) return false;
            return true;
        });

        const total = filtrados.length;
        const abiertos = filtrados.filter((ticket) => ticket.estado === "abierto").length;
        const enProceso = filtrados.filter((ticket) => ticket.estado === "en_proceso").length;
        const cerrados = filtrados.filter((ticket) => ticket.estado === "cerrado").length;

        const promedioGeneral =
            filtrados.reduce((acc, ticket) => acc + calcularDuracionHoras(ticket), 0) /
            (filtrados.length || 1);

        const rangoDias = [];
        if (inicio && fin && inicio <= fin) {
            const cursor = new Date(inicio);

            while (cursor <= fin) {
                rangoDias.push(formatDateInput(cursor));
                cursor.setDate(cursor.getDate() + 1);
            }
        }

        const ticketsPorDiaMap = new Map(rangoDias.map((dia) => [dia, 0]));
        filtrados.forEach((ticket) => {
            const dia = formatDateInput(new Date(ticket.created_at));
            ticketsPorDiaMap.set(dia, (ticketsPorDiaMap.get(dia) || 0) + 1);
        });

        const ticketsPorDia = [...ticketsPorDiaMap.entries()].map(([dia, totalDia]) => ({
            dia,
            label: formatShortDate(dia),
            tickets: totalDia,
        }));

        const tecnicosMap = new Map();
        filtrados.forEach((ticket) => {
            const tecnicoId = ticket.asignado_a || "sin-asignar";
            const tecnicoNombre =
                tecnicoId === "sin-asignar"
                    ? "Sin asignar"
                    : usuariosMap.get(tecnicoId) || "Técnico";

            const actual = tecnicosMap.get(tecnicoId) || {
                tecnico: tecnicoNombre,
                tickets: 0,
                totalHoras: 0,
            };

            actual.tickets += 1;
            actual.totalHoras += calcularDuracionHoras(ticket);

            tecnicosMap.set(tecnicoId, actual);
        });

        const ticketsPorTecnico = [...tecnicosMap.values()]
            .map((item) => ({
                tecnico: item.tecnico,
                tickets: item.tickets,
            }))
            .sort((a, b) => b.tickets - a.tickets)
            .slice(0, 6);

        const tiempoPromedioPorTecnico = [...tecnicosMap.values()]
            .filter((item) => item.tickets > 0)
            .map((item) => ({
                tecnico: item.tecnico,
                horas: Number((item.totalHoras / item.tickets).toFixed(1)),
            }))
            .sort((a, b) => b.horas - a.horas)
            .slice(0, 6);

        const estadoDistribucion = [
            { name: "Abiertos", value: abiertos },
            { name: "En proceso", value: enProceso },
            { name: "Cerrados", value: cerrados },
        ];

        const recientes = [...filtrados]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);

        return {
            filtrados,
            total,
            abiertos,
            enProceso,
            cerrados,
            promedioGeneral,
            ticketsPorDia,
            ticketsPorTecnico,
            tiempoPromedioPorTecnico,
            estadoDistribucion,
            recientes,
            tecnicosActivos: ticketsPorTecnico.length,
        };
    }, [tickets, usuarios, fechaInicio, fechaFin]);

    if (loading) {
        return <Skeleton />;
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                            <Gauge className="h-3.5 w-3.5" />
                            Analytics BI
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                            Dashboard operativo estilo Power BI
                        </h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                            Visualiza volumen de tickets, distribución por técnico y tiempos promedio con una lectura ejecutiva y operativa del soporte.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 backdrop-blur-xl">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                Fecha inicio
                            </span>
                            <input
                                type="date"
                                value={fechaInicio}
                                max={fechaFin}
                                onChange={(event) => setFechaInicio(event.target.value)}
                                className="mt-2 w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                            />
                        </label>

                        <label className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 backdrop-blur-xl">
                            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                Fecha fin
                            </span>
                            <input
                                type="date"
                                value={fechaFin}
                                min={fechaInicio}
                                onChange={(event) => setFechaFin(event.target.value)}
                                className="mt-2 w-full bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                            />
                        </label>
                    </div>
                </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DashboardCard
                    title="Tickets en rango"
                    value={analytics.total}
                    subtitle={`${formatLongDate(fechaInicio)} al ${formatLongDate(fechaFin)}`}
                    icon={CalendarRange}
                    accentClassName="bg-cyan-400/15"
                />
                <DashboardCard
                    title="Abiertos"
                    value={analytics.abiertos}
                    subtitle={`${analytics.enProceso} en proceso y ${analytics.cerrados} cerrados`}
                    icon={Activity}
                    accentClassName="bg-amber-400/15"
                />
                <DashboardCard
                    title="Técnicos activos"
                    value={analytics.tecnicosActivos}
                    subtitle="Basado en tickets asignados dentro del rango"
                    icon={Users}
                    accentClassName="bg-indigo-400/15"
                />
                <DashboardCard
                    title="Tiempo promedio"
                    value={formatHours(analytics.promedioGeneral || 0)}
                    subtitle="Promedio general del ciclo del ticket"
                    icon={Clock3}
                    accentClassName="bg-emerald-400/15"
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
                <Panel
                    title="Tickets por día"
                    subtitle="Tendencia diaria de creación de tickets en el rango filtrado."
                    Icon={CalendarRange}
                    className="xl:col-span-7"
                >
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.ticketsPorDia}>
                                <defs>
                                    <linearGradient id="ticketsTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6} />
                                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: "rgba(2, 6, 23, 0.9)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: "16px",
                                        color: "#fff",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="tickets"
                                    stroke="#38bdf8"
                                    fill="url(#ticketsTrend)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>

                <Panel
                    title="Distribución por estado"
                    subtitle="Balance actual de tickets abiertos, en proceso y cerrados."
                    Icon={PieChartIcon}
                    className="xl:col-span-5"
                >
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analytics.estadoDistribucion}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={72}
                                    outerRadius={108}
                                    paddingAngle={4}
                                >
                                    {analytics.estadoDistribucion.map((entry, index) => (
                                        <Cell
                                            key={`${entry.name}-${index}`}
                                            fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: "rgba(2, 6, 23, 0.9)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: "16px",
                                        color: "#fff",
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {analytics.estadoDistribucion.map((item, index) => (
                            <div
                                key={item.name}
                                className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3"
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }}
                                    />
                                    <span className="text-sm text-slate-300">{item.name}</span>
                                </div>
                                <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </Panel>

                <Panel
                    title="Tickets por técnico"
                    subtitle="Carga operativa por técnico asignado."
                    Icon={Users}
                    className="xl:col-span-6"
                >
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.ticketsPorTecnico} layout="vertical" margin={{ left: 12 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                                <XAxis type="number" stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                                <YAxis
                                    type="category"
                                    dataKey="tecnico"
                                    stroke="#94a3b8"
                                    tickLine={false}
                                    axisLine={false}
                                    width={110}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "rgba(2, 6, 23, 0.9)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: "16px",
                                        color: "#fff",
                                    }}
                                />
                                <Bar dataKey="tickets" fill="#60a5fa" radius={[0, 10, 10, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>

                <Panel
                    title="Tiempo promedio por técnico"
                    subtitle="Promedio de horas por ticket según técnico asignado."
                    Icon={Clock3}
                    className="xl:col-span-6"
                >
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.tiempoPromedioPorTecnico}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                                <XAxis
                                    dataKey="tecnico"
                                    stroke="#94a3b8"
                                    tickLine={false}
                                    axisLine={false}
                                    interval={0}
                                    angle={-12}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                                <Tooltip
                                    formatter={(value) => [formatHours(Number(value)), "Promedio"]}
                                    contentStyle={{
                                        background: "rgba(2, 6, 23, 0.9)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: "16px",
                                        color: "#fff",
                                    }}
                                />
                                <Bar dataKey="horas" fill="#34d399" radius={[10, 10, 0, 0]} barSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>

                <Panel
                    title="Últimos tickets"
                    subtitle="Vista rápida de actividad reciente dentro del rango."
                    Icon={Filter}
                    className="xl:col-span-12"
                >
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        {analytics.recientes.length === 0 ? (
                            <div className="col-span-full rounded-3xl border border-dashed border-white/10 bg-slate-950/30 px-6 py-12 text-center text-sm text-slate-400">
                                No hay tickets en el rango seleccionado.
                            </div>
                        ) : (
                            analytics.recientes.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="rounded-3xl border border-white/10 bg-slate-950/35 p-4 transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.06]"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                                            {ticket.estado.replace("_", " ")}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            #{ticket.id}
                                        </span>
                                    </div>

                                    <p className="mt-4 line-clamp-2 text-sm font-semibold text-white">
                                        {ticket.titulo}
                                    </p>
                                    <p className="mt-2 text-xs text-slate-400">
                                        {formatLongDate(ticket.created_at)}
                                    </p>
                                    <p className="mt-3 text-xs text-slate-500">
                                        Prioridad: {ticket.prioridad || "Sin definir"}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </Panel>
            </div>
        </div>
    );
}
