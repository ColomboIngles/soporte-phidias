import { useEffect, useState } from "react";
import { PencilLine } from "lucide-react";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useToast } from "../hooks/useToast";
import { registrarAuditoria } from "../services/audit";
import Skeleton from "../components/skeleton";

export default function EditarTicket() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        API.get(`/tickets/${id}`)
            .then((res) => setForm(res.data))
            .finally(() => setLoading(false));
    }, [id]);

    async function guardar() {
        try {
            const [{ data: authData }] = await Promise.all([
                supabase.auth.getUser(),
                API.put(`/tickets/${id}`, form),
            ]);

            await registrarAuditoria({
                usuario: authData.user,
                accion: "editar",
                ticketId: id,
            });

            showToast({
                type: "success",
                title: "Ticket actualizado",
                message: "Los cambios del ticket fueron guardados.",
            });

            navigate("/tickets");
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo actualizar el ticket",
                message: error.message || "Intenta nuevamente en unos segundos.",
            });
        }
    }

    if (loading) {
        return <Skeleton variant="form" />;
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <section className="glass-panel rounded-[2rem] p-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    <PencilLine className="h-3.5 w-3.5" />
                    Edición
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                    Editar ticket
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                    Ajusta estado, título y detalle dentro de un formulario más limpio y enfocado.
                </p>
            </section>

            <section className="glass-panel rounded-[2rem] p-6">
                <div className="space-y-4">
                    <input
                        value={form.titulo || ""}
                        className="field-shell w-full"
                        onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    />

                    <textarea
                        value={form.descripcion || ""}
                        className="field-shell min-h-36 w-full resize-none"
                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    />

                    <select
                        value={form.estado || "abierto"}
                        onChange={(e) => setForm({ ...form, estado: e.target.value })}
                        className="field-shell w-full"
                    >
                        <option value="abierto">Abierto</option>
                        <option value="en_proceso">En proceso</option>
                        <option value="cerrado">Cerrado</option>
                    </select>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <button
                        onClick={guardar}
                        className="rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(56,189,248,0.28)] hover:-translate-y-0.5"
                    >
                        Guardar cambios
                    </button>
                    <button
                        onClick={() => navigate("/tickets")}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/[0.08]"
                    >
                        Volver
                    </button>
                </div>
            </section>
        </div>
    );
}
