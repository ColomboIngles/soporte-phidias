import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
    CheckCircle2,
    CloudUpload,
    Download,
    FileText,
    Eye,
    ImageIcon,
    LoaderCircle,
    Paperclip,
    Trash2,
    UploadCloud,
} from "lucide-react";
import { supabase } from "../services/supabase";
import API from "../services/api";
import ChatTicket from "../components/ChatTicket";
import { useToast } from "../hooks/useToast";
import ModalShell from "../components/ModalShell";
import ConfirmDialog from "../components/ConfirmDialog";
import Button from "../components/ui/Button";
import SectionHeader from "../components/ui/SectionHeader";
import Surface from "../components/ui/Surface";
import {
    MotionItem,
    MotionPage,
    MotionSection,
    MotionStagger,
} from "../components/AppMotion";
import {
    STORAGE_BUCKET,
    STORAGE_SETUP_SQL,
    obtenerAdjuntosTicket,
    eliminarAdjuntoTicket,
    obtenerUrlDescarga,
    subirAdjuntoTicket,
} from "../services/storage";
import { canManageTicketState, isAdminRole } from "../utils/permissions";

const MotionDiv = motion.div;

function formatDate(value) {
    return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatSize(size = 0) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TicketDetalle({ rol }) {
    const { id } = useParams();
    const [ticket, setTicket] = useState(null);
    const [user, setUser] = useState(null);
    const [ticketError, setTicketError] = useState("");
    const [adjuntos, setAdjuntos] = useState([]);
    const [cargandoAdjuntos, setCargandoAdjuntos] = useState(true);
    const [subiendo, setSubiendo] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [descargandoId, setDescargandoId] = useState(null);
    const [eliminandoId, setEliminandoId] = useState(null);
    const [adjuntoToDelete, setAdjuntoToDelete] = useState(null);
    const [previewAdjunto, setPreviewAdjunto] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewingId, setPreviewingId] = useState(null);
    const inputRef = useRef(null);
    const { showToast } = useToast();
    const canManageState = canManageTicketState(rol);
    const canSeeStorageConfig = isAdminRole(rol);

    const storageConfig = useMemo(
        () => ({
            bucket: STORAGE_BUCKET,
            table: "adjuntos",
            setupSql: STORAGE_SETUP_SQL,
        }),
        []
    );

    useEffect(() => {
        let isMounted = true;

        async function cargarTicket() {
            const { data, error } = await supabase
                .from("tickets")
                .select("*")
                .eq("id", id)
                .maybeSingle();

            if (isMounted) {
                if (error || !data) {
                    setTicket(null);
                    setTicketError("No tienes acceso a este ticket o ya no existe.");
                    return;
                }

                setTicket(data);
                setTicketError("");
            }
        }

        async function obtenerUsuario() {
            const { data } = await supabase.auth.getUser();

            if (isMounted) {
                setUser(data.user);
            }
        }

        async function cargarAdjuntos() {
            setCargandoAdjuntos(true);

            try {
                const data = await obtenerAdjuntosTicket(id);

                if (isMounted) {
                    setAdjuntos(data);
                }
            } catch (error) {
                if (isMounted) {
                    showToast({
                        type: "error",
                        title: "No se pudieron cargar los adjuntos",
                        message: error.message || "Verifica la configuracion de Storage en Supabase.",
                    });
                }
            } finally {
                if (isMounted) {
                    setCargandoAdjuntos(false);
                }
            }
        }

        cargarTicket();
        obtenerUsuario();
        cargarAdjuntos();

        const channel = supabase
            .channel(`adjuntos-ticket-${id}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "adjuntos", filter: `ticket_id=eq.${id}` },
                async () => {
                    const data = await obtenerAdjuntosTicket(id);

                    if (isMounted) {
                        setAdjuntos(data);
                    }
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [id, showToast]);

    async function cambiarEstado(nuevoEstado) {
        if (!ticket || !canManageState) return;

        try {
            const response = await API.put(`/tickets/${id}`, {
                estado: nuevoEstado,
            });

            setTicket(response.data);

            showToast({
                type: "success",
                title: "Estado actualizado",
                message: `"${ticket.titulo}" ahora esta en ${nuevoEstado.replace("_", " ")}.`,
            });
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo actualizar el estado",
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Intenta nuevamente en unos segundos.",
            });
        }
    }

    async function procesarArchivos(fileList) {
        const archivos = Array.from(fileList || []).filter(Boolean);

        if (!archivos.length || !user) return;

        setSubiendo(true);

        try {
            const nuevosAdjuntos = [];

            for (const file of archivos) {
                const adjunto = await subirAdjuntoTicket({
                    ticketId: id,
                    file,
                    usuario: user,
                });

                nuevosAdjuntos.push(adjunto);
            }

            setAdjuntos((prev) => [...nuevosAdjuntos, ...prev]);

            showToast({
                type: "success",
                title: "Archivos cargados",
                message: `${archivos.length} archivo(s) adjuntado(s) al ticket.`,
            });
        } catch (error) {
            showToast({
                type: "error",
                title: "Fallo la subida",
                message: error.message || "Revisa Storage y vuelve a intentar.",
            });
        } finally {
            setSubiendo(false);

            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    }

    async function descargarAdjunto(adjunto) {
        try {
            setDescargandoId(adjunto.id);
            const signedUrl = await obtenerUrlDescarga(adjunto.path);
            window.open(signedUrl, "_blank", "noopener,noreferrer");
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo descargar el archivo",
                message: error.message || "Intenta nuevamente en unos segundos.",
            });
        } finally {
            setDescargandoId(null);
        }
    }

    async function previsualizarAdjunto(adjunto) {
        try {
            setPreviewingId(adjunto.id);
            setPreviewLoading(true);
            const signedUrl = await obtenerUrlDescarga(adjunto.path);
            setPreviewAdjunto(adjunto);
            setPreviewUrl(signedUrl);
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo abrir la vista previa",
                message: error.message || "Intenta nuevamente en unos segundos.",
            });
        } finally {
            setPreviewLoading(false);
            setPreviewingId(null);
        }
    }

    async function confirmarEliminarAdjunto() {
        if (!adjuntoToDelete) return;

        try {
            setEliminandoId(adjuntoToDelete.id);
            await eliminarAdjuntoTicket(adjuntoToDelete.id, adjuntoToDelete.path);

            setAdjuntos((prev) =>
                prev.filter((item) => item.id !== adjuntoToDelete.id)
            );

            showToast({
                type: "success",
                title: "Adjunto eliminado",
                message: `"${adjuntoToDelete.nombre}" se elimino correctamente.`,
            });
            setAdjuntoToDelete(null);
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo eliminar el adjunto",
                message: error.message || "Intenta nuevamente en unos segundos.",
            });
        } finally {
            setEliminandoId(null);
        }
    }

    function handleDrop(event) {
        event.preventDefault();
        setDragActive(false);
        procesarArchivos(event.dataTransfer.files);
    }

    function esPreviewable(adjunto) {
        return (
            adjunto.tipo?.startsWith("image/") ||
            adjunto.tipo === "application/pdf"
        );
    }

    function puedeEliminarAdjunto(adjunto) {
        if (!user || !ticket) return false;

        return (
            rol === "admin" ||
            ticket.asignado_a === user.id ||
            ticket.email?.toLowerCase() === user.email?.toLowerCase() ||
            adjunto.usuario?.toLowerCase() === user.email?.toLowerCase()
        );
    }

    if (ticketError) {
        return (
            <div className="p-6">
                <div
                    className="app-surface rounded-[2rem] p-6 text-sm"
                    style={{
                        borderColor:
                            "color-mix(in srgb, var(--brand-danger) 22%, transparent)",
                        background:
                            "color-mix(in srgb, var(--brand-danger) 12%, var(--app-surface) 88%)",
                        color: "color-mix(in srgb, var(--brand-danger) 78%, var(--app-text-strong) 22%)",
                    }}
                >
                    {ticketError}
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="p-6">
                <div className="app-surface rounded-[2rem] p-6 text-sm text-[color:var(--app-text-secondary)]">
                    Cargando ticket...
                </div>
            </div>
        );
    }

    return (
        <MotionPage className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            <MotionSection
                className="app-surface-hero rounded-[2rem] p-5 sm:p-6"
                style={{ boxShadow: "var(--app-shadow-lg)" }}
            >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="app-kicker max-w-full">
                            <Paperclip className="h-3.5 w-3.5" />
                            <span className="app-break-anywhere">Ticket #{ticket.id}</span>
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--app-text-primary)]">
                            {ticket.titulo}
                        </h1>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--app-text-secondary)]">
                            {ticket.descripcion}
                        </p>
                    </div>

                    {canSeeStorageConfig ? (
                        <Surface variant="muted" className="rounded-3xl p-4 text-sm">
                            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                                Storage activo
                            </p>
                            <p className="app-break-anywhere mt-2 font-medium text-[color:var(--app-text-primary)]">
                                Bucket: {storageConfig.bucket}
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--app-text-tertiary)]">
                                Tabla: {storageConfig.table}
                            </p>
                        </Surface>
                    ) : (
                        <div className="app-surface-muted rounded-3xl p-4 text-sm leading-7 text-[color:var(--app-text-primary)]">
                            Sigue el avance aqui, usa el chat para hablar con soporte y adjunta evidencias cuando lo necesites.
                        </div>
                    )}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                    <Surface variant="muted" className="rounded-3xl p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">Estado</p>
                        <p className="mt-2 text-sm font-semibold capitalize text-[color:var(--app-text-primary)]">{ticket.estado}</p>
                    </Surface>
                    <Surface variant="muted" className="rounded-3xl p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">Prioridad</p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--app-text-primary)]">{ticket.prioridad}</p>
                    </Surface>
                    <Surface variant="muted" className="rounded-3xl p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">Categoria</p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--app-text-primary)]">{ticket.categoria}</p>
                    </Surface>
                    <Surface variant="muted" className="rounded-3xl p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">Fecha</p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--app-text-primary)]">{formatDate(ticket.created_at)}</p>
                    </Surface>
                </div>

                {canManageState ? (
                    <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
                        <Button
                            onClick={() => cambiarEstado("abierto")}
                            variant="secondary"
                            className="w-full sm:w-auto"
                            style={{
                                borderColor:
                                    "color-mix(in srgb, var(--brand-warning) 22%, transparent)",
                                background:
                                    "color-mix(in srgb, var(--brand-warning) 12%, var(--app-surface-strong) 88%)",
                                color:
                                    "color-mix(in srgb, var(--brand-warning) 82%, var(--app-text-strong) 18%)",
                            }}
                        >
                            Reabrir
                        </Button>
                        <Button
                            onClick={() => cambiarEstado("en_proceso")}
                            variant="secondary"
                            className="w-full sm:w-auto"
                            style={{
                                borderColor:
                                    "color-mix(in srgb, var(--brand-secondary) 22%, transparent)",
                                background:
                                    "color-mix(in srgb, var(--brand-secondary) 12%, var(--app-surface-strong) 88%)",
                                color:
                                    "color-mix(in srgb, var(--brand-secondary) 82%, var(--app-text-strong) 18%)",
                            }}
                        >
                            En proceso
                        </Button>
                        <Button
                            onClick={() => cambiarEstado("cerrado")}
                            variant="secondary"
                            className="w-full sm:w-auto"
                            style={{
                                borderColor:
                                    "color-mix(in srgb, var(--brand-success) 22%, transparent)",
                                background:
                                    "color-mix(in srgb, var(--brand-success) 12%, var(--app-surface-strong) 88%)",
                                color:
                                    "color-mix(in srgb, var(--brand-success) 82%, var(--app-text-strong) 18%)",
                            }}
                        >
                            Cerrar
                        </Button>
                    </div>
                ) : (
                    <div className="app-surface-muted mt-6 rounded-2xl px-4 py-3 text-sm text-[color:var(--app-text-secondary)]">
                        Puedes seguir el avance del ticket desde aqui. Los cambios de estado los gestiona el equipo de soporte.
                    </div>
                )}
            </MotionSection>

            <MotionStagger
                className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"
                delayChildren={0.08}
            >
                <MotionItem>
                    <Surface
                        variant="default"
                        className="rounded-[2rem] p-5 sm:p-6"
                        style={{ boxShadow: "var(--app-shadow-lg)" }}
                    >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <SectionHeader
                            title="Archivos adjuntos"
                            description="Arrastra documentos, imagenes o evidencias directamente al ticket."
                            icon={Paperclip}
                            className="flex-1"
                        />

                        <Surface variant="muted" className="rounded-2xl px-3 py-2 text-right">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                Archivos
                            </p>
                            <p className="mt-1 text-lg font-semibold text-[color:var(--app-text-primary)]">
                                {adjuntos.length}
                            </p>
                        </Surface>
                    </div>

                    <div
                        onDragOver={(event) => {
                            event.preventDefault();
                            setDragActive(true);
                        }}
                        onDragLeave={(event) => {
                            event.preventDefault();
                            setDragActive(false);
                        }}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        className={`mt-6 cursor-pointer rounded-[1.75rem] border border-dashed p-5 transition sm:p-6 ${
                            dragActive
                                ? "border-[color:var(--app-accent)] bg-[color:var(--app-accent-soft)] shadow-[0_0_0_1px_var(--app-ring)]"
                                : "border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] hover:border-[color:var(--app-border-strong)] hover:bg-[color:var(--app-surface-strong)]"
                        }`}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(event) => procesarArchivos(event.target.files)}
                        />

                        <div className="flex flex-col items-center justify-center text-center">
                            <MotionDiv
                                animate={subiendo ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                                transition={{ repeat: subiendo ? Infinity : 0, duration: 1.4 }}
                                className="app-surface-muted flex h-14 w-14 items-center justify-center rounded-3xl sm:h-16 sm:w-16"
                            >
                                {subiendo ? (
                                    <LoaderCircle className="h-7 w-7 animate-spin text-[color:var(--app-accent)]" />
                                ) : (
                                    <UploadCloud className="h-7 w-7 text-[color:var(--app-accent)]" />
                                )}
                            </MotionDiv>

                            <h3 className="mt-4 text-base font-semibold text-[color:var(--app-text-primary)] sm:text-lg">
                                {subiendo ? "Subiendo archivos..." : "Drag & drop premium"}
                            </h3>
                            <p className="mt-2 max-w-md text-sm leading-6 text-[color:var(--app-text-secondary)]">
                                Suelta tus archivos aqui o haz clic para seleccionar desde tu equipo. La carga se guarda en Supabase Storage.
                            </p>

                            {canSeeStorageConfig && (
                                <div className="app-surface-muted mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-[color:var(--app-text-secondary)]">
                                    <CloudUpload className="h-3.5 w-3.5 text-[color:var(--app-accent)]" />
                                    Bucket configurado: {storageConfig.bucket}
                                </div>
                            )}

                            <AnimatePresence>
                                {subiendo && (
                                    <MotionDiv
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="mt-5 w-full max-w-md"
                                    >
                                        <div className="h-2 overflow-hidden rounded-full bg-[color:var(--app-border)]">
                                            <MotionDiv
                                                className="h-full rounded-full bg-gradient-to-r from-[color:var(--brand-secondary)] via-[color:var(--app-accent)] to-[color:var(--brand-highlight)]"
                                                initial={{ x: "-35%" }}
                                                animate={{ x: ["-35%", "100%"] }}
                                                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                                                style={{ width: "35%" }}
                                            />
                                        </div>
                                    </MotionDiv>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {cargandoAdjuntos ? (
                            <div className="app-surface-muted rounded-3xl p-5 text-sm text-[color:var(--app-text-secondary)]">
                                Cargando adjuntos...
                            </div>
                        ) : adjuntos.length === 0 ? (
                            <div className="app-surface-muted rounded-3xl p-5 text-sm text-[color:var(--app-text-secondary)]">
                                Todavia no hay archivos cargados para este ticket.
                            </div>
                        ) : (
                            <MotionStagger className="space-y-3" delayChildren={0.02} staggerChildren={0.05}>
                                {adjuntos.map((adjunto) => (
                                <MotionItem
                                    key={adjunto.id}
                                    className="app-surface-muted flex flex-col gap-4 rounded-3xl p-4 md:flex-row md:items-center md:justify-between"
                                    style={{ boxShadow: "var(--app-shadow-md)" }}
                                >
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className="app-surface flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                                            <FileText className="h-5 w-5 text-[color:var(--app-accent)]" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="app-break-anywhere text-sm font-semibold text-[color:var(--app-text-primary)]">
                                                {adjunto.nombre}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--app-text-tertiary)]">
                                                <span>{formatSize(adjunto.size)}</span>
                                                <span className="h-1 w-1 rounded-full bg-[color:var(--app-muted-soft)]" />
                                                <span>{adjunto.usuario || "Sistema"}</span>
                                                <span className="h-1 w-1 rounded-full bg-[color:var(--app-muted-soft)]" />
                                                <span>{formatDate(adjunto.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                                        {esPreviewable(adjunto) && (
                                            <Button
                                                onClick={() => previsualizarAdjunto(adjunto)}
                                                variant="secondary"
                                                className="w-full sm:w-auto"
                                            >
                                                {previewLoading && previewingId === adjunto.id ? (
                                                    <LoaderCircle className="h-4 w-4 animate-spin text-[color:var(--app-accent)]" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-[color:var(--app-accent)]" />
                                                )}
                                                Vista previa
                                            </Button>
                                        )}

                                        <Button
                                            onClick={() => descargarAdjunto(adjunto)}
                                            variant="secondary"
                                            className="w-full sm:w-auto"
                                        >
                                            {descargandoId === adjunto.id ? (
                                                <LoaderCircle className="h-4 w-4 animate-spin text-[color:var(--app-accent)]" />
                                            ) : (
                                                <Download className="h-4 w-4 text-[color:var(--app-accent)]" />
                                            )}
                                            Descargar
                                        </Button>

                                        {puedeEliminarAdjunto(adjunto) && (
                                            <Button
                                                onClick={() => setAdjuntoToDelete(adjunto)}
                                                variant="danger"
                                                className="w-full sm:w-auto"
                                            >
                                                {eliminandoId === adjunto.id ? (
                                                    <LoaderCircle
                                                        className="h-4 w-4 animate-spin"
                                                        style={{
                                                            color: "color-mix(in srgb, var(--brand-danger) 82%, white 18%)",
                                                        }}
                                                    />
                                                ) : (
                                                    <Trash2
                                                        className="h-4 w-4"
                                                        style={{
                                                            color: "color-mix(in srgb, var(--brand-danger) 82%, white 18%)",
                                                        }}
                                                    />
                                                )}
                                                Eliminar
                                            </Button>
                                        )}
                                    </div>
                                </MotionItem>
                            ))}
                            </MotionStagger>
                        )}
                    </div>

                    {canSeeStorageConfig && (
                        <details className="app-surface-muted mt-6 rounded-3xl p-4 text-sm text-[color:var(--app-text-secondary)]">
                            <summary className="cursor-pointer list-none font-medium text-[color:var(--app-text-primary)]">
                                Ver configuracion Storage sugerida
                            </summary>
                            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-bg-elevated)] p-4 text-xs leading-6 text-[color:var(--app-text-secondary)]">
                                {storageConfig.setupSql}
                            </pre>
                        </details>
                    )}
                    </Surface>
                </MotionItem>

                <MotionItem>
                    <Surface
                        variant="default"
                        className="rounded-[2rem] p-5 sm:p-6"
                        style={{ boxShadow: "var(--app-shadow-lg)" }}
                    >
                    <SectionHeader
                        title="Conversacion del ticket"
                        description="Seguimiento contextual y colaboracion en tiempo real."
                        icon={CheckCircle2}
                    />

                    <div className="mt-6">
                        {user && (
                            <ChatTicket
                                ticketId={id}
                                user={user.email}
                            />
                        )}
                    </div>
                    </Surface>
                </MotionItem>
            </MotionStagger>

            <ModalShell
                open={Boolean(previewAdjunto && previewUrl)}
                onClose={() => {
                    setPreviewAdjunto(null);
                    setPreviewUrl("");
                }}
                title={previewAdjunto?.nombre || "Vista previa"}
                description="Vista previa segura del adjunto seleccionado."
                icon={previewAdjunto?.tipo?.startsWith("image/") ? ImageIcon : FileText}
                widthClassName="max-w-5xl"
            >
                <div className="overflow-hidden rounded-[1.5rem] border border-[color:var(--app-border)] bg-[color:var(--app-bg-elevated)]">
                    {previewAdjunto?.tipo?.startsWith("image/") ? (
                        <img
                            src={previewUrl}
                            alt={previewAdjunto?.nombre || "Adjunto"}
                            className="max-h-[72vh] w-full object-contain"
                        />
                    ) : (
                        <iframe
                            src={previewUrl}
                            title={previewAdjunto?.nombre || "Adjunto"}
                            className="h-[72vh] w-full"
                        />
                    )}
                </div>
            </ModalShell>

            <ConfirmDialog
                open={Boolean(adjuntoToDelete)}
                onClose={() => setAdjuntoToDelete(null)}
                onConfirm={confirmarEliminarAdjunto}
                title="Eliminar adjunto"
                description={
                    adjuntoToDelete
                        ? `Se eliminara "${adjuntoToDelete.nombre}" del ticket y del almacenamiento.`
                        : ""
                }
                confirmLabel="Eliminar adjunto"
                busy={eliminandoId === adjuntoToDelete?.id}
            />
        </MotionPage>
    );
}
