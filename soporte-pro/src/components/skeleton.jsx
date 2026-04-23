export default function Skeleton({ variant = "dashboard" }) {
    if (variant === "table") {
        return (
            <div className="animate-pulse space-y-5">
                <div className="glass-panel rounded-[2rem] p-6">
                    <div className="h-7 w-56 rounded-full bg-[color:var(--app-border)]" />
                    <div className="mt-3 h-4 w-80 max-w-full rounded-full bg-[color:var(--app-surface-muted)]" />
                </div>

                <div className="glass-panel rounded-[2rem] p-4">
                    <div className="grid gap-3">
                        {[...Array(6)].map((_, index) => (
                            <div
                                key={index}
                                className="grid grid-cols-5 gap-3 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] p-4"
                            >
                                <div className="col-span-2 h-4 rounded-full bg-[color:var(--app-border)]" />
                                <div className="h-4 rounded-full bg-[color:var(--app-surface)]" />
                                <div className="h-4 rounded-full bg-[color:var(--app-surface)]" />
                                <div className="h-4 rounded-full bg-[color:var(--app-surface)]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (variant === "form") {
        return (
            <div className="animate-pulse space-y-5">
                <div className="glass-panel rounded-[2rem] p-6">
                    <div className="h-7 w-52 rounded-full bg-[color:var(--app-border)]" />
                    <div className="mt-3 h-4 w-72 rounded-full bg-[color:var(--app-surface-muted)]" />
                </div>

                <div className="glass-panel rounded-[2rem] p-6 space-y-4">
                    <div className="h-12 rounded-2xl bg-[color:var(--app-surface-muted)]" />
                    <div className="h-32 rounded-2xl bg-[color:var(--app-surface-muted)]" />
                    <div className="h-12 rounded-2xl bg-[color:var(--app-surface-muted)]" />
                    <div className="h-12 w-40 rounded-2xl bg-[color:var(--app-border)]" />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-pulse space-y-6">
            <div className="glass-panel rounded-[2rem] p-6">
                <div className="h-8 w-56 rounded-full bg-[color:var(--app-border)]" />
                <div className="mt-3 h-4 w-80 max-w-full rounded-full bg-[color:var(--app-surface-muted)]" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, index) => (
                    <div
                        key={index}
                        className="glass-panel rounded-[1.75rem] p-5"
                    >
                        <div className="h-4 w-24 rounded-full bg-[color:var(--app-surface-muted)]" />
                        <div className="mt-4 h-8 w-20 rounded-full bg-[color:var(--app-border)]" />
                        <div className="mt-4 h-12 rounded-2xl bg-[color:var(--app-surface-muted)]" />
                    </div>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
                <div className="glass-panel rounded-[2rem] p-6 xl:col-span-7">
                    <div className="h-5 w-48 rounded-full bg-[color:var(--app-border)]" />
                    <div className="mt-3 h-4 w-72 rounded-full bg-[color:var(--app-surface-muted)]" />
                    <div className="mt-6 h-72 rounded-[1.5rem] bg-[color:var(--app-surface-muted)]" />
                </div>

                <div className="glass-panel rounded-[2rem] p-6 xl:col-span-5">
                    <div className="h-5 w-40 rounded-full bg-[color:var(--app-border)]" />
                    <div className="mt-3 h-4 w-56 rounded-full bg-[color:var(--app-surface-muted)]" />
                    <div className="mt-6 h-72 rounded-[1.5rem] bg-[color:var(--app-surface-muted)]" />
                </div>
            </div>
        </div>
    );
}
