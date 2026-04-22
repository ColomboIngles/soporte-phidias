import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellRing, Sparkles } from "lucide-react";
import useNotifications from "../hooks/useNotifications";
import { ITEM_TRANSITION, POPOVER_TRANSITION } from "./motion-presets";

const MotionDiv = motion.div;

function formatNotificationDate(value) {
    return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

export default function Notifications({ user }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const notificaciones = useNotifications(user);
    const unreadCount = Math.min(notificaciones.length, 9);
    const recientes = useMemo(() => notificaciones.slice(0, 6), [notificaciones]);

    useEffect(() => {
        function handlePointerDown(event) {
            if (!containerRef.current?.contains(event.target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
        };
    }, []);

    useEffect(() => {
        function handleEscape(event) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="app-icon-button relative"
                aria-label="Abrir notificaciones"
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                {notificaciones.length > 0 ? (
                    <BellRing size={18} className="text-[color:var(--app-accent)]" />
                ) : (
                    <Bell size={18} />
                )}

                {notificaciones.length > 0 ? (
                    <span
                        className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-[color:var(--app-bg-elevated)]"
                        style={{
                            border: "1px solid color-mix(in srgb, var(--brand-danger) 30%, white 18%)",
                            background:
                                "linear-gradient(135deg, color-mix(in srgb, var(--brand-danger) 88%, white 12%), color-mix(in srgb, var(--brand-danger) 72%, var(--brand-highlight) 28%))",
                            boxShadow: "0 10px 24px rgba(182, 143, 145, 0.22)",
                        }}
                    >
                        {unreadCount}
                    </span>
                ) : null}
            </button>

            <AnimatePresence>
                {open ? (
                    <MotionDiv
                        initial={{
                            opacity: 0,
                            y: 10,
                            scale: 0.985,
                            filter: "blur(6px)",
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            filter: "blur(0px)",
                        }}
                        exit={{
                            opacity: 0,
                            y: 8,
                            scale: 0.992,
                            filter: "blur(4px)",
                        }}
                        transition={POPOVER_TRANSITION}
                        className="app-surface-elevated absolute right-0 z-30 mt-3 w-[min(92vw,25rem)] overflow-hidden rounded-[1.7rem]"
                        role="dialog"
                        aria-label="Panel de notificaciones"
                    >
                        <div className="border-b border-[color:var(--app-border)] px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="app-kicker">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Actividad reciente
                                    </div>
                                    <p className="mt-4 text-base font-semibold text-[color:var(--app-text-primary)]">
                                        Notificaciones
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-[color:var(--app-text-secondary)]">
                                        Cambios recientes sobre tus tickets y su seguimiento.
                                    </p>
                                </div>

                                <div className="app-surface-muted rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)]">
                                    {notificaciones.length} total
                                </div>
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto px-3 py-3">
                            {recientes.length === 0 ? (
                                <div className="app-surface-muted rounded-2xl px-4 py-6 text-center">
                                    <p className="text-sm font-semibold text-[color:var(--app-text-primary)]">
                                        Todo al dia
                                    </p>
                                    <p className="mt-2 text-xs leading-6 text-[color:var(--app-text-secondary)]">
                                        Aqui apareceran los movimientos importantes de tus tickets.
                                    </p>
                                </div>
                            ) : (
                                recientes.map((notificacion, index) => (
                                    <MotionDiv
                                        key={notificacion.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            ...ITEM_TRANSITION,
                                            delay: index * 0.025,
                                        }}
                                        className={`app-surface-muted rounded-2xl px-4 py-3 text-sm text-[color:var(--app-text-primary)] ${
                                            index < recientes.length - 1 ? "mb-3" : ""
                                        }`}
                                    >
                                        <p className="leading-7">{notificacion.mensaje}</p>
                                        <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--app-text-tertiary)]">
                                            {formatNotificationDate(notificacion.created_at)}
                                        </p>
                                    </MotionDiv>
                                ))
                            )}
                        </div>
                    </MotionDiv>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
