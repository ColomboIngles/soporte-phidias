import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import API from "../../services/api";
import { supabase } from "../../services/supabase";
import Button from "../../components/ui/Button";
import AuthShell from "./AuthShell";
import { useAuth } from "../../auth/authContext";
import {
    getFriendlyAuthErrorMessage,
    getPasswordValidationError,
    normalizeEmail,
} from "../../auth/authUtils";
import { getHomeRouteByRole } from "../../utils/permissions";

export default function SetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {
        session,
        profile,
        role,
        loading,
        recoveryMode,
        refreshProfile,
        markRecoveryHandled,
    } = useAuth();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const email = useMemo(
        () =>
            normalizeEmail(
                session?.user?.email || searchParams.get("email") || profile?.email || ""
            ),
        [profile?.email, searchParams, session?.user?.email]
    );
    const isRequiredChange = Boolean(profile?.requiere_cambio_contrasena);
    const canEditPassword = Boolean(session?.user);

    if (!loading && session && !recoveryMode && !isRequiredChange && successMessage) {
        return <Navigate to={getHomeRouteByRole(role)} replace />;
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            if (!session?.user) {
                throw new Error(
                    "El enlace expiro o no tiene una sesion valida. Solicita uno nuevo desde Phidias."
                );
            }

            const validationError = getPasswordValidationError(
                password,
                confirmPassword,
                email
            );

            if (validationError) {
                throw new Error(validationError);
            }

            const { error } = await supabase.auth.updateUser({
                password,
            });

            if (error) {
                throw error;
            }

            await API.post("/auth/password-change-complete").catch(() => null);
            markRecoveryHandled();
            await refreshProfile();
            setSuccessMessage("Tu contrasena fue creada correctamente.");
            navigate(getHomeRouteByRole(role), { replace: true });
        } catch (error) {
            setErrorMessage(getFriendlyAuthErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell
            title="Crear tu contrasena"
            description="Define una contrasena personal para entrar al sistema de soporte."
        >
            {loading ? (
                <div className="app-surface-muted rounded-2xl px-4 py-4 text-center text-sm text-[color:var(--app-text-secondary)]">
                    Validando enlace seguro...
                </div>
            ) : null}

            {!loading && !canEditPassword ? (
                <div className="space-y-5">
                    <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
                        El enlace expiro o no tiene una sesion valida. Solicita uno nuevo
                        desde Phidias.
                    </div>
                    <Button
                        fullWidth
                        onClick={() => navigate("/phidias/access", { replace: true })}
                    >
                        Volver al acceso
                    </Button>
                </div>
            ) : null}

            {!loading && canEditPassword ? (
                <form className="space-y-5" onSubmit={handleSubmit}>
                    {successMessage ? (
                        <div className="app-surface-muted flex gap-3 rounded-2xl border border-emerald-200/70 px-4 py-3 text-sm text-emerald-700">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    ) : null}

                    {errorMessage ? (
                        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
                            {errorMessage}
                        </div>
                    ) : null}

                    <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--app-text-muted)]">
                            Email
                        </span>
                        <span className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] px-4 text-[color:var(--app-text-secondary)] shadow-sm">
                            <Mail className="h-4 w-4 shrink-0" />
                            <input
                                value={email}
                                readOnly
                                className="min-w-0 flex-1 bg-transparent text-base text-[color:var(--app-text-primary)] outline-none"
                            />
                        </span>
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--app-text-muted)]">
                            Contrasena
                        </span>
                        <span className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] px-4 text-[color:var(--app-text-secondary)] shadow-sm">
                            <KeyRound className="h-4 w-4 shrink-0" />
                            <input
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                type="password"
                                autoComplete="new-password"
                                placeholder="Minimo 8 caracteres"
                                className="min-w-0 flex-1 bg-transparent text-base text-[color:var(--app-text-primary)] outline-none placeholder:text-[color:var(--app-text-muted)]"
                                disabled={submitting}
                            />
                        </span>
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--app-text-muted)]">
                            Confirmar contrasena
                        </span>
                        <span className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] px-4 text-[color:var(--app-text-secondary)] shadow-sm">
                            <KeyRound className="h-4 w-4 shrink-0" />
                            <input
                                value={confirmPassword}
                                onChange={(event) =>
                                    setConfirmPassword(event.target.value)
                                }
                                type="password"
                                autoComplete="new-password"
                                placeholder="Repite tu contrasena"
                                className="min-w-0 flex-1 bg-transparent text-base text-[color:var(--app-text-primary)] outline-none placeholder:text-[color:var(--app-text-muted)]"
                                disabled={submitting}
                            />
                        </span>
                    </label>

                    <Button
                        type="submit"
                        fullWidth
                        size="lg"
                        iconRight={ArrowRight}
                        disabled={submitting}
                    >
                        {submitting ? "Guardando..." : "Guardar nueva contrasena"}
                    </Button>
                </form>
            ) : null}
        </AuthShell>
    );
}
