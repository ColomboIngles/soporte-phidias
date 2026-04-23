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
        <div className="app-topbar-shell flex items-center justify-between px-6 py-4">

            <h2 className="font-semibold text-lg">Panel</h2>

            <div className="flex items-center gap-3">

                <button
                    onClick={toggleTheme}
                    className="app-button app-button-secondary h-10 px-3"
                >
                    Tema
                </button>

                <button
                    onClick={logout}
                    className="app-button app-button-danger h-10 px-3"
                >
                    Salir
                </button>

            </div>
        </div>
    );
}
