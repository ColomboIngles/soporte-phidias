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
    X,
} from "lucide-react";
import { supabase } from "../services/supabase";
import ChatTicket from "../components/ChatTicket";
import { useToast } from "../hooks/useToast";
import { obtenerRol } from "../services/usuarios";
import {
    STORAGE_BUCKET,
    STORAGE_SETUP_SQL,
    obtenerAdjuntosTicket,
    eliminarAdjuntoTicket,
    obtenerUrlDescarga,
    subirAdjuntoTicket,
} from "../services/storage";

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

export default function TicketDetalle() {
    const { id } = useParams();
    const [ticket, setTicket] = useState(null);
    const [user, setUser] = useState(null);
    const [rol, setRol] = useState(null);
    const [adjuntos, setAdjuntos] = useState([]);
    const [cargandoAdjuntos, setCargandoAdjuntos] = useState(true);
    const [subiendo, setSubiendo] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [descargandoId, setDescargandoId] = useState(null);
    const [eliminandoId, setEliminandoId] = useState(null);
    const [previewAdjunto, setPreviewAdjunto] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewingId, setPreviewingId] = useState(null);
    const inputRef = useRef(null);
    const { showToast } = useToast();

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
            const { data } = await supabase
                .from("tickets")
                .select("*")
                .eq("id", id)
                .single();

            if (isMounted) {
                setTicket(data);
            }
        }

        async function obtenerUsuario() {
            const { data } = await supabase.auth.getUser();

            if (isMounted) {
                setUser(data.user);
                if (data.user?.id) {
                    const nextRol = await obtenerRol(data.user.id);
                    if (isMounted) {
                        setRol(nextRol);
                    }
                }
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
                        message: error.message || "Verifica la configuración de Storage en Supabase.",
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
        if (!ticket) return;

        await supabase
            .from("tickets")
            .update({
                estado: nuevoEstado,
                updated_at: new Date(),
            })
            .eq("id", id);

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
                title: "Falló la subida",
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

    async function eliminarAdjunto(adjunto) {
        if (!confirm(`¿Eliminar el archivo "${adjunto.nombre}"?`)) {
            return;
        }

        try {
            setEliminandoId(adjunto.id);
            await eliminarAdjuntoTicket(adjunto.id, adjunto.path);

            setAdjuntos((prev) => prev.filter((item) => item.id !== adjunto.id));

            showToast({
                type: "success",
                title: "Adjunto eliminado",
                message: `“${adjunto.nombre}” se eliminó correctamente.`,
            });
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

    if (!ticket) {
        return <p className="p-6">Cargando...</p>;
    }

    return (
        <div className="space-y-6 p-6">
            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                            <Paperclip className="h-3.5 w-3.5" />
                            Ticket #{ticket.id}
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                            {ticket.titulo}
                        </h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                            {ticket.descripcion}
                        </p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-300 backdrop-blur-xl">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            Storage activo
                        </p>
                        <p className="mt-2 font-medium text-white">
                            Bucket: {storageConfig.bucket}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            Tabla: {storageConfig.table}
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Estado</p>
                        <p className="mt-2 text-sm font-semibold capitalize text-white">{ticket.estado}</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Prioridad</p>
                        <p className="mt-2 text-sm font-semibold text-white">{ticket.prioridad}</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Categoría</p>
                        <p className="mt-2 text-sm font-semibold text-white">{ticket.categoria}</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Fecha</p>
                        <p className="mt-2 text-sm font-semibold text-white">{formatDate(ticket.created_at)}</p>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <button
                        onClick={() => cambiarEstado("abierto")}
                        className="rounded-2xl border border-yellow-400/30 bg-yellow-400/15 px-4 py-2 text-sm font-medium text-yellow-100 transition hover:-translate-y-0.5 hover:bg-yellow-400/20"
                    >
                        Reabrir
                    </button>
                    <button
                        onClick={() => cambiarEstado("en_proceso")}
                        className="rounded-2xl border border-sky-400/30 bg-sky-400/15 px-4 py-2 text-sm font-medium text-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-400/20"
                    >
                        En proceso
                    </button>
                    <button
                        onClick={() => cambiarEstado("cerrado")}
                        className="rounded-2xl border border-emerald-400/30 bg-emerald-400/15 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-400/20"
                    >
                        Cerrar
                    </button>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.24)] backdrop-blur-2xl">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                Archivos adjuntos
                            </h2>
                            <p className="mt-1 text-sm text-slate-400">
                                Arrastra documentos, imágenes o evidencias directamente al ticket.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-right">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                Archivos
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white">
                                {adjuntos.length}
                            </p>
                        </div>
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
                        className={`mt-6 cursor-pointer rounded-[1.75rem] border border-dashed p-6 transition ${
                            dragActive
                                ? "border-cyan-300/70 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(103,232,249,0.25)]"
                                : "border-white/12 bg-slate-950/35 hover:border-cyan-300/40 hover:bg-white/8"
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
                                className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/10"
                            >
                                {subiendo ? (
                                    <LoaderCircle className="h-7 w-7 animate-spin text-cyan-300" />
                                ) : (
                                    <UploadCloud className="h-7 w-7 text-cyan-300" />
                                )}
                            </MotionDiv>

                            <h3 className="mt-4 text-lg font-semibold text-white">
                                {subiendo ? "Subiendo archivos..." : "Drag & drop premium"}
                            </h3>
                            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                                Suelta tus archivos aquí o haz clic para seleccionar desde tu equipo. La carga se guarda en Supabase Storage.
                            </p>

                            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                                <CloudUpload className="h-3.5 w-3.5 text-cyan-300" />
                                Bucket configurado: {storageConfig.bucket}
                            </div>

                            <AnimatePresence>
                                {subiendo && (
                                    <MotionDiv
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="mt-5 w-full max-w-md"
                                    >
                                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                            <MotionDiv
                                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400"
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
                            <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-5 text-sm text-slate-400">
                                Cargando adjuntos...
                            </div>
                        ) : adjuntos.length === 0 ? (
                            <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-5 text-sm text-slate-400">
                                Todavía no hay archivos cargados para este ticket.
                            </div>
                        ) : (
                            adjuntos.map((adjunto) => (
                                <div
                                    key={adjunto.id}
                                    className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/45 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.2)] md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                                            <FileText className="h-5 w-5 text-cyan-300" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">
                                                {adjunto.nombre}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                                <span>{formatSize(adjunto.size)}</span>
                                                <span className="h-1 w-1 rounded-full bg-slate-600" />
                                                <span>{adjunto.usuario || "Sistema"}</span>
                                                <span className="h-1 w-1 rounded-full bg-slate-600" />
                                                <span>{formatDate(adjunto.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {esPreviewable(adjunto) && (
                                            <button
                                                onClick={() => previsualizarAdjunto(adjunto)}
                                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-400/15"
                                            >
                                                {previewLoading && previewingId === adjunto.id ? (
                                                    <LoaderCircle className="h-4 w-4 animate-spin text-cyan-200" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-cyan-200" />
                                                )}
                                                Vista previa
                                            </button>
                                        )}

                                        <button
                                            onClick={() => descargarAdjunto(adjunto)}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                                        >
                                            {descargandoId === adjunto.id ? (
                                                <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
                                            ) : (
                                                <Download className="h-4 w-4 text-cyan-300" />
                                            )}
                                            Descargar
                                        </button>

                                        {puedeEliminarAdjunto(adjunto) && (
                                            <button
                                                onClick={() => eliminarAdjunto(adjunto)}
                                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:-translate-y-0.5 hover:bg-rose-400/15"
                                            >
                                                {eliminandoId === adjunto.id ? (
                                                    <LoaderCircle className="h-4 w-4 animate-spin text-rose-200" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4 text-rose-200" />
                                                )}
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {previewAdjunto && previewUrl && (
                        <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                                        {previewAdjunto.tipo?.startsWith("image/") ? (
                                            <ImageIcon className="h-5 w-5 text-cyan-300" />
                                        ) : (
                                            <FileText className="h-5 w-5 text-cyan-300" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            {previewAdjunto.nombre}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Vista previa segura del adjunto
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setPreviewAdjunto(null);
                                        setPreviewUrl("");
                                    }}
                                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                                    aria-label="Cerrar vista previa"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
                                {previewAdjunto.tipo?.startsWith("image/") ? (
                                    <img
                                        src={previewUrl}
                                        alt={previewAdjunto.nombre}
                                        className="max-h-[560px] w-full object-contain"
                                    />
                                ) : (
                                    <iframe
                                        src={previewUrl}
                                        title={previewAdjunto.nombre}
                                        className="h-[560px] w-full"
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    <details className="mt-6 rounded-3xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-300">
                        <summary className="cursor-pointer list-none font-medium text-white">
                            Ver configuración Storage sugerida
                        </summary>
                        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-300">
                            {storageConfig.setupSql}
                        </pre>
                    </details>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.24)] backdrop-blur-2xl">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
                            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                Conversación del ticket
                            </h2>
                            <p className="text-sm text-slate-400">
                                Seguimiento contextual y colaboración en tiempo real.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6">
                        {user && (
                            <ChatTicket
                                ticketId={id}
                                user={user.email}
                            />
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
