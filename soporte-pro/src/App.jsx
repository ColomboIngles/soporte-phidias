import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Suspense, lazy, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AuthProvider } from "./auth/AuthProvider";
import { useAuth } from "./auth/authContext";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ThemeToggle from "./components/ThemeToggle";
import BrandMark from "./components/BrandMark";
import Skeleton from "./components/skeleton";
import { ToastProvider } from "./components/ToastProvider";
import { MotionPage, MotionSection } from "./components/AppMotion";
import PhidiasAccess from "./pages/auth/PhidiasAccess";
import LoginPage from "./pages/auth/LoginPage";
import SetPassword from "./pages/auth/SetPassword";
import {
    canAccessDashboard,
    canAccessKanban,
    canAccessTicketEdit,
    canAccessUserAdmin,
    canCreateTickets,
    getHomeRouteByRole,
} from "./utils/permissions";

const routerBasename =
    import.meta.env.BASE_URL && import.meta.env.BASE_URL !== "/"
        ? import.meta.env.BASE_URL.replace(/\/$/, "")
        : undefined;

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
                className="app-surface w-full max-w-xl rounded-[2rem] p-8 text-center shadow-sm sm:p-10"
            >
                <BrandMark
                    align="center"
                    className="justify-center"
                    markClassName="mx-auto h-20 w-20 rounded-[1.75rem] p-3"
                />

                <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[color:var(--app-text-primary)] sm:text-4xl">
                    Cargando sistema
                </h1>

                <div className="app-surface-muted mt-8 inline-flex items-center gap-3 rounded-full px-4 py-3 text-sm text-[color:var(--app-text-secondary)]">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[color:var(--app-accent)]" />
                    Preparando acceso seguro...
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

function AppLayout() {
    const { session, role } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const homeRoute = getHomeRouteByRole(role);

    return (
        <div className="app-shell flex min-h-screen bg-[color:var(--app-bg)]">
            <Sidebar
                rol={role}
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
                    rol={role}
                    phidiasMode
                    onOpenSidebar={() => setSidebarOpen(true)}
                />

                <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 xl:px-8">
                    <div className="mx-auto flex w-full max-w-[1680px] flex-col">
                        <Suspense fallback={<RouteFallback />}>
                            <Routes>
                                <Route
                                    path="/"
                                    element={
                                        canAccessDashboard(role) ? (
                                            <Dashboard />
                                        ) : (
                                            <Navigate to="/tickets" replace />
                                        )
                                    }
                                />
                                <Route
                                    path="/dashboard"
                                    element={
                                        canAccessDashboard(role) ? (
                                            <Dashboard />
                                        ) : (
                                            <Navigate to="/tickets" replace />
                                        )
                                    }
                                />
                                <Route path="/tickets" element={<Tickets role={role} />} />
                                <Route
                                    path="/tickets/nuevo"
                                    element={
                                        canCreateTickets(role) ? (
                                            <NuevoTicket rol={role} />
                                        ) : (
                                            <Navigate to={homeRoute} replace />
                                        )
                                    }
                                />
                                <Route
                                    path="/tickets/:id"
                                    element={<TicketDetalle rol={role} />}
                                />
                                <Route
                                    path="/tickets/:id/editar"
                                    element={
                                        canAccessTicketEdit(role) ? (
                                            <EditarTicket />
                                        ) : (
                                            <Navigate to="/tickets" replace />
                                        )
                                    }
                                />
                                <Route
                                    path="/kanban"
                                    element={
                                        canAccessKanban(role) ? (
                                            <Kanban rol={role} />
                                        ) : (
                                            <Navigate to="/tickets" replace />
                                        )
                                    }
                                />

                                {canAccessUserAdmin(role) ? (
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
    );
}

function PrivateApp() {
    const { session, profile, loading } = useAuth();

    if (loading) {
        return <AppBootSplash />;
    }

    if (!session) {
        return <Navigate to="/phidias/access" replace />;
    }

    if (profile?.requiere_cambio_contrasena) {
        return <Navigate to="/auth/set-password" replace />;
    }

    return <AppLayout />;
}

function AuthRoutes() {
    const { loading, session, profile, role } = useAuth();
    const homeRoute = getHomeRouteByRole(role);

    return (
        <Routes>
            <Route
                path="/phidias/access"
                element={
                    !loading && session && !profile?.requiere_cambio_contrasena ? (
                        <Navigate to={homeRoute} replace />
                    ) : (
                        <PhidiasAccess />
                    )
                }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/set-password" element={<SetPassword />} />
            <Route path="/*" element={<PrivateApp />} />
        </Routes>
    );
}

function App() {
    return (
        <ToastProvider>
            <BrowserRouter basename={routerBasename}>
                <AuthProvider>
                    <AuthRoutes />
                </AuthProvider>
            </BrowserRouter>
        </ToastProvider>
    );
}

export default App;
