import { cn } from "../../utils/cn";

const TONES = {
    neutral: "app-badge app-badge-neutral",
    success: "app-badge app-badge-success",
    info: "app-badge app-badge-info",
    warning: "app-badge app-badge-warning",
    danger: "app-badge app-badge-danger",
};

const LEGACY_TONES = {
    abierto: TONES.success,
    proceso: TONES.info,
    cerrado: TONES.neutral,
};

const SIZES = {
    sm: "px-2.5 py-1 text-[0.64rem]",
    md: "",
    lg: "px-3.5 py-1.5 text-[0.76rem]",
};

export default function Badge({
    children,
    tone = "neutral",
    type,
    size = "md",
    className,
}) {
    const resolvedTone = LEGACY_TONES[type] || TONES[tone] || TONES.neutral;

    return (
        <span className={cn(resolvedTone, SIZES[size] || SIZES.md, className)}>
            {children}
        </span>
    );
}
