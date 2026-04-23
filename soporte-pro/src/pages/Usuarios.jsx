import { useEffect, useState } from "react";
import { ShieldCheck, Users as UsersIcon } from "lucide-react";
import { supabase } from "../services/supabase";
import Skeleton from "../components/skeleton";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../hooks/useToast";
import { MotionPage, MotionSection } from "../components/AppMotion";
import Button from "../components/ui/Button";

function roleChipClass(rol) {
    if (rol === "admin") return "status-chip status-chip-cerrado";
    if (rol === "tecnico") return "status-chip status-chip-en-proceso";
    return "status-chip status-chip-abierto";
}

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingRoleId, setSavingRoleId] = useState(null);
    const [usuarioToDelete, setUsuarioToDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const { showToast } = useToast();

    useEffect(() => {
        let activo = true;

        async function cargarInicial() {
            const { data } = await supabase
                .from("usuarios")
                .select("*")
                .order("created_at", { ascending: false });

            if (!activo) return;

            setUsuarios(data || []);
            setLoading(false);
        }

        cargarInicial();

        return () => {
            activo = false;
        };
    }, []);

    async function cambiarRol(id, rol) {
        try {
            setSavingRoleId(id);

            await supabase
                .from("usuarios")
                .update({ rol })
                .eq("id", id);

            setUsuarios((prev) =>
                prev.map((usuario) =>
                    usuario.id === id ? { ...usuario, rol } : usuario
                )
            );

            showToast({
                type: "success",
                title: "Rol actualizado",
                message: "Los permisos del usuario fueron ajustados.",
            });
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo actualizar el rol",
                message: error.message || "Intenta nuevamente en unos segundos.",
            });
        } finally {
            setSavingRoleId(null);
        }
    }

    async function confirmarEliminacion() {
        if (!usuarioToDelete) return;

        try {
            setDeletingId(usuarioToDelete.id);
            await supabase.from("usuarios").delete().eq("id", usuarioToDelete.id);
            setUsuarios((prev) =>
                prev.filter((usuario) => usuario.id !== usuarioToDelete.id)
            );
            showToast({
                type: "success",
                title: "Usuario eliminado",
                message: "La cuenta fue removida del sistema.",
            });
            setUsuarioToDelete(null);
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo eliminar el usuario",
                message: error.message || "Intenta nuevamente en unos segundos.",
            });
        } finally {
            setDeletingId(null);
        }
    }

    if (loading) {
        return <Skeleton variant="table" />;
    }

    return (
        <>
            <MotionPage className="space-y-6">
                <MotionSection className="app-surface-hero rounded-[2.2rem] p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="app-kicker">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Administracion
                            </div>
                            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--app-text-primary)] sm:text-4xl">
                                Usuarios del sistema
                            </h1>
                            <p className="mt-3 text-sm leading-7 text-[color:var(--app-text-secondary)]">
                                Gestiona roles y accesos desde una vista limpia, mas ordenada y facil de auditar.
                            </p>
                        </div>

                        <div className="app-surface-muted rounded-[1.5rem] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--app-text-tertiary)]">
                                Total usuarios
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-[color:var(--app-text-primary)]">
                                {usuarios.length}
                            </p>
                        </div>
                    </div>
                </MotionSection>

                <MotionSection delay={0.08} className="glass-panel rounded-[2rem] p-3">
                    {usuarios.length === 0 ? (
                        <div className="p-2">
                            <EmptyState
                                icon={UsersIcon}
                                eyebrow="Sin cuentas"
                                title="Sin usuarios registrados"
                                description="Cuando existan usuarios en Supabase apareceran aqui con sus roles y acciones disponibles."
                            />
                        </div>
                    ) : (
                        <div className="data-table-wrap overflow-x-auto">
                            <table className="data-table min-w-[820px]">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Nombre</th>
                                        <th>Rol actual</th>
                                        <th>Gestion</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuarios.map((usuario) => (
                                        <tr key={usuario.id}>
                                            <td>
                                                <div className="font-semibold text-[color:var(--app-text-primary)]">
                                                    {usuario.email}
                                                </div>
                                                <div className="mt-1 text-xs text-[color:var(--app-text-tertiary)]">
                                                    {usuario.id}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="text-sm text-[color:var(--app-text-secondary)]">
                                                    {usuario.nombre || "Sin nombre"}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={roleChipClass(usuario.rol)}>
                                                    {usuario.rol}
                                                </span>
                                            </td>
                                            <td>
                                                <select
                                                    value={usuario.rol}
                                                    onChange={(event) =>
                                                        cambiarRol(usuario.id, event.target.value)
                                                    }
                                                    disabled={savingRoleId === usuario.id}
                                                    className="app-input-shell min-w-[180px] text-sm"
                                                >
                                                    <option value="admin">Admin</option>
                                                    <option value="tecnico">Tecnico</option>
                                                    <option value="usuario">Usuario</option>
                                                </select>
                                            </td>
                                            <td>
                                                <Button
                                                    onClick={() => setUsuarioToDelete(usuario)}
                                                    variant="danger"
                                                    size="sm"
                                                >
                                                    Eliminar
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </MotionSection>
            </MotionPage>

            <ConfirmDialog
                open={Boolean(usuarioToDelete)}
                onClose={() => setUsuarioToDelete(null)}
                onConfirm={confirmarEliminacion}
                title="Eliminar usuario"
                description={
                    usuarioToDelete
                        ? `La cuenta ${usuarioToDelete.email} dejara de estar disponible en la aplicacion.`
                        : ""
                }
                confirmLabel="Eliminar usuario"
                busy={deletingId === usuarioToDelete?.id}
            />
        </>
    );
}
