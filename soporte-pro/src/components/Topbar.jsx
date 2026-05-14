import { LogOut, Menu, Search } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
    clearPhidiasAccess,
} from "../services/phidiasSession";
import { supabase } from "../services/supabase";
import HelpAssistant from "./HelpAssistant";
import Notifications from "./Notifications";
import ThemeToggle from "./ThemeToggle";
import BrandMark from "./BrandMark";
import { isEndUserRole } from "../utils/permissions";
import { MotionItem, MotionSection, MotionStagger } from "./AppMotion";

function getSearchContext(pathname) {
    if (pathname === "/") {
        return {
            pathname: "/",
            placeholder: "Buscar tickets, tecnicos o estados en dashboard...",
            label: "Buscar tickets, tecnicos o estados en dashboard",
            replace: true,
        };
    }

    if (pathname === "/kanban") {
        return {
            pathname: "/kanban",
            placeholder: "Buscar tickets, tecnicos o estados en kanban...",
            label: "Buscar tickets, tecnicos o estados en kanban",
            replace: true,
        };
    }

    if (pathname === "/usuarios") {
        return {
            pathname: "/usuarios",
            placeholder: "Buscar usuarios, correos, roles o IDs...",
            label: "Buscar usuarios, correos, roles o IDs",
            replace: true,
        };
    }

    if (pathname === "/auditoria") {
        return {
            pathname: "/auditoria",
            placeholder: "Buscar usuarios, acciones o tickets auditados...",
            label: "Buscar usuarios, acciones o tickets auditados",
            replace: true,
        };
    }

    if (pathname === "/tickets" || pathname.startsWith("/tickets/")) {
        return {
            pathname: "/tickets",
            placeholder: "Buscar tickets, usuarios, tecnicos o estados...",
            label: "Buscar tickets, usuarios, tecnicos o estados",
            replace: pathname === "/tickets",
        };
    }

    return {
        pathname,
        placeholder: "Buscar en este modulo...",
        label: "Buscar en este modulo",
        replace: true,
    };
}

function getUserInitial(email) {
    return String(email || "?").charAt(0).toUpperCase();
}

export default function Topbar({
    user,
    rol,
    phidiasMode = false,
    phidiasReturnTo = "",
    phidiasReferrer = "",
    onOpenSidebar,
}) {
    const isEndUser = isEndUserRole(rol);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const searchContext = getSearchContext(location.pathname);
    const currentSearch = searchParams.get("search") || "";

    async function logout() {
        clearPhidiasAccess();
        await supabase.auth.signOut();
        window.location.reload();
    }

    function softExit() {
        if (phidiasReferrer) {
            window.location.assign(phidiasReferrer);
            return;
        }

        if (typeof window !== "undefined" && window.history.length > 1) {
            window.history.back();
            return;
        }

        navigate(phidiasReturnTo || "/tickets", { replace: true });
    }

    function submitSearch(event) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const rawValue = formData.get("global-search");
        const normalized =
            typeof rawValue === "string" ? rawValue.trim() : "";

        const params = new URLSearchParams(searchParams);

        if (normalized) {
            params.set("search", normalized);
        } else {
            params.delete("search");
        }

        navigate({
            pathname: searchContext.pathname,
            search: params.toString() ? `?${params.toString()}` : "",
        }, { replace: searchContext.replace });
    }

    return (
        <header className="app-topbar-shell sticky top-0 z-20 px-4 py-4 sm:px-6">
            <div className="mx-auto grid w-full max-w-[1680px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 lg:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={onOpenSidebar}
                        className="app-icon-button lg:hidden"
                        aria-label="Abrir menu lateral"
                    >
                        <Menu className="h-4 w-4" />
                    </button>

                    <div className="hidden lg:block 2xl:hidden">
                        <BrandMark
                            compact
                            className="min-w-0"
                            markClassName="h-11 w-11 rounded-[1rem] bg-[color:var(--app-surface-strong)] p-2.5"
                            titleClassName="hidden"
                            subtitleClassName="hidden"
                        />
                    </div>

                    <div className="hidden 2xl:block min-w-0">
                        <BrandMark
                            compact
                            className="min-w-[18rem]"
                            markClassName="h-11 w-11 rounded-[1rem] bg-[color:var(--app-surface-strong)] p-2.5"
                            titleClassName="text-base"
                            subtitleClassName="hidden"
                        />
                    </div>
                </div>

                <MotionSection className="min-w-0">
                    {isEndUser ? (
                        <div className="app-search-shell">
                            <Search className="h-4 w-4 shrink-0 text-[color:var(--app-accent)]" />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[color:var(--app-text-primary)]">
                                    Gestiona tus tickets
                                </p>
                                <p className="truncate text-xs text-[color:var(--app-text-tertiary)]">
                                    Estado, mensajes y seguimiento en un solo lugar.
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
                                placeholder={searchContext.placeholder}
                                aria-label={searchContext.label}
                            />
                            <button
                                type="submit"
                                className="app-icon-button h-9 w-9 shrink-0 rounded-xl border-none bg-transparent shadow-none"
                                aria-label="Ejecutar busqueda"
                            >
                                <Search className="h-4 w-4" />
                            </button>
                        </form>
                    )}
                </MotionSection>

                <MotionStagger
                    className="flex shrink-0 items-center gap-2 sm:gap-3"
                    delayChildren={0.06}
                    staggerChildren={0.05}
                >
                    <MotionItem>
                        <HelpAssistant role={rol} />
                    </MotionItem>
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
                                    background: "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 14%, white 86%), color-mix(in srgb, var(--brand-accent) 12%, white 88%))",
                                }}
                            >
                                {getUserInitial(user.email)}
                            </div>

                            <div className="hidden min-w-0 2xl:block">
                                <p className="max-w-[14rem] truncate text-sm font-semibold text-[color:var(--app-text-primary)]">
                                    {user.email}
                                </p>
                                <p className="text-xs capitalize text-[color:var(--app-text-tertiary)]">
                                    {rol || "usuario"}
                                </p>
                            </div>

                            {phidiasMode ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={softExit}
                                        className="app-button app-button-ghost h-10 px-3 text-xs font-semibold"
                                        title="Salir de la vista sin cerrar la sesion validada"
                                    >
                                        Volver
                                    </button>
                                    <button
                                        onClick={logout}
                                        className="app-button app-button-ghost h-10 w-10 rounded-xl px-0 text-xs font-semibold"
                                        title="Cambiar cuenta y cerrar la sesion validada"
                                        aria-label="Cambiar cuenta y cerrar sesion"
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={logout}
                                    className="app-button app-button-ghost h-10 px-3 text-xs font-semibold"
                                >
                                    Salir
                                </button>
                            )}
                        </div>
                    </MotionItem>
                </MotionStagger>
            </div>
        </header>
    );
}
