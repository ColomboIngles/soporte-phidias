import { cn } from "../../utils/cn";

export default function SectionHeader({
    eyebrow,
    title,
    description,
    icon: Icon,
    actions,
    className,
}) {
    return (
        <div
            className={cn(
                "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
                className
            )}
        >
            <div className="min-w-0">
                {eyebrow ? <div className="app-kicker">{eyebrow}</div> : null}
                {title ? <h2 className="app-section-title">{title}</h2> : null}
                {description ? (
                    <p className="app-section-copy">{description}</p>
                ) : null}
            </div>

            {Icon || actions ? (
                <div className="flex items-center gap-3 self-start">
                    {Icon ? (
                        <div className="app-icon-badge">
                            <Icon className="h-5 w-5" />
                        </div>
                    ) : null}
                    {actions}
                </div>
            ) : null}
        </div>
    );
}
