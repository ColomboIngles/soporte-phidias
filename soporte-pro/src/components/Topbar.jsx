import { Menu, Search, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import Notifications from "./Notifications";
import ThemeToggle from "./ThemeToggle";
import { isEndUserRole } from "../utils/permissions";
import { MotionItem, MotionSection, MotionStagger } from "./AppMotion";

function getUserInitial(email) {
    return String(email || "?").charAt(0).toUpperCase();
}

export default function Topbar({ user, rol, onOpenSidebar }) {
    const isEndUser = isEndUserRole(rol);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const currentSearch = searchParams.get("search") || "";

    async function logout() {
        await supabase.auth.signOut();
        window.location.reload();
    }

    function submitSearch(event) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const rawValue = formData.get("global-search");
        const normalized =
            typeof rawValue === "string" ? rawValue.trim() : "";

        const params = new URLSearchParams();

        if (normalized) {
            params.set("search", normalized);
        }

        if (location.pathname === "/tickets") {
            navigate(
                {
                    pathname: "/tickets",
                    search: params.toString() ? `?${params.toString()}` : "",
                },
                { replace: true }
            );
            return;
        }

        navigate({
            pathname: "/tickets",
            search: params.toString() ? `?${params.toString()}` : "",
        });
    }

    return (
        <header className="app-topbar-shell sticky top-0 z-20 px-4 py-4 sm:px-6">
            <div className="mx-auto flex w-full max-w-[1680px] items-center gap-3">
                <button
                    type="button"
                    onClick={onOpenSidebar}
                    className="app-icon-button lg:hidden"
                    aria-label="Abrir menu lateral"
                >
                    <Menu className="h-4 w-4" />
                </button>

                <MotionSection className="min-w-0 flex-1">
                    {isEndUser ? (
                        <div className="app-search-shell">
                            <ShieldCheck className="h-4 w-4 shrink-0 text-[color:var(--app-accent)]" />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[color:var(--app-text-primary)]">
                                    Sigue tus tickets, adjuntos y mensajes
                                </p>
                                <p className="truncate text-xs text-[color:var(--app-text-tertiary)]">
                                    Un solo espacio para dar contexto, conversar y recibir novedades.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form className="app-search-shell" onSubmit={submitSearch}>
                            <Search className="h-4 w-4 shrink-0 text-[color:var(--app-accent)]" />
                            <input
                                key={currentSearch}
                                name="global-search"
                                defaultValue={currentSearch}
                                placeholder="Buscar tickets, usuarios, tecnicos o estados..."
                                aria-label="Buscar tickets, usuarios, tecnicos o estados"
                            />
                            <button
                                type="submit"
                                className="app-button app-button-ghost h-9 shrink-0 rounded-xl px-3 text-xs font-semibold"
                                aria-label="Ejecutar busqueda"
                            >
                                Buscar
                            </button>
                        </form>
                    )}
                </MotionSection>

                <MotionStagger
                    className="ml-auto flex items-center gap-3"
                    delayChildren={0.06}
                    staggerChildren={0.05}
                >
                    <MotionItem>
                        <Notifications user={user.email} />
                    </MotionItem>
                    <MotionItem>
                        <ThemeToggle compact />
                    </MotionItem>
                    <MotionItem>
                        <div className="app-surface flex items-center gap-3 rounded-[1.25rem] px-3 py-2.5 shadow-sm">
                            <div
                                className="flex h-11 w-11 items-center justify-center rounded-[1rem] text-sm font-semibold text-[color:var(--app-accent)]"
                                style={{
                                    background:
                                        "linear-gradient(135deg, color-mix(in srgb, var(--brand-secondary) 16%, white 84%), color-mix(in srgb, var(--brand-accent) 14%, white 86%))",
                                }}
                            >
                                {getUserInitial(user.email)}
                            </div>

                            <div className="hidden min-w-0 sm:block">
                                <p className="max-w-[14rem] truncate text-sm font-semibold text-[color:var(--app-text-primary)]">
                                    {user.email}
                                </p>
                                <p className="text-xs capitalize text-[color:var(--app-text-tertiary)]">
                                    {rol || "usuario"}
                                </p>
                            </div>

                            <button
                                onClick={logout}
                                className="app-button app-button-ghost h-10 px-3 text-xs font-semibold"
                            >
                                Salir
                            </button>
                        </div>
                    </MotionItem>
                </MotionStagger>
            </div>
        </header>
    );
}
