export default function StatCard({ title, value, icon, extra }) {
    return (
        <div className="app-surface rounded-2xl p-5 flex justify-between items-center">
            <div>
                <p className="text-sm text-[color:var(--app-text-tertiary)]">{title}</p>
                <h2 className="text-2xl font-bold text-[color:var(--app-text-primary)]">
                    {value}
                </h2>
                {extra && (
                    <p className="mt-1 text-xs text-[color:var(--app-text-secondary)]">{extra}</p>
                )}
            </div>

            <div className="text-2xl text-[color:var(--app-accent)]">{icon}</div>
        </div>
    );
}
