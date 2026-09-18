import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, KeyRound, Mail, Smartphone } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../../services/api";
import Button from "../../components/ui/Button";
import AuthShell from "./AuthShell";
import {
    getFriendlyAuthErrorMessage,
    getPasswordValidationError,
    normalizeEmail,
} from "../../auth/authUtils";

const EXPIRED_TOKEN_MESSAGE =
    "El enlace de activacion ya expiro o fue utilizado anteriormente. Solicita un codigo nuevo para continuar.";

function PasswordInputs({ password, confirmPassword, onPasswordChange, onConfirmChange, disabled }) {
    return (
        <>
            <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--app-text-muted)]">Nueva contrasena</span>
                <span className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] px-4 text-[color:var(--app-text-secondary)] shadow-sm">
                    <KeyRound className="h-4 w-4 shrink-0" />
                    <input value={password} onChange={(event) => onPasswordChange(event.target.value)} type="password" autoComplete="new-password" placeholder="Minimo 8 caracteres" className="min-w-0 flex-1 bg-transparent text-base text-[color:var(--app-text-primary)] outline-none placeholder:text-[color:var(--app-text-muted)]" disabled={disabled} />
                </span>
            </label>
            <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--app-text-muted)]">Confirmar contrasena</span>
                <span className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] px-4 text-[color:var(--app-text-secondary)] shadow-sm">
                    <KeyRound className="h-4 w-4 shrink-0" />
                    <input value={confirmPassword} onChange={(event) => onConfirmChange(event.target.value)} type="password" autoComplete="new-password" placeholder="Repite tu contrasena" className="min-w-0 flex-1 bg-transparent text-base text-[color:var(--app-text-primary)] outline-none placeholder:text-[color:var(--app-text-muted)]" disabled={disabled} />
                </span>
            </label>
        </>
    );
}

function LegacyTokenSetPassword({ token }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let active = true;
        async function validateToken() {
            try {
                const { data } = await API.get("/auth/password-token", { params: { token } });
                if (!active) return;
                setEmail(normalizeEmail(data?.email || ""));
                setTokenValid(true);
            } catch (error) {
                if (active) setErrorMessage(getFriendlyAuthErrorMessage(error));
            } finally {
                if (active) setValidating(false);
            }
        }
        validateToken();
        return () => { active = false; };
    }, [token]);

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setErrorMessage("");
        try {
            const validationError = getPasswordValidationError(password, confirmPassword, email);
            if (validationError) throw new Error(validationError);
            const { data } = await API.post("/auth/password-token/complete", { token, password });
            navigate(`/login?email=${encodeURIComponent(data?.email || email)}`, { replace: true });
        } catch (error) {
            setErrorMessage(getFriendlyAuthErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell title="Crear tu contrasena" description="Define una contrasena personal para entrar al sistema de soporte.">
            {validating ? <div className="app-surface-muted rounded-2xl px-4 py-4 text-center text-sm text-[color:var(--app-text-secondary)]">Validando enlace seguro...</div> : null}
            {!validating && !tokenValid ? (
                <div className="space-y-5">
                    <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">{errorMessage || EXPIRED_TOKEN_MESSAGE}</div>
                    <Button fullWidth onClick={() => navigate("/phidias/access", { replace: true })}>Solicitar un codigo nuevo</Button>
                </div>
            ) : null}
            {!validating && tokenValid ? (
                <form className="space-y-5" onSubmit={handleSubmit}>
                    {errorMessage ? <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}
                    <PasswordInputs password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmChange={setConfirmPassword} disabled={submitting} />
                    <Button type="submit" fullWidth size="lg" iconRight={ArrowRight} disabled={submitting}>{submitting ? "Guardando..." : "Guardar nueva contrasena"}</Button>
                </form>
            ) : null}
        </AuthShell>
    );
}

function RecoveryCodeSetPassword({ initialEmail, activationMode }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState(initialEmail);
    const [channel, setChannel] = useState("email");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [codeRequested, setCodeRequested] = useState(false);
    const [deliveryMessage, setDeliveryMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const normalizedEmail = normalizeEmail(email);
    const actionLabel = activationMode ? "Crear contrasena" : "Recuperar contrasena";

    async function requestCode(nextChannel = channel) {
        setSubmitting(true);
        setErrorMessage("");
        try {
            if (!normalizedEmail) throw new Error("Debes ingresar tu correo institucional.");
            const { data } = await API.post("/auth/password-recovery/request", { email: normalizedEmail, channel: nextChannel });
            setChannel(data?.channel || nextChannel);
            setCodeRequested(true);
            setDeliveryMessage(`Enviamos un codigo temporal a ${data?.destination || "tu contacto registrado"}.`);
        } catch (error) {
            setErrorMessage(getFriendlyAuthErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setErrorMessage("");
        try {
            if (!codeRequested) throw new Error("Solicita primero un codigo temporal.");
            const validationError = getPasswordValidationError(password, confirmPassword, normalizedEmail);
            if (validationError) throw new Error(validationError);
            const { data } = await API.post("/auth/password-recovery/complete", { email: normalizedEmail, code, password });
            navigate(`/login?email=${encodeURIComponent(data?.email || normalizedEmail)}`, { replace: true });
        } catch (error) {
            setErrorMessage(getFriendlyAuthErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell title={activationMode ? "Crea tu contrasena" : "Recupera tu contrasena"} description="Verificaremos tu identidad con un codigo temporal antes de guardar la nueva contrasena.">
            <form className="space-y-5" onSubmit={handleSubmit}>
                {errorMessage ? <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}
                {deliveryMessage ? <div className="app-surface-muted flex gap-3 rounded-2xl border border-emerald-200/70 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{deliveryMessage}</span></div> : null}
                <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--app-text-muted)]">Correo institucional</span>
                    <span className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] px-4 text-[color:var(--app-text-secondary)] shadow-sm"><Mail className="h-4 w-4 shrink-0" /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" inputMode="email" placeholder="nombre@empresa.com" className="min-w-0 flex-1 bg-transparent text-base text-[color:var(--app-text-primary)] outline-none placeholder:text-[color:var(--app-text-muted)]" disabled={submitting || Boolean(initialEmail)} /></span>
                </label>
                {!codeRequested ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Button type="button" variant="secondary" iconLeft={Mail} onClick={() => requestCode("email")} disabled={submitting}>Enviar al correo</Button>
                        <Button type="button" variant="secondary" iconLeft={Smartphone} onClick={() => requestCode("phone")} disabled={submitting}>Enviar al telefono</Button>
                    </div>
                ) : (
                    <>
                        <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--app-text-muted)]">Codigo temporal</span>
                            <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="app-input-shell mt-2 w-full text-center text-lg tracking-[0.35em]" disabled={submitting} />
                        </label>
                        <PasswordInputs password={password} confirmPassword={confirmPassword} onPasswordChange={setPassword} onConfirmChange={setConfirmPassword} disabled={submitting} />
                        <Button type="submit" fullWidth size="lg" iconRight={ArrowRight} disabled={submitting}>{submitting ? "Guardando..." : actionLabel}</Button>
                        <button type="button" onClick={() => requestCode(channel)} className="mx-auto block text-sm font-semibold text-[color:var(--app-accent)]" disabled={submitting}>Reenviar codigo</button>
                    </>
                )}
            </form>
        </AuthShell>
    );
}

export default function SetPassword() {
    const [searchParams] = useSearchParams();
    const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
    const initialEmail = useMemo(() => normalizeEmail(searchParams.get("email") || ""), [searchParams]);
    if (token) return <LegacyTokenSetPassword token={token} />;
    return <RecoveryCodeSetPassword initialEmail={initialEmail} activationMode={searchParams.get("mode") === "activation"} />;
}
