import { useState } from "react";
import { FilePlus2 } from "lucide-react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useToast } from "../hooks/useToast";
import { registrarAuditoria } from "../services/audit";

export default function NuevoTicket() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [form, setForm] = useState({
        titulo: "",
        descripcion: "",
        categoria: "Software",
        prioridad: "media",
    });

    async function guardar() {
        try {
            const [{ data: authData }, response] = await Promise.all([
                supabase.auth.getUser(),
                API.post("/tickets", form),
            ]);

            let ticketId =
                response.data?.id ||
                response.data?.ticket?.id ||
                response.data?.data?.id ||
                response.data?.[0]?.id;

            if (!ticketId && authData.user?.email) {
                const { data: ticketCreado } = await supabase
                    .from("tickets")
                    .select("id")
                    .eq("email", authData.user.email)
                    .eq("titulo", form.titulo)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                ticketId = ticketCreado?.id;
            }

            await registrarAuditoria({
                usuario: authData.user,
                accion: "crear",
                ticketId,
            });

            showToast({
                type: "success",
                title: "Ticket creado",
                message: "El nuevo ticket quedó registrado correctamente.",
            });

            navigate("/tickets");
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo crear el ticket",
                message: error.message || "Revisa los datos e intenta nuevamente.",
            });
        }
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <section className="glass-panel rounded-[2rem] p-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    <FilePlus2 className="h-3.5 w-3.5" />
                    Nuevo ticket
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                    Crear incidencia
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                    Registra el caso con un formulario más claro, espaciado y consistente con el workspace.
                </p>
            </section>

            <section className="glass-panel rounded-[2rem] p-6">
                <div className="space-y-4">
                    <input
                        placeholder="Título del ticket"
                        className="field-shell w-full"
                        onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    />

                    <textarea
                        placeholder="Describe con detalle el problema o requerimiento"
                        className="field-shell min-h-36 w-full resize-none"
                        onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                        <select
                            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                            className="field-shell w-full"
                            value={form.categoria}
                        >
                            <option value="Software">Software</option>
                            <option value="Hardware">Hardware</option>
                            <option value="Red">Red</option>
                        </select>

                        <select
                            onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                            className="field-shell w-full"
                            value={form.prioridad}
                        >
                            <option value="baja">Baja</option>
                            <option value="media">Media</option>
                            <option value="alta">Alta</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <button
                        onClick={guardar}
                        className="rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(56,189,248,0.28)] hover:-translate-y-0.5"
                    >
                        Crear ticket
                    </button>
                    <button
                        onClick={() => navigate("/tickets")}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/[0.08]"
                    >
                        Cancelar
                    </button>
                </div>
            </section>
        </div>
    );
}
