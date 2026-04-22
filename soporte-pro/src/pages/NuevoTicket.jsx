import { useMemo, useState } from "react";
import {
    BellRing,
    ClipboardCheck,
    FilePlus2,
    MessageSquareText,
    ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { supabase } from "../services/supabase";
import { useToast } from "../hooks/useToast";
import { registrarAuditoria } from "../services/audit";
import Button from "../components/ui/Button";
import SectionHeader from "../components/ui/SectionHeader";
import Surface from "../components/ui/Surface";
import {
    MotionItem,
    MotionPage,
    MotionSection,
    MotionStagger,
} from "../components/AppMotion";

const CATEGORY_COPY = {
    Software: "Aplicaciones, plataformas, credenciales o fallas del sistema.",
    Hardware: "Equipos, perifericos, energia o componentes fisicos.",
    Red: "Conectividad, internet, acceso a recursos o servicios internos.",
};

const PRIORITY_COPY = {
    baja: "No bloquea por completo el trabajo y puede esperar una revision programada.",
    media: "Requiere atencion oportuna para evitar impacto operativo.",
    alta: "Interrumpe el servicio o afecta una actividad critica.",
};

export default function NuevoTicket() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [form, setForm] = useState({
        titulo: "",
        descripcion: "",
        categoria: "Software",
        prioridad: "media",
        whatsapp: "",
    });

    const isReady = form.titulo.trim() && form.descripcion.trim();

    const summary = useMemo(
        () => ({
            categoria: CATEGORY_COPY[form.categoria],
            prioridad: PRIORITY_COPY[form.prioridad],
            canal: form.whatsapp.trim()
                ? "Recibiras novedades en la app y podras habilitar WhatsApp cuando el canal este activo."
                : "Las novedades quedaran visibles en la app y por correo si el backend lo tiene configurado.",
        }),
        [form]
    );

    function updateField(field, value) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    async function guardar() {
        if (!form.titulo.trim() || !form.descripcion.trim()) {
            showToast({
                type: "info",
                title: "Completa los campos obligatorios",
                message: "El titulo y la descripcion son necesarios para registrar el ticket.",
            });
            return;
        }

        try {
            const [{ data: authData }, response] = await Promise.all([
                supabase.auth.getUser(),
                API.post("/tickets", {
                    ...form,
                    titulo: form.titulo.trim(),
                    descripcion: form.descripcion.trim(),
                    whatsapp: form.whatsapp.trim() || undefined,
                }),
            ]);

            let ticketId =
                response.data?.id ||
                response.data?.ticket?.id ||
                response.data?.data?.id ||
                response.data?.[0]?.id;

            if (!ticketId && authData.user?.email) {
                const { data: ticketCreado } = await supabase
                    .from("tickets")
                    .select("id")
                    .eq("email", authData.user.email)
                    .eq("titulo", form.titulo.trim())
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                ticketId = ticketCreado?.id;
            }

            await registrarAuditoria({
                usuario: authData.user,
                accion: "crear",
                ticketId,
            });

            showToast({
                type: "success",
                title: "Ticket creado",
                message: "El nuevo ticket quedo registrado y ya podras seguir sus cambios desde el historial.",
            });

            navigate("/tickets");
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo crear el ticket",
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Revisa los datos e intenta nuevamente.",
            });
        }
    }

    return (
        <MotionPage className="mx-auto max-w-6xl space-y-6">
            <MotionSection className="app-surface-hero rounded-[2rem] p-6 sm:p-7">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="app-kicker w-max">
                            <FilePlus2 className="h-3.5 w-3.5" />
                            Nuevo ticket
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--app-text-primary)] sm:text-4xl">
                            Crear una incidencia con contexto claro desde el inicio
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--app-text-secondary)]">
                            Organiza el requerimiento con una experiencia mas limpia y guiada para que soporte pueda entender el caso, priorizarlo mejor y responder con menos friccion.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[25rem]">
                        <Surface variant="muted" className="rounded-[1.5rem] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                Estado inicial
                            </p>
                            <p className="mt-2 text-sm font-semibold text-[color:var(--app-text-primary)]">
                                Abierto
                            </p>
                        </Surface>
                        <Surface variant="muted" className="rounded-[1.5rem] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                Adjuntos
                            </p>
                            <p className="mt-2 text-sm font-semibold text-[color:var(--app-text-primary)]">
                                Luego en detalle
                            </p>
                        </Surface>
                        <Surface variant="muted" className="rounded-[1.5rem] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                Chat
                            </p>
                            <p className="mt-2 text-sm font-semibold text-[color:var(--app-text-primary)]">
                                Seguimiento en vivo
                            </p>
                        </Surface>
                    </div>
                </div>
            </MotionSection>

            <MotionStagger className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]" delayChildren={0.08}>
                <MotionItem>
                    <Surface variant="default" className="rounded-[2rem] p-6 sm:p-7">
                        <SectionHeader
                            eyebrow="Formulario"
                            title="Datos del caso"
                            description="Los campos esenciales ayudan a enrutar mejor el ticket y a reducir preguntas de ida y vuelta."
                            icon={ClipboardCheck}
                        />

                        <div className="mt-8 space-y-6">
                            <label className="block">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <span className="text-sm font-medium text-[color:var(--app-text-primary)]">
                                        Titulo del ticket
                                    </span>
                                    <span className="app-kicker px-2.5 py-1 text-[10px]">
                                        Obligatorio
                                    </span>
                                </div>
                                <input
                                    placeholder="Ej. No puedo ingresar al portal academico"
                                    className="app-input-shell w-full"
                                    value={form.titulo}
                                    onChange={(event) => updateField("titulo", event.target.value)}
                                />
                                <p className="mt-2 text-xs leading-5 text-[color:var(--app-text-tertiary)]">
                                    Usa una frase concreta para que el equipo identifique el problema rapido.
                                </p>
                            </label>

                            <label className="block">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <span className="text-sm font-medium text-[color:var(--app-text-primary)]">
                                        Descripcion
                                    </span>
                                    <span className="app-kicker px-2.5 py-1 text-[10px]">
                                        Obligatorio
                                    </span>
                                </div>
                                <textarea
                                    placeholder="Describe que paso, desde cuando ocurre y que intentaste antes de reportarlo."
                                    className="app-input-shell min-h-40 w-full resize-none py-3.5"
                                    value={form.descripcion}
                                    onChange={(event) => updateField("descripcion", event.target.value)}
                                />
                                <p className="mt-2 text-xs leading-5 text-[color:var(--app-text-tertiary)]">
                                    Un mejor contexto acelera la asignacion y reduce preguntas de ida y vuelta.
                                </p>
                            </label>

                            <div className="grid gap-5 md:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-[color:var(--app-text-primary)]">
                                        Categoria
                                    </span>
                                    <select
                                        onChange={(event) => updateField("categoria", event.target.value)}
                                        className="app-input-shell w-full"
                                        value={form.categoria}
                                    >
                                        <option value="Software">Software</option>
                                        <option value="Hardware">Hardware</option>
                                        <option value="Red">Red</option>
                                    </select>
                                    <p className="mt-2 text-xs leading-5 text-[color:var(--app-text-tertiary)]">
                                        {summary.categoria}
                                    </p>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-[color:var(--app-text-primary)]">
                                        Prioridad
                                    </span>
                                    <select
                                        onChange={(event) => updateField("prioridad", event.target.value)}
                                        className="app-input-shell w-full"
                                        value={form.prioridad}
                                    >
                                        <option value="baja">Baja</option>
                                        <option value="media">Media</option>
                                        <option value="alta">Alta</option>
                                    </select>
                                    <p className="mt-2 text-xs leading-5 text-[color:var(--app-text-tertiary)]">
                                        {summary.prioridad}
                                    </p>
                                </label>
                            </div>

                            <label className="block">
                                <span className="mb-2 block text-sm font-medium text-[color:var(--app-text-primary)]">
                                    WhatsApp para notificaciones
                                </span>
                                <input
                                    placeholder="Opcional. Ej. 573001112233"
                                    className="app-input-shell w-full"
                                    value={form.whatsapp}
                                    onChange={(event) => updateField("whatsapp", event.target.value)}
                                />
                                <p className="mt-2 text-xs leading-5 text-[color:var(--app-text-tertiary)]">
                                    Dejalo vacio si solo quieres seguimiento por correo y dentro de la app.
                                </p>
                            </label>
                        </div>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Button
                                onClick={guardar}
                                size="lg"
                                iconLeft={FilePlus2}
                                className="sm:min-w-[11rem]"
                            >
                                Crear ticket
                            </Button>
                            <Button
                                onClick={() => navigate("/tickets")}
                                variant="secondary"
                                size="lg"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </Surface>
                </MotionItem>

                <MotionStagger className="space-y-6">
                    <MotionItem>
                        <Surface variant="default" className="rounded-[2rem] p-6 sm:p-7">
                            <SectionHeader
                                eyebrow="Resumen"
                                title="Lectura previa del envio"
                                description="Asi se ve el contexto que recibira soporte antes de abrir el ticket."
                                icon={ShieldCheck}
                            />

                            <div className="mt-8 space-y-4">
                                <Surface variant="muted" className="rounded-[1.5rem] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                        Listo para enviar
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-[color:var(--app-text-primary)]">
                                        {isReady ? "Si" : "Faltan campos esenciales"}
                                    </p>
                                </Surface>

                                <Surface variant="muted" className="rounded-[1.5rem] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                        Categoria seleccionada
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-[color:var(--app-text-primary)]">
                                        {form.categoria}
                                    </p>
                                    <p className="mt-2 text-xs leading-5 text-[color:var(--app-text-tertiary)]">
                                        {summary.categoria}
                                    </p>
                                </Surface>

                                <Surface variant="muted" className="rounded-[1.5rem] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                        Nivel de prioridad
                                    </p>
                                    <p className="mt-2 text-sm font-semibold capitalize text-[color:var(--app-text-primary)]">
                                        {form.prioridad}
                                    </p>
                                    <p className="mt-2 text-xs leading-5 text-[color:var(--app-text-tertiary)]">
                                        {summary.prioridad}
                                    </p>
                                </Surface>
                            </div>
                        </Surface>
                    </MotionItem>

                    <MotionItem>
                        <Surface variant="default" className="rounded-[2rem] p-6 sm:p-7">
                            <SectionHeader
                                eyebrow="Seguimiento"
                                title="Visibilidad del caso"
                                description="El ticket quedara listo para trazabilidad desde la app y para notificaciones externas cuando el canal este activo."
                                icon={BellRing}
                            />

                            <div className="mt-8 rounded-[1.6rem] border border-[color:rgba(68,166,106,0.2)] bg-[linear-gradient(135deg,rgba(68,166,106,0.14),rgba(215,177,90,0.08))] px-4 py-4 text-sm leading-7 text-[color:var(--app-text-primary)]">
                                {summary.canal}
                            </div>

                            <Surface variant="muted" className="mt-4 rounded-[1.6rem] p-4">
                                <div className="flex items-center gap-3">
                                    <MessageSquareText className="h-4 w-4 text-[color:var(--app-accent)]" />
                                    <p className="text-sm font-medium text-[color:var(--app-text-primary)]">
                                        Luego podras conversar en el detalle del ticket
                                    </p>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-[color:var(--app-text-tertiary)]">
                                    Adjuntos, chat y cambios de estado quedaran disponibles en la vista individual una vez creado.
                                </p>
                            </Surface>
                        </Surface>
                    </MotionItem>
                </MotionStagger>
            </MotionStagger>
        </MotionPage>
    );
}
