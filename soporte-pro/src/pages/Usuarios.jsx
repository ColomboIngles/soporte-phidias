import { useCallback, useEffect, useRef, useState } from "react";
import {
    Download,
    FileSpreadsheet,
    ShieldCheck,
    Trash2,
    Upload,
    Users as UsersIcon,
} from "lucide-react";
import { supabase } from "../services/supabase";
import Skeleton from "../components/skeleton";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../hooks/useToast";
import { MotionPage, MotionSection } from "../components/AppMotion";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import {
    exportUsersTemplateWorkbook,
    exportUsersWorkbook,
    importUsersWorkbook,
} from "../services/userBulk";

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
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [bulkSummary, setBulkSummary] = useState(null);
    const { showToast } = useToast();
    const importInputRef = useRef(null);

    const cargarUsuarios = useCallback(async () => {
        const { data, error } = await supabase
            .from("usuarios")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        setUsuarios(data || []);
        return data || [];
    }, []);

    useEffect(() => {
        let activo = true;

        async function cargarInicial() {
            try {
                const { data, error } = await supabase
                    .from("usuarios")
                    .select("*")
                    .order("created_at", { ascending: false });

                if (error) {
                    throw error;
                }

                if (!activo) return;

                setUsuarios(data || []);
            } catch (error) {
                if (!activo) return;

                showToast({
                    type: "error",
                    title: "No se pudieron cargar los usuarios",
                    message:
                        error.message || "Intenta nuevamente en unos segundos.",
                });
            } finally {
                if (activo) {
                    setLoading(false);
                }
            }
        }

        cargarInicial();

        return () => {
            activo = false;
        };
    }, [showToast]);

    async function cambiarRol(id, rol) {
        try {
            setSavingRoleId(id);

            const { error } = await supabase
                .from("usuarios")
                .update({ rol })
                .eq("id", id);

            if (error) {
                throw error;
            }

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

            const { error } = await supabase
                .from("usuarios")
                .delete()
                .eq("id", usuarioToDelete.id);

            if (error) {
                throw error;
            }

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

    async function handleExportUsers() {
        try {
            setExporting(true);
            await exportUsersWorkbook(usuarios);
            showToast({
                type: "success",
                title: "Excel exportado",
                message: "Se descargo el listado actual de usuarios.",
            });
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo exportar el archivo",
                message: error.message || "Intenta nuevamente en unos segundos.",
            });
        } finally {
            setExporting(false);
        }
    }

    async function handleDownloadTemplate() {
        try {
            await exportUsersTemplateWorkbook();
            showToast({
                type: "success",
                title: "Plantilla lista",
                message: "Se descargo la plantilla de carga masiva.",
            });
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudo generar la plantilla",
                message: error.message || "Intenta nuevamente en unos segundos.",
            });
        }
    }

    function handleImportClick() {
        importInputRef.current?.click();
    }

    async function handleImportFile(event) {
        const [file] = event.target.files || [];
        event.target.value = "";

        if (!file) return;

        try {
            setImporting(true);
            const summary = await importUsersWorkbook(file, usuarios);
            setBulkSummary(summary);
            await cargarUsuarios();

            showToast({
                type: summary.errors.length
                    ? "error"
                    : summary.warnings.length
                      ? "info"
                      : "success",
                title: "Importacion procesada",
                message: `Actualizados: ${summary.updated}. Nuevos: ${summary.inserted}. Omitidos: ${summary.skipped}.`,
            });
        } catch (error) {
            setBulkSummary(null);
            showToast({
                type: "error",
                title: "No se pudo importar el Excel",
                message: error.message || "Revisa el archivo e intenta nuevamente.",
            });
        } finally {
            setImporting(false);
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
                                Gestiona roles y accesos desde una vista limpia,
                                mas ordenada y facil de auditar.
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

                    <div className="mt-5 flex flex-wrap gap-3">
                        <Button
                            variant="secondary"
                            iconLeft={Upload}
                            onClick={handleImportClick}
                            disabled={importing}
                        >
                            {importing ? "Importando..." : "Importar Excel"}
                        </Button>
                        <Button
                            variant="secondary"
                            iconLeft={Download}
                            onClick={handleExportUsers}
                            disabled={exporting || !usuarios.length}
                        >
                            {exporting ? "Exportando..." : "Exportar Excel"}
                        </Button>
                        <Button
                            variant="ghost"
                            iconLeft={FileSpreadsheet}
                            onClick={handleDownloadTemplate}
                        >
                            Plantilla
                        </Button>
                        <input
                            ref={importInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleImportFile}
                            aria-hidden="true"
                        />
                    </div>
                </MotionSection>

                <MotionSection delay={0.08} className="glass-panel rounded-[2rem] p-3">
                    <div className="space-y-3 px-2 pb-2">
                        <Alert
                            tone="info"
                            title="Carga masiva de usuarios"
                            actions={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDownloadTemplate}
                                >
                                    Ver plantilla
                                </Button>
                            }
                        >
                            Usa un archivo Excel con las columnas{" "}
                            <strong>Nombre</strong>, <strong>Cargo</strong>,{" "}
                            <strong>Email</strong> y{" "}
                            <strong>Rol Sistema</strong>. Ya no necesitas
                            enviar ID en la plantilla: el sistema asigna una
                            identidad provisional y la sincroniza con Supabase
                            cuando la persona entra por primera vez con el
                            acceso seguro por correo.
                        </Alert>

                        {bulkSummary ? (
                            <Alert
                                tone={
                                    bulkSummary.errors.length
                                        ? "warning"
                                        : bulkSummary.warnings.length
                                          ? "info"
                                          : "success"
                                }
                                title="Resultado de la importacion"
                            >
                                <p>
                                    Procesadas:{" "}
                                    <strong>{bulkSummary.processed}</strong> de{" "}
                                    <strong>{bulkSummary.totalRows}</strong>.
                                    Nuevas:{" "}
                                    <strong>{bulkSummary.inserted}</strong>.
                                    Actualizadas:{" "}
                                    <strong>{bulkSummary.updated}</strong>.
                                    Omitidas:{" "}
                                    <strong>{bulkSummary.skipped}</strong>.
                                </p>
                                {bulkSummary.errors.length ? (
                                    <p className="mt-2">
                                        Errores:{" "}
                                        {bulkSummary.errors
                                            .slice(0, 3)
                                            .join(" | ")}
                                    </p>
                                ) : null}
                                {!bulkSummary.errors.length &&
                                bulkSummary.warnings.length ? (
                                    <p className="mt-2">
                                        Avisos:{" "}
                                        {bulkSummary.warnings
                                            .slice(0, 2)
                                            .join(" | ")}
                                    </p>
                                ) : null}
                            </Alert>
                        ) : null}
                    </div>

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
                        <>
                            <div className="space-y-3 lg:hidden">
                                {usuarios.map((usuario) => (
                                    <div
                                        key={usuario.id}
                                        className="app-surface-muted rounded-[1.6rem] p-4"
                                    >
                                        <div className="min-w-0">
                                            <p
                                                title={usuario.email}
                                                className="truncate font-semibold text-[color:var(--app-text-primary)]"
                                            >
                                                {usuario.email}
                                            </p>
                                            <p className="app-break-anywhere mt-1 text-xs text-[color:var(--app-text-tertiary)]">
                                                {usuario.id}
                                            </p>
                                        </div>

                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                                                    Nombre
                                                </p>
                                                <p className="mt-1 text-sm text-[color:var(--app-text-secondary)]">
                                                    {usuario.nombre ||
                                                        "Sin nombre"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                                                    Rol actual
                                                </p>
                                                <div className="mt-2">
                                                    <span
                                                        className={roleChipClass(
                                                            usuario.rol
                                                        )}
                                                    >
                                                        {usuario.rol}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-3">
                                            <select
                                                value={usuario.rol}
                                                aria-label={`Cambiar rol de ${usuario.email}`}
                                                onChange={(event) =>
                                                    cambiarRol(
                                                        usuario.id,
                                                        event.target.value
                                                    )
                                                }
                                                disabled={
                                                    savingRoleId === usuario.id
                                                }
                                                className="app-input-shell w-full text-sm"
                                            >
                                                <option value="admin">
                                                    Admin
                                                </option>
                                                <option value="tecnico">
                                                    Tecnico
                                                </option>
                                                <option value="usuario">
                                                    Usuario
                                                </option>
                                            </select>

                                            <Button
                                                onClick={() =>
                                                    setUsuarioToDelete(usuario)
                                                }
                                                variant="danger"
                                                size="sm"
                                                className="w-full"
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="hidden lg:block">
                                <div className="data-table-wrap">
                                    <table className="data-table table-fixed min-w-[940px]">
                                        <thead>
                                            <tr>
                                                <th className="w-[34%]">
                                                    Email
                                                </th>
                                                <th className="w-[22%]">
                                                    Nombre
                                                </th>
                                                <th className="w-[12%]">
                                                    Rol actual
                                                </th>
                                                <th className="w-[22%]">
                                                    Gestion
                                                </th>
                                                <th className="w-[10%]">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usuarios.map((usuario) => (
                                                <tr key={usuario.id}>
                                                    <td>
                                                        <div
                                                            title={usuario.email}
                                                            className="truncate font-semibold text-[color:var(--app-text-primary)]"
                                                        >
                                                            {usuario.email}
                                                        </div>
                                                        <div
                                                            title={usuario.id}
                                                            className="mt-1 truncate text-xs text-[color:var(--app-text-tertiary)]"
                                                        >
                                                            {usuario.id}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div
                                                            title={
                                                                usuario.nombre ||
                                                                "Sin nombre"
                                                            }
                                                            className="truncate text-sm text-[color:var(--app-text-secondary)]"
                                                        >
                                                            {usuario.nombre ||
                                                                "Sin nombre"}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={roleChipClass(
                                                                usuario.rol
                                                            )}
                                                        >
                                                            {usuario.rol}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={usuario.rol}
                                                            aria-label={`Cambiar rol de ${usuario.email}`}
                                                            onChange={(event) =>
                                                                cambiarRol(
                                                                    usuario.id,
                                                                    event.target
                                                                        .value
                                                                )
                                                            }
                                                            disabled={
                                                                savingRoleId ===
                                                                usuario.id
                                                            }
                                                            className="app-input-shell w-full text-sm"
                                                        >
                                                            <option value="admin">
                                                                Admin
                                                            </option>
                                                            <option value="tecnico">
                                                                Tecnico
                                                            </option>
                                                            <option value="usuario">
                                                                Usuario
                                                            </option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <Button
                                                            onClick={() =>
                                                                setUsuarioToDelete(
                                                                    usuario
                                                                )
                                                            }
                                                            variant="danger"
                                                            size="sm"
                                                            className="w-10 px-0"
                                                            aria-label={`Eliminar ${usuario.email}`}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
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
