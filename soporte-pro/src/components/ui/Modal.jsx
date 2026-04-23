import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { DIALOG_TRANSITION, OVERLAY_TRANSITION } from "../motion-presets";

const MotionDiv = motion.div;

const WIDTHS = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
};

export default function Modal({
    open,
    onClose,
    title,
    description,
    children,
    actions,
    icon: Icon,
    size = "md",
    widthClassName,
}) {
    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function handleEscape(event) {
            if (event.key === "Escape") {
                onClose?.();
            }
        }

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open, onClose]);

    if (typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <AnimatePresence>
            {open ? (
                <MotionDiv
                    className="modal-backdrop fixed inset-0 z-modal flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={OVERLAY_TRANSITION}
                    onClick={onClose}
                >
                    <MotionDiv
                        className={cn(
                            "modal-card w-full overflow-hidden rounded-[2rem]",
                            WIDTHS[size] || WIDTHS.md,
                            widthClassName
                        )}
                        initial={{
                            opacity: 0,
                            y: 18,
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
                            y: 14,
                            scale: 0.992,
                            filter: "blur(4px)",
                        }}
                        transition={DIALOG_TRANSITION}
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--app-border)] px-6 py-5">
                            <div className="flex items-start gap-4">
                                {Icon ? (
                                    <div className="app-icon-badge">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                ) : null}

                                <div>
                                    <h2 className="text-xl font-semibold tracking-tight text-[color:var(--app-text-primary)]">
                                        {title}
                                    </h2>
                                    {description ? (
                                        <p className="mt-1.5 max-w-xl text-sm leading-6 text-[color:var(--app-text-secondary)]">
                                            {description}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="app-icon-button h-10 w-10 rounded-xl"
                                aria-label="Cerrar modal"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="px-6 py-6">{children}</div>

                        {actions ? (
                            <div className="flex flex-wrap justify-end gap-3 border-t border-[color:var(--app-border)] px-6 py-5">
                                {actions}
                            </div>
                        ) : null}
                    </MotionDiv>
                </MotionDiv>
            ) : null}
        </AnimatePresence>,
        document.body
    );
}
