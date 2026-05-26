import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Download,
    FileSpreadsheet,
    KeyRound,
    Mail,
    PencilLine,
    Plus,
    ShieldCheck,
    Trash2,
    Upload,
    Users as UsersIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import Skeleton from "../components/skeleton";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/ui/Modal";
import { useToast } from "../hooks/useToast";
import { MotionPage, MotionSection } from "../components/AppMotion";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import {
    exportUsersTemplateWorkbook,
    exportUsersWorkbook,
    importUsersWorkbook,
} from "../services/userBulk";
import {
    createManagedUser,
    deleteManagedUser,
    preparePasswordChangeForAllUsers,
    updateManagedUser,
} from "../services/adminUsers";
import { ROLE_OPTIONS, loadUsuariosList } from "../utils/usuariosList";

const EMPTY_FORM = {
    nombre: "",
    email: "",
    rol: "usuario",
};

function roleChipClass(rol) {
    if (rol === "admin") return "status-chip status-chip-cerrado";
    if (rol === "tecnico") return "status-chip status-chip-en-proceso";
    return "status-chip status-chip-abierto";
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingRoleId, setSavingRoleId] = useState(null);
    const [usuarioToDelete, setUsuarioToDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [preparingAccess, setPreparingAccess] = useState(false);
    const [bulkSummary, setBulkSummary] = useState(null);
    const [currentUserId, setCurrentUserId] = useState("");
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formValues, setFormValues] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [savingUser, setSavingUser] = useState(false);
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const importInputRef = useRef(null);
    const searchTerm = (searchParams.get("search") || "").trim().toLowerCase();
    const usuariosVisibles = useMemo(() => {
        if (!searchTerm) return usuarios;

        return usuarios.filter((usuario) => {
            const haystack = [
                usuario.email,
                usuario.nombre,
                usuario.rol,
                usuario.id,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(searchTerm);
        });
    }, [usuarios, searchTerm]);

    const cargarUsuarios = useCallback(async ({ updateState = true } = {}) => {
        return loadUsuariosList(supabase, { updateState, setUsuarios });
    }, []);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id || "");
        });
    }, []);

    useEffect(() => {
        let activo = true;

        async function cargarInicial() {
            try {
                const data = await cargarUsuarios({ updateState: false });

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
    }, [cargarUsuarios, showToast]);

    function resetUserForm() {
        setFormValues(EMPTY_FORM);
        setFormErrors({});
        setEditingUser(null);
        setUserModalOpen(false);
    }

    function openCreateModal() {
        setEditingUser(null);
        setFormValues(EMPTY_FORM);
        setFormErrors({});
        setUserModalOpen(true);
    }

    function openEditModal(usuario) {
        setEditingUser(usuario);
        setFormValues({
            nombre: usuario.nombre || "",
            email: usuario.email || "",
            rol: usuario.rol || "usuario",
        });
        setFormErrors({});
        setUserModalOpen(true);
    }

    function updateFormValue(field, value) {
        setFormValues((prev) => ({ ...prev, [field]: value }));
        setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }

    function validateUserForm() {
        const nextErrors = {};
        const nombre = String(formValues.nombre || "").trim();
        const email = normalizeEmail(formValues.email);
        const rol = String(formValues.rol || "").trim().toLowerCase();

        if (!nombre) {
            nextErrors.nombre = "Ingresa el nombre del usuario.";
        }

        if (!email) {
            nextErrors.email = "Ingresa un correo.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            nextErrors.email = "Ingresa un correo valido.";
        }

        if (!["admin", "tecnico", "usuario"].includes(rol)) {
            nextErrors.rol = "Selecciona un rol valido.";
        }

        const duplicateEmail = usuarios.find((usuario) => {
            if (editingUser && usuario.id === editingUser.id) {
                return false;
            }

            return normalizeEmail(usuario.email) === email;
        });

        if (duplicateEmail) {
            nextErrors.email = "Ya existe un usuario con ese correo.";
        }

        setFormErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }

    async function guardarUsuario() {
        if (!validateUserForm()) {
            return;
        }

        const payload = {
            nombre: String(formValues.nombre || "").trim(),
            email: normalizeEmail(formValues.email),
            rol: String(formValues.rol || "usuario").trim().toLowerCase(),
        };

        try {
            setSavingUser(true);

            if (editingUser) {
                const emailChanged =
                    normalizeEmail(editingUser.email) !== payload.email;
                const data = await updateManagedUser(editingUser.id, {
                    ...payload,
                    requiere_cambio_contrasena: emailChanged
                        ? true
                        : Boolean(editingUser.requiere_cambio_contrasena),
                });

                setUsuarios((prev) =>
                    prev.map((usuario) =>
                        usuario.id === editingUser.id
                            ? { ...usuario, ...data }
                            : usuario
                    )
                );

                showToast({
                    type: "success",
                    title: "Usuario actualizado",
                    message: "Los datos del usuario se guardaron correctamente.",
                });
            } else {
                const data = await createManagedUser(payload);

                setUsuarios((prev) => [data, ...prev]);
                showToast({
                    type: "success",
                    title: "Usuario creado",
                    message:
                        "La cuenta quedo lista en Supabase Auth y debera cambiar contrasena al ingresar.",
                });
            }

            resetUserForm();
        } catch (error) {
            showToast({
                type: "error",
                title: editingUser
                    ? "No se pudo actualizar el usuario"
                    : "No se pudo crear el usuario",
                message: error.message || "Intenta nuevamente en unos segundos.",
            });
        } finally {
            setSavingUser(false);
        }
    }

    async function cambiarRol(id, rol) {
        try {
            setSavingRoleId(id);
            const usuarioActual = usuarios.find((usuario) => usuario.id === id);

            await updateManagedUser(id, {
                nombre: usuarioActual?.nombre || usuarioActual?.email,
                email: usuarioActual?.email,
                rol,
                requiere_cambio_contrasena: Boolean(
                    usuarioActual?.requiere_cambio_contrasena
                ),
            });

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

            if (usuarioToDelete.id === currentUserId) {
                throw new Error(
                    "No puedes eliminar tu propia cuenta mientras estas usando el sistema."
                );
            }

            await deleteManagedUser(usuarioToDelete.id);

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

    async function handlePreparePasswordChange() {
        try {
            setPreparingAccess(true);
            const result = await preparePasswordChangeForAllUsers();
            await cargarUsuarios();
            showToast({
                type: "success",
                title: "Accesos preparados",
                message: `Usuarios sincronizados: ${result.processed || 0}. Se exigira cambio de contrasena al ingresar.`,
            });
        } catch (error) {
            showToast({
                type: "error",
                title: "No se pudieron preparar los accesos",
                message: error.message || "Intenta nuevamente en unos segundos.",
            });
        } finally {
            setPreparingAccess(false);
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
                                {usuariosVisibles.length}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <Button iconLeft={Plus} onClick={openCreateModal}>
                            Nuevo usuario
                        </Button>
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
                        <Button
                            variant="secondary"
                            iconLeft={KeyRound}
                            onClick={handlePreparePasswordChange}
                            disabled={preparingAccess || !usuarios.length}
                        >
                            {preparingAccess ? "Preparando..." : "Preparar accesos"}
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
                            enviar ID en la plantilla: el sistema crea o
                            sincroniza la identidad en Supabase Auth y exige
                            cambio de contrasena al primer acceso.
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

                    {usuariosVisibles.length === 0 ? (
                        <div className="p-2">
                            <EmptyState
                                icon={UsersIcon}
                                eyebrow={searchTerm ? "Sin coincidencias" : "Sin cuentas"}
                                title={
                                    searchTerm
                                        ? "No encontramos usuarios para esta busqueda"
                                        : "Sin usuarios registrados"
                                }
                                description={
                                    searchTerm
                                        ? `No hay usuarios que coincidan con "${searchParams.get("search")}".`
                                        : "Cuando existan usuarios en Supabase apareceran aqui con sus roles y acciones disponibles."
                                }
                            />
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 lg:hidden">
                                {usuariosVisibles.map((usuario) => (
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
                                            <Button
                                                onClick={() => openEditModal(usuario)}
                                                variant="secondary"
                                                size="sm"
                                                className="w-full"
                                                iconLeft={PencilLine}
                                            >
                                                Editar
                                            </Button>

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
                                                {ROLE_OPTIONS.map((option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>

                                            <Button
                                                onClick={() =>
                                                    setUsuarioToDelete(usuario)
                                                }
                                                variant="danger"
                                                size="sm"
                                                className="w-full"
                                                disabled={
                                                    deletingId === usuario.id ||
                                                    usuario.id === currentUserId
                                                }
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
                                            {usuariosVisibles.map((usuario) => (
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
                                                            {ROLE_OPTIONS.map(
                                                                (option) => (
                                                                    <option
                                                                        key={
                                                                            option.value
                                                                        }
                                                                        value={
                                                                            option.value
                                                                        }
                                                                    >
                                                                        {
                                                                            option.label
                                                                        }
                                                                    </option>
                                                                )
                                                            )}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                onClick={() =>
                                                                    openEditModal(
                                                                        usuario
                                                                    )
                                                                }
                                                                variant="secondary"
                                                                size="sm"
                                                                className="w-10 px-0"
                                                                aria-label={`Editar ${usuario.email}`}
                                                            >
                                                                <PencilLine className="h-4 w-4" />
                                                            </Button>
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
                                                                disabled={
                                                                    deletingId ===
                                                                        usuario.id ||
                                                                    usuario.id ===
                                                                        currentUserId
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
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

            <Modal
                open={userModalOpen}
                onClose={resetUserForm}
                title={editingUser ? "Editar usuario" : "Crear usuario"}
                description={
                    editingUser
                        ? "Actualiza nombre, correo y rol sin afectar la experiencia del resto del equipo."
                        : "Crea una cuenta operativa en Supabase Auth y exige cambio de contrasena al primer acceso."
                }
                icon={UsersIcon}
                actions={
                    <>
                        <Button
                            variant="ghost"
                            onClick={resetUserForm}
                            disabled={savingUser}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={guardarUsuario} disabled={savingUser}>
                            {savingUser
                                ? editingUser
                                    ? "Guardando..."
                                    : "Creando..."
                                : editingUser
                                  ? "Guardar cambios"
                                  : "Crear usuario"}
                        </Button>
                    </>
                }
            >
                <div className="grid gap-4 md:grid-cols-2">
                    <Input
                        label="Nombre"
                        value={formValues.nombre}
                        onChange={(event) =>
                            updateFormValue("nombre", event.target.value)
                        }
                        error={formErrors.nombre}
                        placeholder="Nombre completo"
                    />
                    <Select
                        label="Rol"
                        value={formValues.rol}
                        onChange={(event) =>
                            updateFormValue("rol", event.target.value)
                        }
                        error={formErrors.rol}
                    >
                        {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                    <Input
                        label="Email"
                        value={formValues.email}
                        onChange={(event) =>
                            updateFormValue("email", event.target.value)
                        }
                        error={formErrors.email}
                        placeholder="persona@empresa.com"
                        type="email"
                        icon={Mail}
                        containerClassName="md:col-span-2"
                    />
                </div>
            </Modal>
        </>
    );
}
