import { cn } from "../utils/cn";
import escudo from "../assets/branding/escudo.png";

export default function BrandMark({
    className,
    markClassName,
    titleClassName,
    subtitleClassName,
    showSubtitle = false,
    compact = false,
    align = "left",
}) {
    return (
        <div
            className={cn(
                "flex items-center gap-3",
                align === "center" && "justify-center text-center",
                className
            )}
        >
            <div
                className={cn(
                    "flex shrink-0 items-center justify-center rounded-[1.35rem] border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] shadow-sm",
                    compact ? "h-12 w-12 p-2" : "h-16 w-16 p-2.5",
                    markClassName
                )}
            >
                <img
                    src={escudo}
                    alt="Escudo institucional"
                    className="h-full w-full object-contain"
                />
            </div>

            <div className={cn("min-w-0", align === "center" && "text-center")}>
                <p
                    className={cn(
                        "truncate text-lg font-semibold tracking-[-0.03em] text-[color:var(--app-text-primary)]",
                        compact && "text-base",
                        titleClassName
                    )}
                >
                    Sistema Soporte Técnico
                </p>
                {showSubtitle ? (
                    <p
                        className={cn(
                            "mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]",
                            subtitleClassName
                        )}
                    >
                        Soporte institucional
                    </p>
                ) : null}
            </div>
        </div>
    );
}
