import { useEffect, useMemo, useState } from "react";
import { ClipboardPen, PencilLine, ShieldCheck } from "lucide-react";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useToast } from "../hooks/useToast";
import { registrarAuditoria } from "../services/audit";
import Skeleton from "../components/skeleton";
import Button from "../components/ui/Button";
import SectionHeader from "../components/ui/SectionHeader";
import Surface from "../components/ui/Surface";
import { MotionItem, MotionPage, MotionSection, MotionStagger } from "../components/AppMotion";

const STATUS_HELP = {
    abierto: "El ticket sigue pendiente de revision o atencion inicial.",
    en_proceso: "El caso esta siendo trabajado por el equipo responsable.",
    cerrado: "El flujo operativo se da por completado y quedara en historial.",
};

export default function EditarTicket() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        API.get(`/tickets/${id}`)
            .then((res) => setForm(res.data))
            .finally(() => setLoading(false));
    }, [id]);

    const statusCopy = useMemo(
        () => STATUS_HELP[form.estado || "abierto"],
        [form.estado]
    );

    async function guardar() {
        try {
            const [{ data: authData }] = await Promise.all([
                supabase.auth.getUser(),
                API.put(`/tickets/${id}`, form),
            ]);

            await registrarAuditoria({
                usuario: authData.user,
                accion: "editar",
                ticketId: id,
            });

            showToast({
                type: "success",
                title: "Ticket actualizado",
                message: "Los cambios del ticket fueron guardados.",
            });

            navigate("/tickets");
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo actualizar el ticket",
                message: error.message || "Intenta nuevamente en unos segundos.",
            });
        }
    }

    if (loading) {
        return <Skeleton variant="form" />;
    }

    return (
        <MotionPage className="mx-auto max-w-6xl space-y-6">
            <MotionSection className="app-surface-hero rounded-[2rem] p-6 sm:p-7">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="app-kicker w-max">
                            <PencilLine className="h-3.5 w-3.5" />
                            Edicion
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--app-text-primary)] sm:text-4xl">
                            Ajustar un ticket sin perder contexto
                        </h1>
                        <p className="mt-3 text-sm leading-7 text-[color:var(--app-text-secondary)]">
                            Actualiza titulo, descripcion y estado con una vista mas clara para revisar impacto, seguimiento y cierre sin romper la trazabilidad del caso.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[21rem]">
                        <Surface variant="muted" className="rounded-[1.5rem] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                Ticket
                            </p>
                            <p className="mt-2 text-sm font-semibold text-[color:var(--app-text-primary)]">
                                #{id}
                            </p>
                        </Surface>
                        <Surface variant="muted" className="rounded-[1.5rem] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                Estado actual
                            </p>
                            <p className="mt-2 text-sm font-semibold capitalize text-[color:var(--app-text-primary)]">
                                {form.estado || "abierto"}
                            </p>
                        </Surface>
                    </div>
                </div>
            </MotionSection>

            <MotionStagger className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]" delayChildren={0.08}>
                <MotionItem>
                    <Surface variant="default" className="rounded-[2rem] p-6 sm:p-7">
                        <SectionHeader
                            eyebrow="Formulario"
                            title="Campos editables"
                            description="Mantiene el contexto del caso y deja una trazabilidad mas clara para el equipo."
                            icon={ClipboardPen}
                        />

                        <div className="mt-8 space-y-6">
                            <label className="block">
                                <span className="mb-2 block text-sm font-medium text-[color:var(--app-text-primary)]">
                                    Titulo
                                </span>
                                <input
                                    value={form.titulo || ""}
                                    className="app-input-shell w-full"
                                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                                />
                                <p className="mt-2 text-xs leading-5 text-[color:var(--app-text-tertiary)]">
                                    Ajusta el encabezado si el caso necesita una formulacion mas precisa.
                                </p>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-medium text-[color:var(--app-text-primary)]">
                                    Descripcion
                                </span>
                                <textarea
                                    value={form.descripcion || ""}
                                    className="app-input-shell min-h-40 w-full resize-none py-3.5"
                                    onChange={(e) =>
                                        setForm({ ...form, descripcion: e.target.value })
                                    }
                                />
                                <p className="mt-2 text-xs leading-5 text-[color:var(--app-text-tertiary)]">
                                    Usa esta seccion para dejar nueva informacion o dejar mas legible el detalle.
                                </p>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-medium text-[color:var(--app-text-primary)]">
                                    Estado
                                </span>
                                <select
                                    value={form.estado || "abierto"}
                                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                                    className="app-input-shell w-full"
                                >
                                    <option value="abierto">Abierto</option>
                                    <option value="en_proceso">En proceso</option>
                                    <option value="cerrado">Cerrado</option>
                                </select>
                                <p className="mt-2 text-xs leading-5 text-[color:var(--app-text-tertiary)]">
                                    {statusCopy}
                                </p>
                            </label>
                        </div>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Button
                                onClick={guardar}
                                size="lg"
                                iconLeft={PencilLine}
                                className="sm:min-w-[12rem]"
                            >
                                Guardar cambios
                            </Button>
                            <Button
                                onClick={() => navigate("/tickets")}
                                variant="secondary"
                                size="lg"
                            >
                                Volver
                            </Button>
                        </div>
                    </Surface>
                </MotionItem>

                <MotionStagger className="space-y-6">
                    <MotionItem>
                        <Surface variant="default" className="rounded-[2rem] p-6 sm:p-7">
                            <SectionHeader
                                eyebrow="Resumen"
                                title="Lectura operativa"
                                description="Un resumen rapido del ticket antes de guardar cambios."
                                icon={ShieldCheck}
                            />

                            <div className="mt-8 space-y-4">
                                <Surface variant="muted" className="rounded-[1.5rem] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                        Titulo visible
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-[color:var(--app-text-primary)]">
                                        {form.titulo || "Sin titulo"}
                                    </p>
                                </Surface>

                                <Surface variant="muted" className="rounded-[1.5rem] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                        Estado objetivo
                                    </p>
                                    <p className="mt-2 text-sm font-semibold capitalize text-[color:var(--app-text-primary)]">
                                        {form.estado || "abierto"}
                                    </p>
                                    <p className="mt-2 text-xs leading-5 text-[color:var(--app-text-tertiary)]">
                                        {statusCopy}
                                    </p>
                                </Surface>

                                <Surface variant="muted" className="rounded-[1.5rem] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                        Descripcion actual
                                    </p>
                                    <p className="mt-2 line-clamp-5 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                                        {form.descripcion || "Sin descripcion"}
                                    </p>
                                </Surface>
                            </div>
                        </Surface>
                    </MotionItem>
                </MotionStagger>
            </MotionStagger>
        </MotionPage>
    );
}
