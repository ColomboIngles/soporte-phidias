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
                className="app-surface-hero brand-glow w-full max-w-2xl rounded-[2.4rem] p-8 text-center sm:p-10"
            >
                <div className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(68,166,106,0.18),rgba(60,168,255,0.16),rgba(215,177,90,0.18))]">
                    <ShieldCheck className="h-8 w-8 text-[color:var(--app-accent)]" />
                </div>

                <div className="app-kicker mx-auto mt-6 w-max">
                    <Sparkles className="h-3.5 w-3.5" />
                    Preparando entorno
                </div>

                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">
                    Cargando tu workspace de soporte
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                    Estamos validando sesion, permisos y contexto visual para que la plataforma abra con una experiencia mas limpia, moderna y comercial.
                </p>

                <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-300">
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
            <MotionSection className="app-surface-hero rounded-[2rem] p-6">
                <div className="h-6 w-48 rounded-full bg-white/10" />
                <div className="mt-3 h-4 w-72 max-w-full rounded-full bg-white/5" />
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
        <BrowserRouter>
            <div className="app-shell flex min-h-screen bg-transparent">
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

                    <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
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

        async function hydrateSession(nextSession) {
            if (!isMounted) return;

            setSession(nextSession);

            if (!nextSession?.user) {
                setRol(null);
                if (isMounted) {
                    setBootstrapping(false);
                }
                return;
            }

            await crearUsuarioSiNoExiste(nextSession.user);
            const nextRol = await obtenerRol(nextSession.user.id);

            if (!isMounted) return;

            setRol(nextRol);
            setBootstrapping(false);
        }

        supabase.auth.getSession().then(({ data }) => {
            hydrateSession(data.session);
        });

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
