import { cn } from "../../utils/cn";

export default function Select({
    label,
    hint,
    error,
    className,
    containerClassName,
    labelClassName,
    copyClassName,
    children,
    ...props
}) {
    const control = (
        <select
            {...props}
            className={cn(
                "app-input-shell app-select-shell",
                error && "app-field-invalid",
                className
            )}
        >
            {children}
        </select>
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
