import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    ArrowDownRight,
    ArrowUpRight,
    CalendarRange,
    CheckCheck,
    Clock3,
    Gauge,
    Inbox,
    Minus,
    PieChart as PieChartIcon,
    Sparkles,
    TrendingUp,
    Users,
    Workflow,
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
    Sector,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { supabase } from "../services/supabase";
import Skeleton from "../components/skeleton";
import {
    MotionItem,
    MotionPage,
    MotionSection,
    MotionStagger,
} from "../components/AppMotion";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import SectionHeader from "../components/ui/SectionHeader";
import Surface from "../components/ui/Surface";
import {
    Table,
    TableBody,
    TableCell,
    TableEmpty,
    TableHead,
    TableHeaderCell,
    TableRow,
} from "../components/ui/Table";

const DATE_PRESETS = [
    { label: "7D", days: 7 },
    { label: "30D", days: 30 },
    { label: "90D", days: 90 },
];

const STATUS_COLORS = {
    abierto: "#dd8b2f",
    en_proceso: "#1a73e8",
    cerrado: "#2f9863",
};

const CHART_COLORS = {
    line: "#1a73e8",
    lineFill: "#74a7f6",
    techStart: "#1a73e8",
    techEnd: "#74a7f6",
    timeStart: "#5e738f",
    timeEnd: "#8da1bc",
    grid: "rgba(26, 115, 232, 0.12)",
    activeDotStroke: "var(--app-bg-elevated)",
};

const DASHBOARD_SURFACES = {
    tooltipShadow: "0 18px 48px rgba(29, 35, 32, 0.14)",
    panelShadow: "0 18px 48px rgba(29, 35, 32, 0.08)",
    panelShadowStrong: "0 20px 54px rgba(29, 35, 32, 0.1)",
    heroShadow: "0 26px 72px rgba(29, 35, 32, 0.12)",
};

const KPI_ACCENTS = {
    range: {
        borderColor:
            "color-mix(in srgb, var(--brand-secondary) 20%, transparent)",
        background:
            "linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 76%, white 24%) 0%, color-mix(in srgb, var(--brand-accent) 72%, var(--brand-primary) 28%) 100%)",
        boxShadow: "0 12px 28px rgba(29, 35, 32, 0.12)",
    },
    closure: {
        borderColor:
            "color-mix(in srgb, var(--brand-success) 20%, transparent)",
        background:
            "linear-gradient(135deg, color-mix(in srgb, var(--brand-success) 78%, white 22%) 0%, color-mix(in srgb, var(--brand-primary) 76%, var(--brand-secondary) 24%) 100%)",
        boxShadow: "0 12px 28px rgba(29, 35, 32, 0.12)",
    },
    team: {
        borderColor:
            "color-mix(in srgb, var(--brand-primary) 22%, transparent)",
        background:
            "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 82%, white 18%) 0%, color-mix(in srgb, var(--brand-highlight) 58%, var(--brand-primary) 42%) 100%)",
        boxShadow: "0 12px 28px rgba(29, 35, 32, 0.12)",
    },
    time: {
        borderColor:
            "color-mix(in srgb, var(--brand-highlight) 24%, transparent)",
        background:
            "linear-gradient(135deg, color-mix(in srgb, var(--brand-highlight) 82%, white 18%) 0%, color-mix(in srgb, var(--brand-secondary) 58%, var(--brand-primary) 42%) 100%)",
        boxShadow: "0 12px 28px rgba(29, 35, 32, 0.12)",
    },
};

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

function formatDateTime(value) {
    return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatHours(value) {
    return `${value.toFixed(1)} h`;
}

function formatPercent(value) {
    return `${new Intl.NumberFormat("es-CO", {
        maximumFractionDigits: value % 1 === 0 ? 0 : 1,
    }).format(value)}%`;
}

function shortTicketId(id) {
    if (!id) return "Sin ID";
    return String(id).slice(0, 8);
}

function shortenLabel(value, max = 24) {
    const label = String(value || "").trim();

    if (!label) return "Sin asignar";
    if (label.length <= max) return label;

    return `${label.slice(0, max - 1)}…`;
}

function preventChartFocus(event) {
    event.preventDefault();
}

function renderDonutSector(props) {
    return <Sector {...props} stroke="none" strokeWidth={0} style={{ outline: "none" }} />;
}

function calcularDuracionHoras(ticket) {
    const inicio = new Date(ticket.created_at);
    const fin =
        ticket.estado === "cerrado" && ticket.updated_at
            ? new Date(ticket.updated_at)
            : new Date();

    return Math.max((fin - inicio) / (1000 * 60 * 60), 0);
}

function filtrarTicketsPorRango(lista, inicio, fin) {
    return lista.filter((ticket) => {
        const createdAt = new Date(ticket.created_at);

        if (inicio && createdAt < inicio) return false;
        if (fin && createdAt > fin) return false;
        return true;
    });
}

function getRangeDays(inicio, fin) {
    if (!inicio || !fin) return 0;

    return Math.max(
        Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        1
    );
}

function getPreviousRange(inicio, rangeDays) {
    if (!inicio || !rangeDays) {
        return { inicio: null, fin: null };
    }

    const previousFin = new Date(inicio);
    previousFin.setMilliseconds(previousFin.getMilliseconds() - 1);

    const previousInicio = new Date(inicio);
    previousInicio.setDate(previousInicio.getDate() - rangeDays);
    previousInicio.setHours(0, 0, 0, 0);

    return {
        inicio: previousInicio,
        fin: previousFin,
    };
}

function statusTone(estado) {
    if (estado === "cerrado") return "success";
    if (estado === "en_proceso") return "info";
    return "warning";
}

function priorityTone(prioridad) {
    const normalized = String(prioridad || "").toLowerCase();

    if (normalized === "alta" || normalized === "high") return "danger";
    if (
        normalized === "media" ||
        normalized === "medium" ||
        normalized === "normal"
    ) {
        return "warning";
    }

    return "success";
}

function formatPriorityLabel(prioridad) {
    const normalized = String(prioridad || "").toLowerCase();

    if (normalized === "high") return "Alta";
    if (normalized === "medium") return "Media";
    if (normalized === "low") return "Baja";
    if (!normalized) return "Sin definir";
    return prioridad;
}

function buildSummary(lista, usuariosMap) {
    const total = lista.length;
    const abiertos = lista.filter((ticket) => ticket.estado === "abierto").length;
    const enProceso = lista.filter(
        (ticket) => ticket.estado === "en_proceso"
    ).length;
    const cerrados = lista.filter((ticket) => ticket.estado === "cerrado").length;
    const sinAsignar = lista.filter((ticket) => !ticket.asignado_a).length;

    const promedioHoras =
        lista.reduce((acc, ticket) => acc + calcularDuracionHoras(ticket), 0) /
        (total || 1);

    const tecnicosMap = new Map();

    lista.forEach((ticket) => {
        const tecnicoId = ticket.asignado_a || "sin-asignar";
        const tecnicoNombre =
            tecnicoId === "sin-asignar"
                ? "Sin asignar"
                : usuariosMap.get(tecnicoId) || "Tecnico";

        const actual = tecnicosMap.get(tecnicoId) || {
            id: tecnicoId,
            tecnico: tecnicoNombre,
            tickets: 0,
            totalHoras: 0,
        };

        actual.tickets += 1;
        actual.totalHoras += calcularDuracionHoras(ticket);
        tecnicosMap.set(tecnicoId, actual);
    });

    const tecnicosRows = [...tecnicosMap.values()].map((item) => ({
        ...item,
        horas: Number((item.totalHoras / item.tickets).toFixed(1)),
    }));

    const tecnicosAsignados = tecnicosRows.filter(
        (item) => item.id !== "sin-asignar"
    );

    const topTecnico = [...tecnicosAsignados].sort(
        (a, b) => b.tickets - a.tickets
    )[0] || null;

    return {
        total,
        abiertos,
        enProceso,
        cerrados,
        sinAsignar,
        promedioHoras,
        tecnicosActivos: tecnicosAsignados.length,
        tecnicosRows,
        topTecnico,
    };
}

function buildChange(current, previous, options = {}) {
    const { inverse = false, formatter } = options;

    if (!previous && !current) {
        return {
            tone: "neutral",
            icon: Minus,
            value: "0%",
            context: "Sin cambios",
            detail: "Sin referencia previa",
        };
    }

    if (!previous && current > 0) {
        return {
            tone: inverse ? "negative" : "positive",
            icon: ArrowUpRight,
            value: "Nuevo",
            context: "Sin base previa",
            detail: formatter ? formatter(current) : current,
        };
    }

    const diff = current - previous;

    if (diff === 0) {
        return {
            tone: "neutral",
            icon: Minus,
            value: "0%",
            context: "Sin cambios",
            detail: formatter ? formatter(previous) : previous,
        };
    }

    const improved = inverse ? diff < 0 : diff > 0;
    const percent = Math.abs((diff / previous) * 100);

    return {
        tone: improved ? "positive" : "negative",
        icon: diff > 0 ? ArrowUpRight : ArrowDownRight,
        value: `${diff > 0 ? "+" : "-"}${new Intl.NumberFormat("es-CO", {
            maximumFractionDigits: percent >= 10 ? 0 : 1,
        }).format(percent)}%`,
        context: diff > 0 ? "vs periodo anterior" : "frente al periodo anterior",
        detail: `${diff > 0 ? "+" : "-"}${formatter ? formatter(Math.abs(diff)) : Math.abs(diff)}`,
    };
}

function getTrendToneStyle(tone) {
    if (tone === "positive") {
        return {
            borderColor: "color-mix(in srgb, var(--brand-success) 18%, transparent)",
            background: "color-mix(in srgb, var(--brand-success) 12%, transparent)",
            color: "color-mix(in srgb, var(--brand-success) 82%, var(--app-text-strong) 18%)",
        };
    }

    if (tone === "negative") {
        return {
            borderColor: "color-mix(in srgb, var(--brand-danger) 18%, transparent)",
            background: "color-mix(in srgb, var(--brand-danger) 12%, transparent)",
            color: "color-mix(in srgb, var(--brand-danger) 82%, var(--app-text-strong) 18%)",
        };
    }

    return {
        borderColor: "var(--app-border)",
        background: "color-mix(in srgb, var(--app-surface-muted) 82%, transparent)",
        color: "var(--app-text-secondary)",
    };
}

function getActivityIconStyle(estado) {
    if (estado === "cerrado") {
        return {
            borderColor: "color-mix(in srgb, var(--brand-success) 18%, transparent)",
            background: "color-mix(in srgb, var(--brand-success) 12%, transparent)",
            color: "color-mix(in srgb, var(--brand-success) 82%, var(--app-text-strong) 18%)",
        };
    }

    if (estado === "en_proceso") {
        return {
            borderColor: "color-mix(in srgb, var(--brand-secondary) 18%, transparent)",
            background: "color-mix(in srgb, var(--brand-secondary) 12%, transparent)",
            color: "color-mix(in srgb, var(--brand-secondary) 82%, var(--app-text-strong) 18%)",
        };
    }

    return {
        borderColor: "color-mix(in srgb, var(--brand-warning) 18%, transparent)",
        background: "color-mix(in srgb, var(--brand-warning) 12%, transparent)",
        color: "color-mix(in srgb, var(--brand-warning) 82%, var(--app-text-strong) 18%)",
    };
}

function DashboardTooltip({
    active,
    payload,
    label,
    labelFormatter,
    valueFormatter,
}) {
    if (!active || !payload?.length) return null;

    return (
        <div
            className="app-surface-elevated min-w-[12rem] rounded-[1.2rem] px-4 py-3"
            style={{ boxShadow: DASHBOARD_SURFACES.tooltipShadow }}
        >
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                {labelFormatter ? labelFormatter(label, payload) : label}
            </p>

            <div className="mt-3 space-y-2">
                {payload.map((item) => (
                    <div
                        key={`${item.dataKey}-${item.name}`}
                        className="flex items-center justify-between gap-4 text-sm"
                    >
                        <div className="flex items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: item.color || item.fill }}
                            />
                            <span className="text-[color:var(--app-text-secondary)]">
                                {item.name}
                            </span>
                        </div>
                        <span className="font-semibold text-[color:var(--app-text-primary)]">
                            {valueFormatter
                                ? valueFormatter(item.value, item.name)
                                : item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function KpiCard({ title, value, context, trend, icon, accentStyle }) {
    const TrendIcon = trend.icon;
    const CardIcon = icon;

    return (
        <Surface
            variant="default"
            interactive
            className="rounded-[1.9rem] p-5"
            style={{ boxShadow: DASHBOARD_SURFACES.panelShadow }}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                        {title}
                    </p>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--app-text-primary)]">
                        {value}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                        {context}
                    </p>
                </div>

                <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] border"
                    style={accentStyle}
                >
                    <CardIcon className="h-5 w-5 text-[color:var(--app-bg-elevated)]" />
                </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
                <div
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
                    style={getTrendToneStyle(trend.tone)}
                >
                    <TrendIcon className="h-3.5 w-3.5" />
                    {trend.value}
                </div>

                <div className="min-w-0 text-right">
                    <p className="text-xs text-[color:var(--app-text-tertiary)]">
                        {trend.context}
                    </p>
                    <p className="text-xs font-medium text-[color:var(--app-text-secondary)]">
                        {trend.detail}
                    </p>
                </div>
            </div>
        </Surface>
    );
}

function AnalyticsPanel({
    title,
    description,
    icon: Icon,
    actions,
    className,
    children,
}) {
    return (
        <Surface
            variant="default"
            interactive
            className={`min-w-0 rounded-[2rem] p-5 sm:p-6 ${className || ""}`}
            style={{ boxShadow: DASHBOARD_SURFACES.panelShadow }}
        >
            <SectionHeader
                title={title}
                description={description}
                icon={Icon}
                actions={actions}
            />
            <div className="mt-6">{children}</div>
        </Surface>
    );
}

function InsightCard({ label, value, helper }) {
    const resolvedValue = value || "Sin datos";

    return (
        <Surface variant="muted" className="min-w-0 rounded-[1.4rem] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                {label}
            </p>
            <p
                title={resolvedValue}
                className="app-break-anywhere mt-2 min-w-0 text-lg font-semibold leading-7 text-[color:var(--app-text-primary)]"
            >
                {resolvedValue}
            </p>
            <p className="app-break-anywhere mt-2 text-xs leading-6 text-[color:var(--app-text-secondary)]">
                {helper}
            </p>
        </Surface>
    );
}

function ActivityItem({ ticket }) {
    const Icon =
        ticket.estado === "cerrado"
            ? CheckCheck
            : ticket.estado === "en_proceso"
              ? Activity
              : Inbox;

    return (
        <div className="app-surface-muted flex items-start gap-4 rounded-[1.5rem] p-4">
            <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border"
                style={getActivityIconStyle(ticket.estado)}
            >
                <Icon className="h-4.5 w-4.5" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[color:var(--app-text-primary)]">
                        {ticket.titulo}
                    </p>
                    <Badge tone={statusTone(ticket.estado)} size="sm">
                        {ticket.estado.replace("_", " ")}
                    </Badge>
                </div>

                <p className="mt-2 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                    Ticket #{shortTicketId(ticket.id)} actualizado el{" "}
                    {formatDateTime(ticket.updated_at || ticket.created_at)}.
                </p>
            </div>
        </div>
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
        const rangeDays = getRangeDays(inicio, fin);
        const previousRange = getPreviousRange(inicio, rangeDays);

        const usuariosMap = new Map(
            usuarios.map((usuario) => [
                usuario.id,
                usuario.nombre || usuario.email || "Sin nombre",
            ])
        );

        const currentTickets = filtrarTicketsPorRango(tickets, inicio, fin);
        const previousTickets = previousRange.inicio
            ? filtrarTicketsPorRango(tickets, previousRange.inicio, previousRange.fin)
            : [];

        const currentSummary = buildSummary(currentTickets, usuariosMap);
        const previousSummary = buildSummary(previousTickets, usuariosMap);

        const ticketsPorDiaMap = new Map();

        if (inicio && fin && inicio <= fin) {
            const cursor = new Date(inicio);

            while (cursor <= fin) {
                ticketsPorDiaMap.set(formatDateInput(cursor), 0);
                cursor.setDate(cursor.getDate() + 1);
            }
        }

        currentTickets.forEach((ticket) => {
            const dia = formatDateInput(new Date(ticket.created_at));
            ticketsPorDiaMap.set(dia, (ticketsPorDiaMap.get(dia) || 0) + 1);
        });

        const ticketsPorDia = [...ticketsPorDiaMap.entries()].map(([dia, total]) => ({
            dia,
            label: formatShortDate(dia),
            tickets: total,
        }));

        const estadoDistribucion = [
            {
                key: "abierto",
                name: "Abiertos",
                value: currentSummary.abiertos,
                fill: STATUS_COLORS.abierto,
            },
            {
                key: "en_proceso",
                name: "En proceso",
                value: currentSummary.enProceso,
                fill: STATUS_COLORS.en_proceso,
            },
            {
                key: "cerrado",
                name: "Cerrados",
                value: currentSummary.cerrados,
                fill: STATUS_COLORS.cerrado,
            },
        ];

        const ticketsPorTecnico = [...currentSummary.tecnicosRows]
            .map((item) => ({
                tecnico: item.tecnico,
                tecnicoLabel: shortenLabel(item.tecnico, 18),
                tickets: item.tickets,
            }))
            .sort((a, b) => b.tickets - a.tickets)
            .slice(0, 6);

        const tiempoPromedioPorTecnico = [...currentSummary.tecnicosRows]
            .filter((item) => item.tickets > 0)
            .map((item) => ({
                tecnico: item.tecnico,
                tecnicoLabel: shortenLabel(item.tecnico, 16),
                horas: Number(item.horas.toFixed(1)),
            }))
            .sort((a, b) => b.horas - a.horas)
            .slice(0, 6);

        const recientes = [...currentTickets]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 6);

        const actividadReciente = [...currentTickets]
            .sort(
                (a, b) =>
                    new Date(b.updated_at || b.created_at) -
                    new Date(a.updated_at || a.created_at)
            )
            .slice(0, 6);

        const averageDaily = rangeDays ? currentSummary.total / rangeDays : 0;
        const previousAverageDaily = rangeDays
            ? previousSummary.total / rangeDays
            : 0;

        const resolutionRate = currentSummary.total
            ? (currentSummary.cerrados / currentSummary.total) * 100
            : 0;
        const previousResolutionRate = previousSummary.total
            ? (previousSummary.cerrados / previousSummary.total) * 100
            : 0;

        const peakDay = ticketsPorDia.reduce(
            (peak, current) => (current.tickets > peak.tickets ? current : peak),
            { dia: null, label: "-", tickets: 0 }
        );

        const dominantStatus = estadoDistribucion.reduce(
            (winner, current) => (current.value > winner.value ? current : winner),
            estadoDistribucion[0] || {
                key: "abierto",
                name: "Abiertos",
                value: 0,
                fill: STATUS_COLORS.abierto,
            }
        );

        return {
            rangeDays,
            currentSummary,
            previousSummary,
            previousRange,
            resolutionRate,
            previousResolutionRate,
            averageDaily,
            previousAverageDaily,
            ticketsPorDia,
            ticketsPorTecnico,
            tiempoPromedioPorTecnico,
            estadoDistribucion,
            recientes,
            actividadReciente,
            peakDay,
            dominantStatus,
        };
    }, [tickets, usuarios, fechaInicio, fechaFin]);

    function setPresetRange(days) {
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - (days - 1));
        setFechaInicio(formatDateInput(start));
        setFechaFin(formatDateInput(today));
    }

    const activePreset = DATE_PRESETS.find((preset) => {
        const inicio = new Date(`${fechaInicio}T00:00:00`);
        const fin = new Date(`${fechaFin}T00:00:00`);
        return getRangeDays(inicio, fin) === preset.days;
    })?.days;

    const kpis = [
        {
            title: "Tickets en rango",
            value: analytics.currentSummary.total,
            context: `${formatLongDate(fechaInicio)} al ${formatLongDate(fechaFin)}`,
            trend: buildChange(
                analytics.currentSummary.total,
                analytics.previousSummary.total
            ),
            icon: CalendarRange,
            accentStyle: KPI_ACCENTS.range,
        },
        {
            title: "Tasa de cierre",
            value: formatPercent(analytics.resolutionRate),
            context: `${analytics.currentSummary.cerrados} tickets resueltos en el periodo`,
            trend: buildChange(analytics.resolutionRate, analytics.previousResolutionRate),
            icon: CheckCheck,
            accentStyle: KPI_ACCENTS.closure,
        },
        {
            title: "Tecnicos activos",
            value: analytics.currentSummary.tecnicosActivos,
            context: `${analytics.currentSummary.sinAsignar} ticket(s) sin asignar`,
            trend: buildChange(
                analytics.currentSummary.tecnicosActivos,
                analytics.previousSummary.tecnicosActivos
            ),
            icon: Users,
            accentStyle: KPI_ACCENTS.team,
        },
        {
            title: "Tiempo promedio",
            value: formatHours(analytics.currentSummary.promedioHoras || 0),
            context: "Promedio del ciclo del ticket dentro del rango",
            trend: buildChange(
                analytics.currentSummary.promedioHoras,
                analytics.previousSummary.promedioHoras,
                { inverse: true, formatter: formatHours }
            ),
            icon: Clock3,
            accentStyle: KPI_ACCENTS.time,
        },
    ];

    if (loading) {
        return <Skeleton />;
    }

    return (
        <MotionPage className="space-y-6 p-4 sm:p-6">
            <MotionSection
                className="app-surface-hero rounded-[2.4rem] p-5 sm:p-6 lg:p-7"
                style={{ boxShadow: DASHBOARD_SURFACES.heroShadow }}
            >
                <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                    <div>
                        <div className="app-kicker">
                            <Gauge className="h-3.5 w-3.5" />
                            Analytics overview
                        </div>

                        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-3xl">
                                <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--app-text-primary)] sm:text-4xl">
                                    Dashboard ejecutivo para decisiones rapidas
                                </h1>
                                <p className="mt-3 text-sm leading-7 text-[color:var(--app-text-secondary)]">
                                    Lectura operativa del soporte con foco en carga, resolucion, ritmo diario y distribucion de tickets en el periodo filtrado.
                                </p>
                            </div>

                            <div className="app-surface-muted inline-flex rounded-full px-4 py-2 text-sm font-medium text-[color:var(--app-text-secondary)]">
                                {formatLongDate(fechaInicio)} - {formatLongDate(fechaFin)}
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <InsightCard
                                label="Abiertos"
                                value={analytics.currentSummary.abiertos}
                                helper="Pendientes de atencion inicial"
                            />
                            <InsightCard
                                label="En proceso"
                                value={analytics.currentSummary.enProceso}
                                helper="Casos en trabajo activo"
                            />
                            <InsightCard
                                label="Cerrados"
                                value={analytics.currentSummary.cerrados}
                                helper="Tickets que ya salieron del flujo"
                            />
                            <InsightCard
                                label="Pico diario"
                                value={
                                    analytics.peakDay.tickets > 0
                                        ? `${analytics.peakDay.tickets} ticket(s)`
                                        : "Sin pico"
                                }
                                helper={
                                    analytics.peakDay.dia
                                        ? `Mayor volumen el ${formatLongDate(analytics.peakDay.dia)}`
                                        : "No hubo actividad en el rango"
                                }
                            />
                        </div>
                    </div>

                    <Surface
                        variant="elevated"
                        className="rounded-[2rem] p-5"
                        style={{ boxShadow: DASHBOARD_SURFACES.panelShadowStrong }}
                    >
                        <SectionHeader
                            eyebrow="Filtros"
                            title="Control de rango"
                            description="Ajusta el periodo y compara el comportamiento con la ventana anterior."
                            icon={CalendarRange}
                        />

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <Input
                                label="Fecha inicio"
                                type="date"
                                value={fechaInicio}
                                max={fechaFin}
                                onChange={(event) => setFechaInicio(event.target.value)}
                                className="text-sm"
                            />
                            <Input
                                label="Fecha fin"
                                type="date"
                                value={fechaFin}
                                min={fechaInicio}
                                onChange={(event) => setFechaFin(event.target.value)}
                                className="text-sm"
                            />
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            {DATE_PRESETS.map((preset) => (
                                <Button
                                    key={preset.days}
                                    variant={
                                        activePreset === preset.days ? "secondary" : "ghost"
                                    }
                                    size="sm"
                                    className={
                                        activePreset === preset.days
                                            ? "border-[color:rgba(68,166,106,0.22)] bg-[color:rgba(68,166,106,0.12)] text-[color:var(--app-text-primary)]"
                                            : ""
                                    }
                                    onClick={() => setPresetRange(preset.days)}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <InsightCard
                                label="Comparativo"
                                value={
                                    analytics.previousRange.inicio
                                        ? `${formatLongDate(
                                              analytics.previousRange.inicio
                                          )} - ${formatLongDate(
                                              analytics.previousRange.fin
                                          )}`
                                        : "Sin referencia"
                                }
                                helper="Ventana anterior del mismo tamano"
                            />
                            <InsightCard
                                label="Promedio diario"
                                value={`${analytics.averageDaily.toFixed(1)} / dia`}
                                helper={`${analytics.currentSummary.total} ticket(s) en ${analytics.rangeDays} dia(s)`}
                            />
                        </div>
                    </Surface>
                </div>
            </MotionSection>

            <MotionStagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => (
                    <MotionItem key={kpi.title}>
                        <KpiCard {...kpi} />
                    </MotionItem>
                ))}
            </MotionStagger>

            <MotionStagger className="grid gap-6 xl:grid-cols-12" delayChildren={0.08}>
                <MotionItem className="xl:col-span-8">
                    <AnalyticsPanel
                        title="Tendencia diaria de tickets"
                        description="Volumen por dia dentro del rango activo, con lectura rapida del ritmo operativo."
                        icon={TrendingUp}
                        actions={
                            <div className="app-surface-muted rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)]">
                                {analytics.averageDaily.toFixed(1)} / dia
                            </div>
                        }
                    >
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.ticketsPorDia}>
                                    <defs>
                                        <linearGradient
                                            id="ticketsTrendGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor={CHART_COLORS.lineFill}
                                                stopOpacity={0.28}
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor={CHART_COLORS.lineFill}
                                                stopOpacity={0.02}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="4 4"
                                        stroke={CHART_COLORS.grid}
                                    />
                                    <XAxis
                                        dataKey="label"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: "var(--app-text-tertiary)", fontSize: 12 }}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        allowDecimals={false}
                                        tick={{ fill: "var(--app-text-tertiary)", fontSize: 12 }}
                                    />
                                    <Tooltip
                                        cursor={false}
                                        content={
                                            <DashboardTooltip
                                                labelFormatter={(label) => `Dia ${label}`}
                                            />
                                        }
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="tickets"
                                        name="Tickets"
                                        stroke={CHART_COLORS.line}
                                        fill="url(#ticketsTrendGradient)"
                                        strokeWidth={3}
                                        activeDot={{
                                            r: 5,
                                            stroke: CHART_COLORS.activeDotStroke,
                                            strokeWidth: 2,
                                            fill: CHART_COLORS.line,
                                        }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalyticsPanel>
                </MotionItem>

                <MotionItem className="xl:col-span-4">
                    <AnalyticsPanel
                        title="Salud del flujo"
                        description="Distribucion actual por estado e insights rapidos del periodo."
                        icon={PieChartIcon}
                    >
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart
                                    accessibilityLayer={false}
                                    tabIndex={-1}
                                    role="presentation"
                                    style={{ outline: "none" }}
                                >
                                    <Pie
                                        data={analytics.estadoDistribucion}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={62}
                                        outerRadius={92}
                                        paddingAngle={4}
                                        rootTabIndex={-1}
                                        stroke="none"
                                        strokeWidth={0}
                                        shape={renderDonutSector}
                                        activeShape={renderDonutSector}
                                        inactiveShape={renderDonutSector}
                                        onMouseDown={preventChartFocus}
                                        onPointerDown={preventChartFocus}
                                    >
                                        {analytics.estadoDistribucion.map((entry) => (
                                            <Cell
                                                key={entry.key}
                                                fill={entry.fill}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        cursor={false}
                                        content={<DashboardTooltip />}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 space-y-3">
                            {analytics.estadoDistribucion.map((item) => (
                                <div
                                    key={item.key}
                                    className="app-surface-muted flex items-center justify-between rounded-[1.25rem] px-4 py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: item.fill }}
                                        />
                                        <span className="text-sm text-[color:var(--app-text-secondary)]">
                                            {item.name}
                                        </span>
                                    </div>
                                    <span className="text-sm font-semibold text-[color:var(--app-text-primary)]">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 grid gap-3">
                            <InsightCard
                                label="Estado dominante"
                                value={analytics.dominantStatus.name}
                                helper={`${analytics.dominantStatus.value} ticket(s) en esta etapa`}
                            />
                            <InsightCard
                                label="Top tecnico"
                                value={
                                    analytics.currentSummary.topTecnico?.tecnico ||
                                    "Sin asignaciones"
                                }
                                helper={
                                    analytics.currentSummary.topTecnico
                                        ? `${analytics.currentSummary.topTecnico.tickets} ticket(s) a cargo`
                                        : "Todavia no hay responsables definidos"
                                }
                            />
                        </div>
                    </AnalyticsPanel>
                </MotionItem>

                <MotionItem className="xl:col-span-7">
                    <AnalyticsPanel
                        title="Carga por tecnico"
                        description="Distribucion de tickets asignados por tecnico dentro del rango seleccionado."
                        icon={Users}
                    >
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={analytics.ticketsPorTecnico}
                                    layout="vertical"
                                    margin={{ left: 8 }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="techLoadGradient"
                                            x1="0"
                                            y1="0"
                                            x2="1"
                                            y2="0"
                                        >
                                            <stop offset="0%" stopColor={CHART_COLORS.techStart} />
                                            <stop offset="100%" stopColor={CHART_COLORS.techEnd} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="4 4"
                                        stroke={CHART_COLORS.grid}
                                    />
                                    <XAxis
                                        type="number"
                                        tickLine={false}
                                        axisLine={false}
                                        allowDecimals={false}
                                        tick={{ fill: "var(--app-text-tertiary)", fontSize: 12 }}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="tecnicoLabel"
                                        tickLine={false}
                                        axisLine={false}
                                        width={118}
                                        tick={{ fill: "var(--app-text-tertiary)", fontSize: 12 }}
                                    />
                                    <Tooltip
                                        cursor={false}
                                        content={
                                            <DashboardTooltip
                                                labelFormatter={(_, payload) =>
                                                    payload?.[0]?.payload?.tecnico || "Tecnico"
                                                }
                                            />
                                        }
                                    />
                                    <Bar
                                        dataKey="tickets"
                                        name="Tickets"
                                        fill="url(#techLoadGradient)"
                                        radius={[0, 12, 12, 0]}
                                        barSize={18}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalyticsPanel>
                </MotionItem>

                <MotionItem className="xl:col-span-5">
                    <AnalyticsPanel
                        title="Tiempo promedio por tecnico"
                        description="Promedio de horas invertidas por ticket segun el responsable asignado."
                        icon={Clock3}
                    >
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.tiempoPromedioPorTecnico}>
                                    <defs>
                                        <linearGradient
                                            id="techTimeGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop offset="0%" stopColor={CHART_COLORS.timeStart} />
                                            <stop offset="100%" stopColor={CHART_COLORS.timeEnd} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="4 4"
                                        stroke={CHART_COLORS.grid}
                                    />
                                    <XAxis
                                        dataKey="tecnicoLabel"
                                        tickLine={false}
                                        axisLine={false}
                                        interval={0}
                                        angle={-12}
                                        textAnchor="end"
                                        height={62}
                                        tick={{ fill: "var(--app-text-tertiary)", fontSize: 12 }}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: "var(--app-text-tertiary)", fontSize: 12 }}
                                    />
                                    <Tooltip
                                        cursor={false}
                                        content={
                                            <DashboardTooltip
                                                labelFormatter={(_, payload) =>
                                                    payload?.[0]?.payload?.tecnico || "Tecnico"
                                                }
                                                valueFormatter={(value) =>
                                                    formatHours(Number(value))
                                                }
                                            />
                                        }
                                    />
                                    <Bar
                                        dataKey="horas"
                                        name="Promedio"
                                        fill="url(#techTimeGradient)"
                                        radius={[12, 12, 0, 0]}
                                        barSize={28}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </AnalyticsPanel>
                </MotionItem>

                <MotionItem className="xl:col-span-5">
                    <AnalyticsPanel
                        title="Actividad reciente"
                        description="Ultimos movimientos relevantes del flujo dentro del rango activo."
                        icon={Workflow}
                        actions={
                            <Badge tone="info" size="sm">
                                Realtime
                            </Badge>
                        }
                    >
                        <div className="space-y-3">
                            {analytics.actividadReciente.length === 0 ? (
                                <Surface
                                    variant="muted"
                                    className="rounded-[1.5rem] border border-dashed border-[color:var(--app-border)] p-5 text-sm text-[color:var(--app-text-secondary)]"
                                >
                                    Aun no hay actividad dentro del rango seleccionado.
                                </Surface>
                            ) : (
                                analytics.actividadReciente.map((ticket) => (
                                    <ActivityItem key={ticket.id} ticket={ticket} />
                                ))
                            )}
                        </div>
                    </AnalyticsPanel>
                </MotionItem>

                <MotionItem className="xl:col-span-7">
                    <AnalyticsPanel
                        title="Tickets recientes"
                        description="Listado resumido de los tickets mas recientes para escaneo rapido."
                        icon={Sparkles}
                    >
                        <Table wrapperClassName="rounded-[1.5rem]">
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell>Ticket</TableHeaderCell>
                                    <TableHeaderCell>Estado</TableHeaderCell>
                                    <TableHeaderCell>Prioridad</TableHeaderCell>
                                    <TableHeaderCell>Tecnico</TableHeaderCell>
                                    <TableHeaderCell>Fecha</TableHeaderCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {analytics.recientes.length === 0 ? (
                                    <TableEmpty colSpan={5}>
                                        No hay tickets dentro del rango seleccionado.
                                    </TableEmpty>
                                ) : (
                                    analytics.recientes.map((ticket) => (
                                        <TableRow key={ticket.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-semibold text-[color:var(--app-text-primary)]">
                                                        {ticket.titulo}
                                                    </p>
                                                    <p className="mt-1 font-mono text-xs text-[color:var(--app-text-tertiary)]">
                                                        #{shortTicketId(ticket.id)}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    tone={statusTone(ticket.estado)}
                                                    size="sm"
                                                >
                                                    {ticket.estado.replace("_", " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    tone={priorityTone(ticket.prioridad)}
                                                    size="sm"
                                                >
                                                    {formatPriorityLabel(ticket.prioridad)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {usuarios.find(
                                                    (usuario) =>
                                                        usuario.id === ticket.asignado_a
                                                )?.nombre ||
                                                    usuarios.find(
                                                        (usuario) =>
                                                            usuario.id === ticket.asignado_a
                                                    )?.email ||
                                                    "Sin asignar"}
                                            </TableCell>
                                            <TableCell>{formatLongDate(ticket.created_at)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </AnalyticsPanel>
                </MotionItem>
            </MotionStagger>
        </MotionPage>
    );
}
