import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { supabase } from "./services/supabase";
import { crearUsuarioSiNoExiste, obtenerRol } from "./services/usuarios";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import TicketDetalle from "./pages/TicketDetalle";
import Kanban from "./pages/kanban";
import Usuarios from "./pages/Usuarios";
import Auditoria from "./pages/Auditoria";
import Login from "./pages/Login";
import NuevoTicket from "./pages/NuevoTicket";
import EditarTicket from "./pages/EditarTicket";
import { ToastProvider } from "./components/ToastProvider";
import {
    canAccessDashboard,
    canAccessKanban,
    canAccessTicketEdit,
    canAccessUserAdmin,
    canCreateTickets,
    getHomeRouteByRole,
} from "./utils/permissions";

function AppBootSplash() {
    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="glass-panel w-full max-w-xl rounded-[2rem] p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-400/10">
                    <ShieldCheck className="h-7 w-7 text-cyan-300" />
                </div>

                <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
                    Preparando tu workspace
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                    Estamos validando sesión, permisos y contexto inicial para evitar que el panel aparezca a medio cargar.
                </p>

                <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                    <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
                    Cargando entorno seguro...
                </div>
            </div>
        </div>
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

    const homeRoute = getHomeRouteByRole(rol);

    return (
        <ToastProvider>
            {bootstrapping ? (
                <AppBootSplash />
            ) : !session ? (
                <Login />
            ) : (
                <BrowserRouter>
                    <div className="flex min-h-screen bg-transparent text-white">
                        <Sidebar rol={rol} />

                        <div className="flex min-h-screen flex-1 flex-col">
                            <Topbar user={session.user} rol={rol} />

                            <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
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

                                    {canAccessUserAdmin(rol) && (
                                        <>
                                            <Route path="/usuarios" element={<Usuarios />} />
                                            <Route path="/auditoria" element={<Auditoria />} />
                                        </>
                                    )}

                                    <Route path="*" element={<Navigate to={homeRoute} replace />} />
                                </Routes>
                            </main>
                        </div>
                    </div>
                </BrowserRouter>
            )}
        </ToastProvider>
    );
}

export default App;
