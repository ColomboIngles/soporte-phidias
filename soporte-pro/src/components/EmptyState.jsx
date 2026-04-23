import { Inbox, Sparkles } from "lucide-react";
import Surface from "./ui/Surface";
import Button from "./ui/Button";

export default function EmptyState({
    icon,
    title,
    description,
    action,
    compact = false,
    eyebrow = "Sin actividad",
}) {
    const IconComponent = icon || Inbox;

    return (
        <Surface
            variant="elevated"
            className={`brand-glow relative overflow-hidden rounded-[1.85rem] text-center ${
                compact ? "px-5 py-8" : "px-6 py-12"
            }`}
        >
            <div className="relative">
                <div className="app-kicker mx-auto w-max">
                    <Sparkles className="h-3.5 w-3.5" />
                    {eyebrow}
                </div>

                <div className="app-icon-badge mx-auto mt-5 h-16 w-16 rounded-[1.5rem]">
                    <IconComponent className="h-7 w-7" />
                </div>

                <h3 className="mt-5 text-xl font-semibold tracking-tight text-[color:var(--app-text-primary)]">
                    {title}
                </h3>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-[color:var(--app-text-secondary)]">
                    {description}
                </p>

                {action ? (
                    <div className="mt-6">{action}</div>
                ) : compact ? null : (
                    <div className="mt-6">
                        <Button variant="secondary">Explorar modulo</Button>
                    </div>
                )}
            </div>
        </Surface>
    );
}
