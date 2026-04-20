import { supabase } from "../services/supabase";
import { Bell, Moon, Sun } from "lucide-react";
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
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 backdrop-blur bg-white/5">

            {/* BUSCADOR */}
            <input
                placeholder="Buscar..."
                className="bg-white/10 px-4 py-2 rounded-xl text-sm outline-none"
            />

            {/* DERECHA */}
            <div className="flex items-center gap-4">

                <button className="hover:scale-110 transition">
                    <Bell size={18} />
                </button>

                <button onClick={toggleTheme}>
                    {dark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <div className="text-sm text-right">
                    <p className="font-semibold">{user.email}</p>
                    <button
                        onClick={logout}
                        className="text-xs text-red-400"
                    >
                        Cerrar sesión
                    </button>
                </div>

            </div>
        </div>
    );
}
