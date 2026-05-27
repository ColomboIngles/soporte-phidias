import { useState } from "react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import Button from "../../components/ui/Button";
import AuthShell from "./AuthShell";
import { getFriendlyAuthErrorMessage, normalizeEmail } from "../../auth/authUtils";

export default function PhidiasAccess() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    async function handleContinue(event) {
        event.preventDefault();
        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const normalizedEmail = normalizeEmail(email);

            if (!normalizedEmail) {
                throw new Error("Debes ingresar tu correo institucional.");
            }

            const { data } = await API.post("/auth/lookup", {
                email: normalizedEmail,
            });

            if (data?.needsPasswordSetup) {
                await API.post("/auth/request-password-link", {
                    email: normalizedEmail,
                    source: "phidias",
                });
                setSuccessMessage("Te enviamos un correo para crear tu contrasena.");
                return;
            }

            navigate(`/login?email=${encodeURIComponent(normalizedEmail)}`, {
                replace: false,
            });
        } catch (error) {
            const status = error?.response?.status;
            setErrorMessage(
                status === 404 || status === 403
                    ? "Tu correo no esta autorizado para acceder."
                    : getFriendlyAuthErrorMessage(error)
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell
            title="Ingresa tu correo institucional"
            description="Validaremos tu acceso antes de continuar al sistema."
        >
            <form className="space-y-5" onSubmit={handleContinue}>
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
                        Correo institucional
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

                <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    iconRight={ArrowRight}
                    disabled={submitting}
                >
                    {submitting ? "Validando..." : "Continuar"}
                </Button>
            </form>
        </AuthShell>
    );
}
