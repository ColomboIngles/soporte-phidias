import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Ticket,
    KanbanSquare,
    Users
} from "lucide-react";

export default function Sidebar({ rol }) {
    const location = useLocation();

    const item = (path, label, Icon) => (
        <Link
            to={path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all
      ${location.pathname === path
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
        >
            <Icon size={18} />
            {label}
        </Link>
    );

    return (
        <div className="w-64 h-full p-4 backdrop-blur-xl bg-white/5 border-r border-white/10">

            <div className="mb-8 px-2">
                <h1 className="text-xl font-bold">🚀 Soporte</h1>
                <p className="text-xs text-gray-400">SaaS PRO</p>
            </div>

            <nav className="space-y-2">
                {item("/", "Dashboard", LayoutDashboard)}
                {item("/tickets", "Tickets", Ticket)}
                {item("/kanban", "Kanban", KanbanSquare)}

                {rol === "admin" &&
                    item("/usuarios", "Usuarios", Users)}
            </nav>

            <div className="absolute bottom-4 left-4 text-xs text-gray-500">
                Rol: {rol}
            </div>
        </div>
    );
}