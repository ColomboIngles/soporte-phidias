import { useMemo, useState } from "react";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import API from "../../services/api";
import { supabase } from "../../services/supabase";
import Button from "../../components/ui/Button";
import AuthShell from "./AuthShell";
import { useAuth } from "../../auth/authContext";
import { getFriendlyAuthErrorMessage, normalizeEmail } from "../../auth/authUtils";
import { getHomeRouteByRole } from "../../utils/permissions";

export default function LoginPage() {
    const { session, profile, role, loading } = useAuth();
    const [searchParams] = useSearchParams();
    const initialEmail = useMemo(
        () => normalizeEmail(searchParams.get("email") || ""),
        [searchParams]
    );
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    if (!loading && session && profile?.requiere_cambio_contrasena) {
        return <Navigate to="/auth/set-password" replace />;
    }

    if (!loading && session) {
        return <Navigate to={getHomeRouteByRole(role)} replace />;
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const normalizedEmail = normalizeEmail(email);

            if (!normalizedEmail) {
                throw new Error("Debes ingresar tu correo institucional.");
            }

            if (!password) {
                throw new Error("Debes ingresar tu contrasena.");
            }

            const { error } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            });

            if (error) {
                throw error;
            }
        } catch (error) {
            setErrorMessage(getFriendlyAuthErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    async function handlePasswordRecovery() {
        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const normalizedEmail = normalizeEmail(email);

            if (!normalizedEmail) {
                throw new Error("Ingresa tu correo institucional para recuperar la contrasena.");
            }

            await API.post("/auth/request-password-link", {
                email: normalizedEmail,
                source: "login",
            });
            setSuccessMessage("Te enviamos un correo para crear una contrasena nueva.");
        } catch (error) {
            setErrorMessage(getFriendlyAuthErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell
            title="Ingresa con tu contrasena"
            description="Usa el correo autorizado por el colegio para acceder al dashboard."
        >
            <form className="space-y-5" onSubmit={handleSubmit}>
                {errorMessage ? (
                    <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
                        {errorMessage}
                    </div>
                ) : null}

                {successMessage ? (
                    <div className="app-surface-muted rounded-2xl border border-emerald-200/70 px-4 py-3 text-sm text-emerald-700">
                        {successMessage}
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
                            onChange={(event) => setEmail(event.target.value)}
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            placeholder="nombre@empresa.com"
                            className="min-w-0 flex-1 bg-transparent text-base text-[color:var(--app-text-primary)] outline-none placeholder:text-[color:var(--app-text-muted)]"
                            disabled={submitting}
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
                            autoComplete="current-password"
                            placeholder="Tu contrasena"
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
                    {submitting ? "Ingresando..." : "Ingresar"}
                </Button>

                <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-[color:var(--app-accent)]">
                    <Link to="/phidias/access">Crear contrasena</Link>
                    <button
                        type="button"
                        onClick={handlePasswordRecovery}
                        className="font-semibold text-[color:var(--app-accent)]"
                        disabled={submitting}
                    >
                        Recuperar contrasena
                    </button>
                </div>
            </form>
        </AuthShell>
    );
}
