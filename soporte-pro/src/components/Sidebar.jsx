import { Link, useLocation } from "react-router-dom";
import {
    KanbanSquare,
    LayoutDashboard,
    ShieldCheck,
    Sparkles,
    Ticket,
    Users,
} from "lucide-react";
import { getNavigationItems, isEndUserRole } from "../utils/permissions";

const ICONS = {
    dashboard: LayoutDashboard,
    tickets: Ticket,
    kanban: KanbanSquare,
    usuarios: Users,
    auditoria: ShieldCheck,
};

export default function Sidebar({ rol }) {
    const location = useLocation();
    const navigationItems = getNavigationItems(rol);
    const isEndUser = isEndUserRole(rol);

    function item(path, label, icon) {
        const IconComponent = icon;
        const active = location.pathname === path;

        return (
            <Link
                to={path}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${
                    active
                        ? "border border-cyan-400/20 bg-cyan-400/12 text-white shadow-[0_12px_40px_rgba(56,189,248,0.18)]"
                        : "border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                }`}
            >
                <span
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                        active
                            ? "bg-cyan-400/15 text-cyan-200"
                            : "bg-white/[0.04] text-slate-400 group-hover:bg-white/10 group-hover:text-slate-200"
                    }`}
                >
                    <IconComponent size={17} />
                </span>
                <span>{label}</span>
            </Link>
        );
    }

    return (
        <aside className="relative hidden h-full w-72 shrink-0 border-r border-white/10 bg-slate-950/45 p-5 backdrop-blur-2xl lg:flex lg:flex-col">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.24)]">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    Soporte Pro
                </div>
                <h1 className="mt-4 text-xl font-semibold tracking-tight text-white">
                    {isEndUser ? "Seguimiento de tickets" : "Workspace SaaS"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                    {isEndUser
                        ? "Consulta el estado de tus solicitudes, adjunta evidencias y conversa con soporte en tiempo real."
                        : "Gestión centralizada de tickets, analítica y operación técnica."}
                </p>
            </div>

            <nav className="mt-6 space-y-2">
                {navigationItems.map((navItem) =>
                    item(navItem.path, navItem.label, ICONS[navItem.key])
                )}
            </nav>

            <div className="mt-auto rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Rol activo
                </p>
                <p className="mt-2 text-sm font-semibold capitalize text-white">
                    {rol || "cargando"}
                </p>
            </div>
        </aside>
    );
}
