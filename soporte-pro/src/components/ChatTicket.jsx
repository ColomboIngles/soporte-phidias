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
import { ITEM_TRANSITION } from "./motion-presets";

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
                setError(fetchError.message || "No se pudo cargar la conversacion.");
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
        <div
            className="app-surface-elevated overflow-hidden rounded-[1.75rem]"
            style={{ boxShadow: "var(--app-shadow-lg)" }}
        >
            <div className="border-b border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="app-surface flex h-11 w-11 items-center justify-center rounded-2xl text-[color:var(--app-accent)]">
                            <MessageSquareText className="h-5 w-5" />
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-[color:var(--app-text-primary)]">
                                Conversacion del ticket
                            </h3>
                            <p className="mt-1 text-xs text-[color:var(--app-text-secondary)]">
                                Chat en tiempo real tipo Slack con seguimiento contextual.
                            </p>
                        </div>
                    </div>

                    <div className="app-surface-muted inline-flex self-start items-center gap-2 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-secondary)]">
                        <Sparkles className="h-3.5 w-3.5 text-[color:var(--app-accent)]" />
                        Realtime
                    </div>
                </div>
            </div>

            <div className="relative">
                <div
                    ref={scrollRef}
                    className="h-[58vh] min-h-[22rem] max-h-[32rem] overflow-y-auto px-4 py-5 sm:h-[480px] sm:max-h-none sm:px-5"
                    style={{
                        background:
                            "radial-gradient(circle at top, color-mix(in srgb, var(--brand-secondary) 10%, transparent) 0%, transparent 34%), linear-gradient(180deg, color-mix(in srgb, var(--app-bg-elevated) 72%, var(--app-surface) 28%) 0%, color-mix(in srgb, var(--app-surface-muted) 88%, transparent) 100%)",
                    }}
                >
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="app-surface-muted inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm text-[color:var(--app-text-secondary)]">
                                <LoaderCircle className="h-4 w-4 animate-spin text-[color:var(--app-accent)]" />
                                Cargando conversacion...
                            </div>
                        </div>
                    ) : mensajes.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="max-w-md rounded-[1.5rem] border border-dashed border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] px-6 py-8 text-center">
                                <div className="app-surface mx-auto flex h-14 w-14 items-center justify-center rounded-3xl text-[color:var(--app-accent)]">
                                    <MessageSquareText className="h-6 w-6" />
                                </div>
                                <h4 className="mt-4 text-base font-semibold text-[color:var(--app-text-primary)]">
                                    Empieza la conversacion
                                </h4>
                                <p className="mt-2 text-sm leading-6 text-[color:var(--app-text-secondary)]">
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
                                            initial={{ opacity: 0, y: 8, scale: 0.992 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -6, scale: 0.994 }}
                                            transition={ITEM_TRANSITION}
                                            className={`flex ${esPropio ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`flex max-w-[94%] items-end gap-2.5 sm:max-w-[75%] sm:gap-3 ${
                                                    esPropio ? "flex-row-reverse" : "flex-row"
                                                }`}
                                            >
                                                <div
                                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border text-[11px] font-semibold uppercase tracking-[0.12em] sm:h-9 sm:w-9 sm:text-xs ${
                                                        esPropio
                                                            ? "border-[color:color-mix(in_srgb,var(--brand-secondary)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--brand-secondary)_14%,transparent)] text-[color:var(--app-accent)]"
                                                            : "border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] text-[color:var(--app-text-secondary)]"
                                                    }`}
                                                >
                                                    {construirIniciales(mensaje.usuario)}
                                                </div>

                                                <div
                                                    className={`rounded-[1.45rem] border px-3.5 py-3 sm:rounded-[1.6rem] sm:px-4 ${
                                                        esPropio
                                                            ? "text-[color:var(--app-text-primary)]"
                                                            : "text-[color:var(--app-text-primary)]"
                                                    }`}
                                                    style={
                                                        esPropio
                                                            ? {
                                                                  borderColor:
                                                                      "color-mix(in srgb, var(--brand-secondary) 18%, transparent)",
                                                                  background:
                                                                      "linear-gradient(145deg, color-mix(in srgb, var(--brand-secondary) 12%, var(--app-surface-strong) 88%), color-mix(in srgb, var(--brand-highlight) 10%, var(--app-surface) 90%))",
                                                                  boxShadow: "var(--app-shadow-md)",
                                                              }
                                                            : {
                                                                  borderColor: "var(--app-border)",
                                                                  background:
                                                                      "color-mix(in srgb, var(--app-surface-strong) 88%, transparent)",
                                                                  boxShadow: "var(--app-shadow-sm)",
                                                              }
                                                    }
                                                >
                                                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                                                        <span
                                                            className={
                                                                esPropio
                                                                    ? "text-[color:var(--app-accent)]"
                                                                    : "text-[color:var(--app-text-secondary)]"
                                                            }
                                                        >
                                                            {esPropio ? "Tu" : mensaje.usuario}
                                                        </span>
                                                        <span className="h-1 w-1 rounded-full bg-[color:var(--app-muted-soft)]" />
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

                <div className="sticky bottom-0 border-t border-[color:var(--app-border)] bg-[color:color-mix(in_srgb,var(--app-surface-strong)_92%,transparent)] px-4 py-4 backdrop-blur-2xl sm:px-5">
                    {error && (
                        <div
                            className="mb-3 rounded-2xl px-4 py-3 text-sm"
                            style={{
                                border: "1px solid color-mix(in srgb, var(--brand-danger) 20%, transparent)",
                                background:
                                    "color-mix(in srgb, var(--brand-danger) 10%, var(--app-surface-strong) 90%)",
                                color:
                                    "color-mix(in srgb, var(--brand-danger) 82%, var(--app-text-strong) 18%)",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1 rounded-[1.6rem] border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] px-4 py-3 shadow-inner shadow-[rgba(29,35,32,0.06)]">
                            <textarea
                                ref={textareaRef}
                                value={texto}
                                rows={1}
                                onChange={(event) => setTexto(event.target.value)}
                                onKeyDown={manejarKeyDown}
                                placeholder="Escribe un mensaje y presiona Enter para enviar..."
                                className="max-h-40 min-h-[24px] w-full resize-none bg-transparent text-sm leading-6 text-[color:var(--app-text-primary)] outline-none placeholder:text-[color:var(--app-text-tertiary)]"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={enviar}
                            disabled={!texto.trim() || sending}
                            className="app-button app-button-primary inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl px-4 text-[color:var(--app-bg-elevated)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 sm:w-12 sm:px-0"
                            aria-label="Enviar mensaje"
                        >
                            {sending ? (
                                <LoaderCircle className="h-5 w-5 animate-spin" />
                            ) : (
                                <SendHorizonal className="h-5 w-5" />
                            )}
                            <span className="text-sm font-medium sm:hidden">
                                Enviar mensaje
                            </span>
                        </button>
                    </div>

                    <p className="mt-3 text-xs text-[color:var(--app-text-tertiary)]">
                        Presiona Enter para enviar y Shift + Enter para agregar una nueva linea.
                    </p>
                </div>
            </div>
        </div>
    );
}
