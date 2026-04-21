import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    LoaderCircle,
    MessageSquareText,
    SendHorizonal,
    Sparkles,
} from "lucide-react";
import { supabase } from "../services/supabase";
import API from "../services/api";

const MotionDiv = motion.div;

function formatearHora(fecha) {
    return new Intl.DateTimeFormat("es-CO", {
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(fecha));
}

function construirIniciales(usuario = "") {
    return usuario
        .split("@")[0]
        .split(/[.\s_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0]?.toUpperCase())
        .join("") || "U";
}

export default function ChatTicket({ ticketId, user }) {
    const [mensajes, setMensajes] = useState([]);
    const [texto, setTexto] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const scrollRef = useRef(null);
    const endRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        let activo = true;

        async function cargar() {
            setLoading(true);
            setError("");

            const { data, error: fetchError } = await supabase
                .from("comentarios")
                .select("*")
                .eq("ticket_id", ticketId)
                .order("created_at", { ascending: true });

            if (!activo) return;

            if (fetchError) {
                setError(fetchError.message || "No se pudo cargar la conversación.");
                setMensajes([]);
            } else {
                setMensajes(data || []);
            }

            setLoading(false);
        }

        cargar();

        const channel = supabase
            .channel(`chat-${ticketId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "comentarios",
                    filter: `ticket_id=eq.${ticketId}`,
                },
                (payload) => {
                    if (!activo) return;

                    setMensajes((prev) => {
                        if (prev.some((item) => item.id === payload.new.id)) {
                            return prev;
                        }

                        return [...prev, payload.new];
                    });
                }
            )
            .subscribe();

        return () => {
            activo = false;
            supabase.removeChannel(channel);
        };
    }, [ticketId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({
            behavior: mensajes.length > 1 ? "smooth" : "auto",
            block: "end",
        });
    }, [mensajes]);

    useEffect(() => {
        const textarea = textareaRef.current;

        if (!textarea) return;

        textarea.style.height = "0px";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }, [texto]);

    async function enviar() {
        const contenido = texto.trim();
        if (!contenido || sending) return;

        setSending(true);
        setError("");

        try {
            await API.post(`/tickets/${ticketId}/comments`, {
                mensaje: contenido,
            });
        } catch (error) {
            setError(
                error.response?.data?.message ||
                    error.message ||
                    "No se pudo enviar el mensaje."
            );
            setSending(false);
            return;
        }

        setTexto("");
        setSending(false);
    }

    function manejarKeyDown(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            enviar();
        }
    }

    return (
        <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/45 shadow-[0_24px_70px_rgba(15,23,42,0.3)] backdrop-blur-2xl">
            <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                            <MessageSquareText className="h-5 w-5" />
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-white">
                                Conversación del ticket
                            </h3>
                            <p className="mt-1 text-xs text-slate-400">
                                Chat en tiempo real tipo Slack con seguimiento contextual.
                            </p>
                        </div>
                    </div>

                    <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300 sm:inline-flex">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                        Realtime
                    </div>
                </div>
            </div>

            <div className="relative">
                <div
                    ref={scrollRef}
                    className="h-[480px] overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),_transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.35)_0%,rgba(15,23,42,0.08)_100%)] px-4 py-5 sm:px-5"
                >
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                                <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
                                Cargando conversación...
                            </div>
                        </div>
                    ) : mensajes.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="max-w-md rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-8 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-400/10">
                                    <MessageSquareText className="h-6 w-6 text-cyan-300" />
                                </div>
                                <h4 className="mt-4 text-base font-semibold text-white">
                                    Empieza la conversación
                                </h4>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                    Usa este espacio para registrar contexto, avances y respuestas del ticket en tiempo real.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence initial={false}>
                                {mensajes.map((mensaje) => {
                                    const esPropio = mensaje.usuario === user;

                                    return (
                                        <MotionDiv
                                            key={mensaje.id}
                                            layout
                                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                            className={`flex ${esPropio ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`flex max-w-[88%] items-end gap-3 sm:max-w-[75%] ${
                                                    esPropio ? "flex-row-reverse" : "flex-row"
                                                }`}
                                            >
                                                <div
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-xs font-semibold uppercase tracking-[0.12em] ${
                                                        esPropio
                                                            ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                                                            : "border-white/10 bg-white/5 text-slate-200"
                                                    }`}
                                                >
                                                    {construirIniciales(mensaje.usuario)}
                                                </div>

                                                <div
                                                    className={`rounded-[1.6rem] border px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ${
                                                        esPropio
                                                            ? "border-cyan-300/20 bg-gradient-to-br from-cyan-400/20 via-sky-400/15 to-indigo-500/15 text-white"
                                                            : "border-white/10 bg-white/[0.04] text-slate-100"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                                        <span className={esPropio ? "text-cyan-200" : "text-slate-300"}>
                                                            {esPropio ? "Tú" : mensaje.usuario}
                                                        </span>
                                                        <span className="h-1 w-1 rounded-full bg-slate-500" />
                                                        <span>{formatearHora(mensaje.created_at)}</span>
                                                    </div>

                                                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-inherit">
                                                        {mensaje.mensaje}
                                                    </p>
                                                </div>
                                            </div>
                                        </MotionDiv>
                                    );
                                })}
                            </AnimatePresence>
                            <div ref={endRef} />
                        </div>
                    )}
                </div>

                <div className="border-t border-white/10 bg-slate-950/75 px-4 py-4 backdrop-blur-2xl sm:px-5">
                    {error && (
                        <div className="mb-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                            {error}
                        </div>
                    )}

                    <div className="flex items-end gap-3">
                        <div className="flex-1 rounded-[1.6rem] border border-white/10 bg-white/[0.04] px-4 py-3 shadow-inner shadow-black/10">
                            <textarea
                                ref={textareaRef}
                                value={texto}
                                rows={1}
                                onChange={(event) => setTexto(event.target.value)}
                                onKeyDown={manejarKeyDown}
                                placeholder="Escribe un mensaje y presiona Enter para enviar..."
                                className="max-h-40 min-h-[24px] w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-slate-500"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={enviar}
                            disabled={!texto.trim() || sending}
                            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-white shadow-[0_18px_40px_rgba(56,189,248,0.32)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                            aria-label="Enviar mensaje"
                        >
                            {sending ? (
                                <LoaderCircle className="h-5 w-5 animate-spin" />
                            ) : (
                                <SendHorizonal className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
