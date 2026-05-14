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
    title = "Sistema Soporte T\u00e9cnico",
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
                    "flex shrink-0 items-center justify-center rounded-[1.1rem] border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] shadow-sm",
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

            <div className={cn("min-w-0 flex-1", align === "center" && "text-center")}>
                <p
                    className={cn(
                        "truncate text-lg font-semibold leading-tight tracking-[-0.03em] text-[color:var(--app-text-primary)]",
                        compact && "text-[0.98rem]",
                        titleClassName
                    )}
                >
                    {title}
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
