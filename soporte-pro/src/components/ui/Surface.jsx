import { cn } from "../../utils/cn";

const VARIANTS = {
    default: "app-surface",
    muted: "app-surface-muted",
    hero: "app-surface-hero",
    elevated: "app-surface-elevated",
};

export default function Surface({
    children,
    className,
    variant = "default",
    interactive = false,
    as = "section",
    ...props
}) {
    const Component = as;

    return (
        <Component
            className={cn(
                VARIANTS[variant] || VARIANTS.default,
                interactive && "app-surface-interactive",
                className
            )}
            {...props}
        >
            {children}
        </Component>
    );
}
