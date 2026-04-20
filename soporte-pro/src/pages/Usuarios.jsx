import { useEffect, useState } from "react";
import { ShieldCheck, Users as UsersIcon } from "lucide-react";
import { supabase } from "../services/supabase";
import Skeleton from "../components/skeleton";
import EmptyState from "../components/EmptyState";

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargar();
    }, []);

    async function cargar() {
        setLoading(true);
        const { data } = await supabase
            .from("usuarios")
            .select("*")
            .order("created_at", { ascending: false });

        setUsuarios(data || []);
        setLoading(false);
    }

    async function cambiarRol(id, rol) {
        await supabase
            .from("usuarios")
            .update({ rol })
            .eq("id", id);

        cargar();
    }

    async function eliminar(id) {
        if (!confirm("¿Eliminar usuario?")) return;

        await supabase.from("usuarios").delete().eq("id", id);
        cargar();
    }

    if (loading) {
        return <Skeleton variant="table" />;
    }

    return (
        <div className="space-y-6">
            <section className="glass-panel rounded-[2rem] p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Administración
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                            Usuarios del sistema
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            Gestiona roles y accesos desde una vista limpia y operativa.
                        </p>
                    </div>

                    <div className="glass-card rounded-[1.5rem] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Total usuarios
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                            {usuarios.length}
                        </p>
                    </div>
                </div>
            </section>

            <section className="glass-panel rounded-[2rem] p-5">
                {usuarios.length === 0 ? (
                    <EmptyState
                        icon={UsersIcon}
                        title="Sin usuarios registrados"
                        description="Cuando existan usuarios en Supabase aparecerán aquí con sus roles y acciones disponibles."
                    />
                ) : (
                    <div className="overflow-hidden rounded-[1.5rem] border border-white/10">
                        <table className="w-full text-sm">
                            <thead className="bg-white/[0.06] text-slate-300">
                                <tr>
                                    <th className="p-4 text-left">Email</th>
                                    <th className="text-left">Nombre</th>
                                    <th className="text-left">Rol</th>
                                    <th className="text-left">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map((usuario) => (
                                    <tr
                                        key={usuario.id}
                                        className="border-t border-white/10 bg-slate-950/20 hover:bg-white/[0.04]"
                                    >
                                        <td className="p-4 text-slate-200">{usuario.email}</td>
                                        <td className="text-slate-300">{usuario.nombre}</td>
                                        <td>
                                            <select
                                                value={usuario.rol}
                                                onChange={(e) => cambiarRol(usuario.id, e.target.value)}
                                                className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm outline-none"
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="tecnico">Técnico</option>
                                                <option value="usuario">Usuario</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => eliminar(usuario.id)}
                                                className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-400/15"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
