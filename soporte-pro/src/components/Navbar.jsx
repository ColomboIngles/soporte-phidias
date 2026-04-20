import { supabase } from "../services/supabase";

export default function Navbar() {
    function toggleTheme() {
        const html = document.documentElement;
        html.classList.toggle("dark");

        localStorage.setItem(
            "theme",
            html.classList.contains("dark") ? "dark" : "light"
        );
    }

    async function logout() {
        await supabase.auth.signOut();
        window.location.reload();
    }

    return (
        <div className="flex justify-between items-center px-6 py-4 border-b bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur">

            <h2 className="font-semibold text-lg">Panel</h2>

            <div className="flex items-center gap-3">

                <button
                    onClick={toggleTheme}
                    className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 hover:scale-105 transition"
                >
                    🌙
                </button>

                <button
                    onClick={logout}
                    className="px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                >
                    Salir
                </button>

            </div>
        </div>
    );
}