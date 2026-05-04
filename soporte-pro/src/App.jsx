import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "./services/supabase";
import { crearUsuarioSiNoExiste, obtenerRol } from "./services/usuarios";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ThemeToggle from "./components/ThemeToggle";
import Login from "./pages/Login";
import Skeleton from "./components/skeleton";
import { ToastProvider } from "./components/ToastProvider";
import { MotionPage, MotionSection } from "./components/AppMotion";
import {
    canAccessDashboard,
    canAccessKanban,
    canAccessTicketEdit,
    canAccessUserAdmin,
    canCreateTickets,
    getHomeRouteByRole,
} from "./utils/permissions";

const TRUSTED_EMAIL_KEY = "soporte_phidias_trusted_email";

const routerBasename =
    import.meta.env.BASE_URL && import.meta.env.BASE_URL !== "/"
        ? import.meta.env.BASE_URL.replace(/\/$/, "")
        : undefined;

function normalizeEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function readAccessContext() {
    if (typeof window === "undefined") {
        return {
            email: "",
            source: "",
        };
    }

    const params = new URLSearchParams(window.location.search);

    return {
        email: normalizeEmail(params.get("email") || ""),
        source: (params.get("source") || "").trim().toLowerCase(),
    };
}

function stripAuthParamsFromUrl() {
    if (typeof window === "undefined") {
        return;
    }

    const url = new URL(window.location.href);
    const authParams = [
        "code",
        "type",
        "access_token",
        "refresh_token",
        "expires_at",
        "expires_in",
        "token_type",
    ];

    let changed = false;

    authParams.forEach((param) => {
        if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            changed = true;
        }
    });

    if (url.hash) {
        changed = true;
        url.hash = "";
    }

    if (changed) {
        window.history.replaceState({}, document.title, url.toString());
    }
}

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tickets = lazy(() => import("./pages/Tickets"));
const TicketDetalle = lazy(() => import("./pages/TicketDetalle"));
const Kanban = lazy(() => import("./pages/kanban"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Auditoria = lazy(() => import("./pages/Auditoria"));
const NuevoTicket = lazy(() => import("./pages/NuevoTicket"));
const EditarTicket = lazy(() => import("./pages/EditarTicket"));

function AppBootSplash() {
    return (
        <MotionPage className="app-shell flex min-h-screen items-center justify-center px-4 py-8">
            <div className="fixed right-5 top-5 z-20">
                <ThemeToggle />
            </div>

            <MotionSection
                delay={0.08}
                className="app-surface w-full max-w-2xl rounded-[2rem] p-8 text-center shadow-sm sm:p-10"
            >
                <div className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.5rem] border border-[color:var(--app-border)] bg-[color:var(--app-accent-soft)]">
                    <ShieldCheck className="h-8 w-8 text-[color:var(--app-accent)]" />
                </div>

                <div className="app-kicker mx-auto mt-6 w-max">
                    <Sparkles className="h-3.5 w-3.5" />
                    Preparando entorno
                </div>

                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[color:var(--app-text-primary)]">
                    Cargando tu workspace de soporte
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[color:var(--app-text-secondary)]">
                    Estamos validando sesion, permisos y contexto visual para que la plataforma abra con una experiencia mas limpia, moderna y comercial.
                </p>

                <div className="app-surface-muted mt-8 inline-flex items-center gap-3 rounded-full px-4 py-3 text-sm text-[color:var(--app-text-secondary)]">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[color:var(--app-accent)]" />
                    Cargando entorno seguro...
                </div>
            </MotionSection>
        </MotionPage>
    );
}

function RouteFallback() {
    return (
        <MotionPage className="space-y-6">
            <MotionSection className="app-surface rounded-[1.75rem] p-6">
                <div className="h-6 w-48 rounded-full bg-[color:var(--app-border)]" />
                <div className="mt-3 h-4 w-72 max-w-full rounded-full bg-[color:var(--app-surface-muted)]" />
            </MotionSection>
            <Skeleton />
        </MotionPage>
    );
}

function AppLayout({ rol, session }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const homeRoute = getHomeRouteByRole(rol);

    return (
        <BrowserRouter basename={routerBasename}>
            <div className="app-shell flex min-h-screen bg-[color:var(--app-bg)]">
                <Sidebar
                    rol={rol}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() =>
                        setSidebarCollapsed((previous) => !previous)
                    }
                />

                <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                    <Topbar
                        user={session.user}
                        rol={rol}
                        onOpenSidebar={() => setSidebarOpen(true)}
                    />

                    <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 xl:px-8">
                        <div className="mx-auto flex w-full max-w-[1680px] flex-col">
                            <Suspense fallback={<RouteFallback />}>
                                <Routes>
                                    <Route
                                        path="/"
                                        element={
                                            canAccessDashboard(rol) ? (
                                                <Dashboard />
                                            ) : (
                                                <Navigate to="/tickets" replace />
                                            )
                                        }
                                    />
                                    <Route path="/tickets" element={<Tickets role={rol} />} />
                                    <Route
                                        path="/tickets/nuevo"
                                        element={
                                            canCreateTickets(rol) ? (
                                                <NuevoTicket rol={rol} />
                                            ) : (
                                                <Navigate to={homeRoute} replace />
                                            )
                                        }
                                    />
                                    <Route
                                        path="/tickets/:id"
                                        element={<TicketDetalle rol={rol} />}
                                    />
                                    <Route
                                        path="/tickets/:id/editar"
                                        element={
                                            canAccessTicketEdit(rol) ? (
                                                <EditarTicket />
                                            ) : (
                                                <Navigate to="/tickets" replace />
                                            )
                                        }
                                    />
                                    <Route
                                        path="/kanban"
                                        element={
                                            canAccessKanban(rol) ? (
                                                <Kanban rol={rol} />
                                            ) : (
                                                <Navigate to="/tickets" replace />
                                            )
                                        }
                                    />

                                    {canAccessUserAdmin(rol) ? (
                                        <>
                                            <Route path="/usuarios" element={<Usuarios />} />
                                            <Route path="/auditoria" element={<Auditoria />} />
                                        </>
                                    ) : null}

                                    <Route
                                        path="*"
                                        element={<Navigate to={homeRoute} replace />}
                                    />
                                </Routes>
                            </Suspense>
                        </div>
                    </main>
                </div>
            </div>
        </BrowserRouter>
    );
}

function App() {
    const [session, setSession] = useState(null);
    const [rol, setRol] = useState(null);
    const [bootstrapping, setBootstrapping] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const accessContext = readAccessContext();

        async function hydrateSession(nextSession) {
            if (!isMounted) return;

            const sessionEmail = normalizeEmail(nextSession?.user?.email || "");
            const expectedEmail = accessContext.source === "phidias"
                ? normalizeEmail(accessContext.email)
                : "";

            if (nextSession?.user && expectedEmail && sessionEmail !== expectedEmail) {
                await supabase.auth.signOut();
                window.localStorage.removeItem(TRUSTED_EMAIL_KEY);

                if (!isMounted) return;

                setSession(null);
                setRol(null);
                setBootstrapping(false);
                return;
            }

            setSession(nextSession);

            if (!nextSession?.user) {
                setRol(null);
                if (isMounted) {
                    setBootstrapping(false);
                }
                return;
            }

            if (sessionEmail) {
                window.localStorage.setItem(TRUSTED_EMAIL_KEY, sessionEmail);
            }

            await crearUsuarioSiNoExiste(nextSession.user);
            const nextRol = await obtenerRol(
                nextSession.user.id,
                nextSession.user.email
            );

            if (!isMounted) return;

            setRol(nextRol);
            setBootstrapping(false);
        }

        async function bootstrapAuth() {
            const url = new URL(window.location.href);
            const authCode = url.searchParams.get("code");

            if (authCode) {
                await supabase.auth.exchangeCodeForSession(authCode).catch(() => null);
                stripAuthParamsFromUrl();
            }

            const { data } = await supabase.auth.getSession();
            hydrateSession(data.session);
        }

        bootstrapAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_, nextSession) => {
            setBootstrapping(true);
            hydrateSession(nextSession);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <ToastProvider>
            {bootstrapping ? (
                <AppBootSplash />
            ) : !session ? (
                <Login />
            ) : (
                <AppLayout rol={rol} session={session} />
            )}
        </ToastProvider>
    );
}

export default App;
