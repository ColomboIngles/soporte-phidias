import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import useNotifications from "../hooks/useNotifications";

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

    const recientes = useMemo(
        () => notificaciones.slice(0, 6),
        [notificaciones]
    );

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

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
                aria-label="Abrir notificaciones"
            >
                {notificaciones.length > 0 ? (
                    <BellRing size={18} className="text-cyan-200" />
                ) : (
                    <Bell size={18} />
                )}

                {notificaciones.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-slate-950 bg-rose-500 px-1.5 text-[10px] font-semibold text-white shadow-lg shadow-rose-500/30">
                        {Math.min(notificaciones.length, 9)}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-30 mt-3 w-[min(90vw,22rem)] overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/95 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
                    <div className="border-b border-white/10 px-4 py-4">
                        <p className="text-sm font-semibold text-white">
                            Notificaciones
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            Cambios recientes sobre tus tickets y seguimiento.
                        </p>
                    </div>

                    <div className="max-h-96 overflow-y-auto px-3 py-3">
                        {recientes.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-center">
                                <p className="text-sm font-medium text-white">
                                    Todo al día
                                </p>
                                <p className="mt-2 text-xs leading-5 text-slate-400">
                                    Aquí aparecerán los movimientos importantes de tus tickets.
                                </p>
                            </div>
                        ) : (
                            recientes.map((notificacion, index) => (
                                <div
                                    key={notificacion.id}
                                    className={`rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 ${
                                        index < recientes.length - 1 ? "mb-3" : ""
                                    }`}
                                >
                                    <p className="leading-6">{notificacion.mensaje}</p>
                                    <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                                        {formatNotificationDate(notificacion.created_at)}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
