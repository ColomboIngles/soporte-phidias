import { Inbox } from "lucide-react";

export default function EmptyState({
    icon,
    title,
    description,
    action,
    compact = false,
}) {
    const IconComponent = icon || Inbox;

    return (
        <div
            className={`rounded-[1.75rem] border border-dashed border-white/10 bg-slate-950/30 text-center ${
                compact ? "px-5 py-8" : "px-6 py-12"
            }`}
        >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-400/10">
                <IconComponent className="h-6 w-6 text-cyan-300" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
                {description}
            </p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
