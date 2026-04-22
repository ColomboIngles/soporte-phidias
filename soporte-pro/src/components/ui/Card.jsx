import Surface from "./Surface";
import { cn } from "../../utils/cn";

const PADDING = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-7",
};

export default function Card({
    children,
    className,
    variant = "default",
    interactive = false,
    padding = "md",
    as = "section",
    ...props
}) {
    return (
        <Surface
            as={as}
            variant={variant}
            interactive={interactive}
            className={cn("app-card", PADDING[padding] || PADDING.md, className)}
            {...props}
        >
            {children}
        </Surface>
    );
}
