import { cn } from "../../utils/cn";

export default function Input({
    label,
    hint,
    error,
    className,
    containerClassName,
    labelClassName,
    copyClassName,
    icon: Icon,
    trailing,
    ...props
}) {
    const control = (
        <div className="relative">
            {Icon ? (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[color:var(--app-text-tertiary)]">
                    <Icon className="h-4 w-4" />
                </div>
            ) : null}

            <input
                {...props}
                className={cn(
                    "app-input-shell",
                    Icon && "pl-10",
                    trailing && "pr-12",
                    error && "app-field-invalid",
                    className
                )}
            />

            {trailing ? (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {trailing}
                </div>
            ) : null}
        </div>
    );

    if (!label && !hint && !error) {
        return control;
    }

    return (
        <label className={cn("app-field", containerClassName)}>
            {label ? (
                <span className={cn("app-field-label", labelClassName)}>
                    {label}
                </span>
            ) : null}
            {control}
            {error ? (
                <span className={cn("app-field-copy app-field-error", copyClassName)}>
                    {error}
                </span>
            ) : hint ? (
                <span className={cn("app-field-copy", copyClassName)}>{hint}</span>
            ) : null}
        </label>
    );
}
