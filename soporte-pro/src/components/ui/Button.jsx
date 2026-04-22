import { cn } from "../../utils/cn";

const VARIANTS = {
    primary: "app-button app-button-primary",
    secondary: "app-button app-button-secondary",
    ghost: "app-button app-button-ghost",
    danger: "app-button app-button-danger",
};

const SIZES = {
    sm: "h-10 px-4 text-sm",
    md: "h-11 px-4 text-sm",
    lg: "h-12 px-5 text-sm",
};

export default function Button({
    children,
    className,
    variant = "primary",
    size = "md",
    fullWidth = false,
    iconLeft: IconLeft,
    iconRight: IconRight,
    type = "button",
    ...props
}) {
    return (
        <button
            type={type}
            className={cn(
                VARIANTS[variant] || VARIANTS.primary,
                SIZES[size] || SIZES.md,
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            {IconLeft ? <IconLeft className="h-4 w-4 shrink-0" /> : null}
            <span className="truncate">{children}</span>
            {IconRight ? <IconRight className="h-4 w-4 shrink-0" /> : null}
        </button>
    );
}
