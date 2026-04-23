import { useEffect, useState } from "react";
import {
    CheckCircle2,
    Clock3,
    Pencil,
    Plus,
    ShieldCheck,
    Trash2,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { obtenerAuditoria } from "../services/audit";
import Skeleton from "../components/skeleton";
import EmptyState from "../components/EmptyState";
import {
    MotionItem,
    MotionPage,
    MotionSection,
    MotionStagger,
} from "../components/AppMotion";

const ACTION_STYLES = {
    crear: {
        label: "Creacion",
        icon: Plus,
        chipClassName: "bg-sky-400/15 text-sky-200 ring-1 ring-sky-300/20",
        iconClassName: "text-sky-300",
        lineClassName: "from-sky-400/60 via-sky-300/20 to-transparent",
    },
    editar: {
        label: "Edicion",
        icon: Pencil,
        chipClassName: "bg-yellow-400/15 text-yellow-200 ring-1 ring-yellow-300/20",
        iconClassName: "text-yellow-300",
        lineClassName: "from-yellow-400/60 via-yellow-300/20 to-transparent",
    },
    eliminar: {
        label: "Eliminacion",
        icon: Trash2,
        chipClassName: "bg-rose-400/15 text-rose-200 ring-1 ring-rose-300/20",
        iconClassName: "text-rose-300",
        lineClassName: "from-rose-400/60 via-rose-300/20 to-transparent",
    },
    cerrar: {
        label: "Cierre",
        icon: CheckCircle2,
        chipClassName: "bg-violet-400/15 text-violet-200 ring-1 ring-violet-300/20",
        iconClassName: "text-violet-300",
        lineClassName: "from-violet-400/60 via-violet-300/20 to-transparent",
    },
};

function formatoFecha(fecha) {
    return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(fecha));
}

function obtenerEstilo(accion) {
    return ACTION_STYLES[accion] || {
        label: accion || "Accion",
        icon: ShieldCheck,
        chipClassName: "bg-white/10 text-slate-100 ring-1 ring-white/15",
        iconClassName: "text-slate-200",
        lineClassName: "from-slate-300/40 via-slate-300/10 to-transparent",
    };
}

function TimelineItem({ item, isLast }) {
    const style = obtenerEstilo(item.accion);
    const Icon = style.icon;

    return (
        <div className="relative pl-16">
            {!isLast && (
                <div
                    className={`absolute left-[1.15rem] top-12 h-[calc(100%-2.5rem)] w-px bg-gradient-to-b ${style.lineClassName}`}
                />
            )}

            <div className="app-surface-elevated absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-2xl">
                <Icon className={`h-4.5 w-4.5 ${style.iconClassName}`} />
            </div>

            <div className="app-surface-muted rounded-3xl p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${style.chipClassName}`}
                            >
                                {style.label}
                            </span>
                            <span className="text-xs text-[color:var(--app-text-tertiary)]">
                                Ticket #{item.ticket_id}
                            </span>
                        </div>

                        <p className="mt-3 text-sm font-semibold text-[color:var(--app-text-primary)]">
                            {item.usuario}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--app-text-secondary)]">
                            Registro una accion de <span className="text-[color:var(--app-text-primary)]">{style.label.toLowerCase()}</span> sobre el ticket.
                        </p>
                    </div>

                    <div className="app-surface-muted inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-[color:var(--app-text-secondary)]">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatoFecha(item.fecha)}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Auditoria() {
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let activo = true;

        async function cargar() {
            setLoading(true);

            try {
                const data = await obtenerAuditoria();

                if (activo) {
                    setHistorial(data);
                }
            } finally {
                if (activo) {
                    setLoading(false);
                }
            }
        }

        cargar();

        const channel = supabase
            .channel("auditoria-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "auditoria" },
                () => cargar()
            )
            .subscribe();

        return () => {
            activo = false;
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) {
        return <Skeleton />;
    }

    return (
        <MotionPage className="space-y-6">
            <MotionSection className="app-surface-hero rounded-[2rem] p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="app-kicker">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Auditoria
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--app-text-primary)]">
                            Historial de acciones
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--app-text-secondary)]">
                            Traza en tiempo real de movimientos criticos sobre tickets para seguimiento operativo y control interno.
                        </p>
                    </div>

                    <div className="app-surface-muted rounded-2xl px-4 py-3 text-right">
                        <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                            Eventos registrados
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-[color:var(--app-text-primary)]">
                            {historial.length}
                        </p>
                    </div>
                </div>
            </MotionSection>

            <MotionSection
                delay={0.08}
                className="app-surface rounded-[2rem] p-6"
            >
                {historial.length === 0 ? (
                    <EmptyState
                        icon={ShieldCheck}
                        eyebrow="Sin trazabilidad"
                        title="Sin eventos todavia"
                        description="Las acciones auditadas sobre tickets apareceran aqui automaticamente cuando empiecen a registrarse movimientos."
                    />
                ) : (
                    <MotionStagger className="space-y-5">
                        {historial.map((item, index) => (
                            <MotionItem
                                key={`${item.ticket_id}-${item.fecha}-${index}`}
                            >
                                <TimelineItem
                                    item={item}
                                    isLast={index === historial.length - 1}
                                />
                            </MotionItem>
                        ))}
                    </MotionStagger>
                )}
            </MotionSection>
        </MotionPage>
    );
}
