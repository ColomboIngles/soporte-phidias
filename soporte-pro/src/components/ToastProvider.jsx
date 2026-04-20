import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    CheckCircle2,
    AlertCircle,
    Info,
    X,
} from "lucide-react";
import { ToastContext } from "../hooks/toast-context";

const TOAST_STYLES = {
    success: {
        icon: CheckCircle2,
        accent: "from-emerald-400/80 to-emerald-500/50",
        iconClassName: "text-emerald-300",
        badgeClassName: "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/20",
    },
    error: {
        icon: AlertCircle,
        accent: "from-rose-400/80 to-rose-500/50",
        iconClassName: "text-rose-300",
        badgeClassName: "bg-rose-400/15 text-rose-200 ring-1 ring-rose-300/20",
    },
    info: {
        icon: Info,
        accent: "from-sky-400/80 to-indigo-500/50",
        iconClassName: "text-sky-300",
        badgeClassName: "bg-sky-400/15 text-sky-200 ring-1 ring-sky-300/20",
    },
};

function buildToast(input) {
    if (typeof input === "string") {
        return {
            title: input,
            message: "",
            type: "info",
            duration: 4200,
        };
    }

    return {
        title: input.title || "Notificación",
        message: input.message || "",
        type: input.type || "info",
        duration: input.duration ?? 4200,
    };
}

function ToastCard({ toast, onDismiss }) {
    const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
    const Icon = style.icon;
    const MotionCard = motion.div;
    const MotionBar = motion.div;

    return (
        <MotionCard
            layout
            initial={{ opacity: 0, x: 56, scale: 0.96, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 40, scale: 0.98, filter: "blur(6px)" }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-slate-950/85 p-4 text-white shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur-2xl"
        >
            <div
                className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${style.accent}`}
            />

            <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-2xl bg-white/8 p-2 ring-1 ring-white/10">
                    <Icon className={`h-5 w-5 ${style.iconClassName}`} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.18em] ${style.badgeClassName}`}
                        >
                            {toast.type}
                        </span>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-white">
                        {toast.title}
                    </p>

                    {toast.message && (
                        <p className="mt-1 text-sm leading-5 text-slate-300">
                            {toast.message}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => onDismiss(toast.id)}
                    className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                    aria-label="Cerrar notificación"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <MotionBar
                className={`mt-4 h-1 rounded-full bg-gradient-to-r ${style.accent}`}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: toast.duration / 1000, ease: "linear" }}
                style={{ transformOrigin: "left" }}
            />
        </MotionCard>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    function dismissToast(id) {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }

    function showToast(input) {
        const toast = buildToast(input);
        const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

        setToasts((current) => [...current, { ...toast, id }]);

        window.setTimeout(() => {
            dismissToast(id);
        }, toast.duration);

        return id;
    }

    return (
        <ToastContext.Provider value={{ showToast, dismissToast }}>
            {children}

            <div className="pointer-events-none fixed right-4 top-4 z-[100] w-[calc(100vw-2rem)] max-w-sm sm:right-6 sm:top-6">
                <AnimatePresence initial={false}>
                    {toasts.map((toast) => (
                        <div key={toast.id} className="pointer-events-auto mb-3">
                            <ToastCard toast={toast} onDismiss={dismissToast} />
                        </div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
