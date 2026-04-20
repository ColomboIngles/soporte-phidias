import { supabase } from "../services/supabase";
import { Bell, Moon, Search, Sun } from "lucide-react";
import { useState } from "react";

export default function Topbar({ user }) {
    const [dark, setDark] = useState(
        document.documentElement.classList.contains("dark")
    );

    function toggleTheme() {
        if (dark) {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        } else {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        }
        setDark(!dark);
    }

    async function logout() {
        await supabase.auth.signOut();
        window.location.reload();
    }

    return (
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/55 px-4 py-4 backdrop-blur-2xl sm:px-6">
            <div className="flex items-center justify-between gap-4">
                <div className="hidden flex-1 lg:block">
                    <div className="flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 shadow-inner shadow-black/10">
                        <Search className="h-4 w-4 text-slate-500" />
                        <input
                            placeholder="Buscar tickets, usuarios o estados..."
                            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                        />
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-3">
                    <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/15 hover:bg-white/[0.08] hover:text-white">
                        <Bell size={18} />
                    </button>

                    <button
                        onClick={toggleTheme}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
                    >
                        {dark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-right">
                        <p className="max-w-[220px] truncate text-sm font-semibold text-white">
                            {user.email}
                        </p>
                        <button
                            onClick={logout}
                            className="mt-1 text-xs font-medium text-rose-300 hover:text-rose-200"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
