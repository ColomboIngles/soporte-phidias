export default function ChartCard({ title, children }) {
    return (
        <div className="app-surface rounded-2xl p-5">
            <h3 className="mb-4 font-semibold text-[color:var(--app-text-primary)]">
                {title}
            </h3>
            {children}
        </div>
    );
}
