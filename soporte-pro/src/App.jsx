import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./services/supabase";
import { crearUsuarioSiNoExiste, obtenerRol } from "./services/usuarios";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import TicketDetalle from "./pages/TicketDetalle";
import Kanban from "./pages/kanban";
import Usuarios from "./pages/Usuarios";
import Login from "./pages/Login";
import NuevoTicket from "./pages/NuevoTicket";
import EditarTicket from "./pages/EditarTicket";

function App() {
    const [session, setSession] = useState(null);
    const [rol, setRol] = useState(null);

    useEffect(() => {
        let isMounted = true;

        supabase.auth.getSession().then(async ({ data }) => {
            if (!isMounted) return;
            setSession(data.session);

            if (data.session?.user) {
                await crearUsuarioSiNoExiste(data.session.user);
                const r = await obtenerRol(data.session.user.id);
                if (isMounted) {
                    setRol(r);
                }
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_, session) => {
            if (!isMounted) return;
            setSession(session);

            if (session?.user) {
                await crearUsuarioSiNoExiste(session.user);
                const r = await obtenerRol(session.user.id);
                if (isMounted) {
                    setRol(r);
                }
            } else {
                setRol(null);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    if (!session) return <Login />;

    return (
        <BrowserRouter>
            <div className="flex h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">

                {/* SIDEBAR */}
                <Sidebar rol={rol} />

                {/* CONTENIDO */}
                <div className="flex-1 flex flex-col">

                    {/* TOPBAR */}
                    <Topbar user={session.user} />

                    {/* MAIN */}
                    <div className="flex-1 overflow-y-auto p-6">

                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/tickets" element={<Tickets role={rol} />} />
                            <Route path="/tickets/nuevo" element={<NuevoTicket />} />
                            <Route path="/tickets/:id" element={<TicketDetalle />} />
                            <Route path="/tickets/:id/editar" element={<EditarTicket />} />
                            <Route path="/kanban" element={<Kanban />} />

                            {rol === "admin" && (
                                <Route path="/usuarios" element={<Usuarios />} />
                            )}

                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>

                    </div>
                </div>
            </div>
        </BrowserRouter>
    );
}

export default App;
