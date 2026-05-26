import { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    KeyRound,
    LockKeyhole,
    Mail,
    RotateCcwKey,
} from "lucide-react";
import { supabase } from "../services/supabase";
import API from "../services/api";
import ThemeToggle from "../components/ThemeToggle";
import Button from "../components/ui/Button";
import Surface from "../components/ui/Surface";
import BrandMark from "../components/BrandMark";
import {
    MotionPage,
    MotionSection,
} from "../components/AppMotion";
import {
    clearAuthAccessError,
    clearMagicLinkCooldown,
    clearPendingAuthFlow,
    getTrustedEmail,
    normalizeEmail,
    persistTrustedEmail,
    persistPendingAuthFlow,
    readAuthAccessError,
    readAccessContext,
    readMagicLinkCooldown,
    storeMagicLinkCooldown,
} from "../services/phidiasSession";

const MAGIC_LINK_COOLDOWN_SECONDS = 90;
const LOGIN_VIEW = {
    SIGN_IN: "sign-in",
    REQUEST_SETUP: "request-password-setup",
    REQUEST_RECOVERY: "request-recovery",
    COMPLETE_SETUP: "complete-password-setup",
    COMPLETE_RECOVERY: "complete-recovery",
    CHANGE_REQUIRED: "change-required",
};

function getFriendlyAuthErrorMessage(error) {
    const rawMessage =
        typeof error?.message === "string" ? error.message.trim() : "";
    const normalized = rawMessage.toLowerCase();

    if (normalized.includes("email rate limit exceeded")) {
        return "Ya se enviaron demasiados enlaces en poco tiempo. Espera unos minutos y vuelve a intentarlo.";
    }

    if (normalized.includes("invalid email")) {
        return "Debes ingresar un correo valido para continuar.";
    }

    if (
        normalized.includes("invalid login credentials") ||
        normalized.includes("invalid_credentials")
    ) {
        return "Correo o contrasena incorrectos. Verifica tus datos e intenta nuevamente.";
    }

    if (normalized.includes("email not confirmed")) {
        return "Debes validar tu correo primero para ingresar con contrasena.";
    }

    if (normalized.includes("failed to fetch")) {
        return "No se pudo conectar con el servicio de acceso. Revisa tu conexion e intenta nuevamente.";
    }

    return rawMessage || "No se pudo enviar el acceso seguro.";
}

function getAppBasePath() {
    const baseUrl = import.meta.env.BASE_URL || "/";
    return baseUrl === "/" ? "" : baseUrl.replace(/\/$/, "");
}

function getAuthRedirectBase({ appBasePath }) {
    const configuredAppUrl = (import.meta.env.VITE_APP_URL || "").trim();

    if (configuredAppUrl) {
        return configuredAppUrl.replace(/\/$/, "");
    }

    if (typeof window === "undefined") {
        return "";
    }

    return `${window.location.origin}${appBasePath || ""}`;
}

function buildEmailRedirectUrl({
    appBasePath,
    email,
    source,
    returnTo,
    flow = "",
}) {
    const base = getAuthRedirectBase({ appBasePath });

    if (!base) {
        return undefined;
    }

    const params = new URLSearchParams();

    if (email) {
        params.set("email", email);
    }

    if (source) {
        params.set("source", source);
    }

    if (returnTo) {
        params.set("returnTo", returnTo);
    }

    if (flow) {
        params.set("flow", flow);
    }

    const target = `${base}/`;
    return params.toString() ? `${target}?${params.toString()}` : target;
}

function getForcedView(flow) {
    if (flow === "create-password") {
        return LOGIN_VIEW.COMPLETE_SETUP;
    }

    if (flow === "recovery") {
        return LOGIN_VIEW.COMPLETE_RECOVERY;
    }

    if (flow === "change-required") {
        return LOGIN_VIEW.CHANGE_REQUIRED;
    }

    return "";
}

function getNextCooldownUntil(nowTimestamp) {
    return nowTimestamp + MAGIC_LINK_COOLDOWN_SECONDS * 1000;
}

function getPasswordValidationError(password, confirmPassword) {
    if (!password || password.length < 8) {
        return "La contrasena debe tener al menos 8 caracteres.";
    }

    if (password !== confirmPassword) {
        return "Las contrasenas no coinciden.";
    }

    return "";
}

function getPasswordEqualsEmailError(password, email) {
    if (normalizeEmail(password) === normalizeEmail(email)) {
        return "Por seguridad, la nueva contrasena no puede ser igual al correo.";
    }

    return "";
}

export default function Login({
    forcedFlow = "",
    session = null,
    onAuthFlowComplete,
}) {
    const loginContext = useMemo(() => readAccessContext(), []);
    const appBasePath = useMemo(() => getAppBasePath(), []);
    const trustedEmail = useMemo(() => getTrustedEmail(), []);
    const forcedView = getForcedView(forcedFlow);
    const initialView =
        loginContext.source === "phidias"
            ? LOGIN_VIEW.REQUEST_SETUP
            : LOGIN_VIEW.SIGN_IN;
    const [email, setEmail] = useState(loginContext.email || trustedEmail);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [view, setView] = useState(initialView);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(() => readAuthAccessError());
    const [successMessage, setSuccessMessage] = useState("");
    const autoSetupRequestSentRef = useRef(false);
    const [cooldownUntil, setCooldownUntil] = useState(() =>
        readMagicLinkCooldown()
    );
    const [cooldownNow, setCooldownNow] = useState(() => Date.now());
    const fromPhidias = loginContext.source === "phidias";
    const effectiveCooldownUntil =
        cooldownUntil > cooldownNow ? cooldownUntil : 0;
    const cooldownRemaining = Math.max(
        Math.ceil((effectiveCooldownUntil - cooldownNow) / 1000),
        0
    );
    const isCooldownActive = cooldownRemaining > 0;
    const activeView = forcedView || view;

    useEffect(() => {
        if (!effectiveCooldownUntil) {
            clearMagicLinkCooldown();
            return undefined;
        }

        const timer = window.setInterval(() => {
            setCooldownNow(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [effectiveCooldownUntil]);

    useEffect(() => {
        if (
            autoSetupRequestSentRef.current ||
            forcedView ||
            loginContext.source !== "phidias" ||
            !loginContext.email ||
            activeView !== LOGIN_VIEW.REQUEST_SETUP ||
            isCooldownActive ||
            submitting
        ) {
            return;
        }

        autoSetupRequestSentRef.current = true;
        requestPasswordSetup();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        activeView,
        forcedView,
        isCooldownActive,
        loginContext.email,
        loginContext.source,
        submitting,
    ]);

    function resetFormState() {
        setErrorMessage("");
        setSuccessMessage("");
        setPassword("");
        setConfirmPassword("");
        clearAuthAccessError();
    }

    function resetFeedback() {
        setErrorMessage("");
        setSuccessMessage("");
        clearAuthAccessError();
    }

    function goToView(nextView) {
        if (forcedView) {
            return;
        }

        resetFormState();
        setView(nextView);
    }

    async function signInWithPassword() {
        try {
            setSubmitting(true);
            resetFeedback();

            const normalizedEmail = normalizeEmail(email);

            if (!normalizedEmail) {
                throw new Error("Debes ingresar un correo valido.");
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

            persistTrustedEmail(normalizedEmail);
            clearPendingAuthFlow();
        } catch (error) {
            setErrorMessage(getFriendlyAuthErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    async function requestPasswordSetup() {
        try {
            if (isCooldownActive) {
                setErrorMessage(
                    `Espera ${cooldownRemaining}s antes de solicitar otro enlace.`
                );
                return;
            }

            setSubmitting(true);
            resetFeedback();

            const normalizedEmail = normalizeEmail(email);

            if (!normalizedEmail) {
                throw new Error("Debes ingresar un correo valido.");
            }

            const emailRedirectTo = buildEmailRedirectUrl({
                appBasePath,
                email: normalizedEmail,
                source: loginContext.source || "phidias",
                returnTo: loginContext.returnTo,
                flow: "create-password",
            });

            const { error } = await supabase.auth.resetPasswordForEmail(
                normalizedEmail,
                {
                    redirectTo: emailRedirectTo,
                }
            );

            if (error) {
                throw error;
            }

            persistTrustedEmail(normalizedEmail);
            persistPendingAuthFlow("create-password");
            const nextCooldown = getNextCooldownUntil(new Date().getTime());
            setCooldownUntil(nextCooldown);
            storeMagicLinkCooldown(nextCooldown);
            setSuccessMessage(
                "Te enviamos un correo para crear tu contrasena. Abre ese enlace y define tu acceso para futuros ingresos desde cualquier dispositivo."
            );
        } catch (error) {
            setErrorMessage(getFriendlyAuthErrorMessage(error));

            if (
                typeof error?.message === "string" &&
                error.message.toLowerCase().includes("email rate limit exceeded")
            ) {
                const nextCooldown = getNextCooldownUntil(new Date().getTime());
                setCooldownUntil(nextCooldown);
                storeMagicLinkCooldown(nextCooldown);
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function requestPasswordRecovery() {
        try {
            if (isCooldownActive) {
                setErrorMessage(
                    `Espera ${cooldownRemaining}s antes de solicitar otro correo de recuperacion.`
                );
                return;
            }

            setSubmitting(true);
            resetFeedback();

            const normalizedEmail = normalizeEmail(email);

            if (!normalizedEmail) {
                throw new Error("Debes ingresar un correo valido.");
            }

            const emailRedirectTo = buildEmailRedirectUrl({
                appBasePath,
                email: normalizedEmail,
                source: loginContext.source || "phidias",
                returnTo: loginContext.returnTo,
                flow: "recovery",
            });

            const { error } = await supabase.auth.resetPasswordForEmail(
                normalizedEmail,
                {
                    redirectTo: emailRedirectTo,
                }
            );

            if (error) {
                throw error;
            }

            persistTrustedEmail(normalizedEmail);
            persistPendingAuthFlow("recovery");
            const nextCooldown = getNextCooldownUntil(new Date().getTime());
            setCooldownUntil(nextCooldown);
            storeMagicLinkCooldown(nextCooldown);
            setSuccessMessage(
                "Te enviamos un correo de recuperacion. Abre ese enlace y podras definir una contrasena nueva."
            );
        } catch (error) {
            setErrorMessage(getFriendlyAuthErrorMessage(error));

            if (
                typeof error?.message === "string" &&
                error.message.toLowerCase().includes("email rate limit exceeded")
            ) {
                const nextCooldown = getNextCooldownUntil(new Date().getTime());
                setCooldownUntil(nextCooldown);
                storeMagicLinkCooldown(nextCooldown);
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function completePasswordSetup() {
        try {
            setSubmitting(true);
            resetFeedback();

            if (!session?.user) {
                throw new Error(
                    "La sesion de validacion no esta activa. Abre de nuevo el correo enviado e intenta otra vez."
                );
            }

            const validationError = getPasswordValidationError(
                password,
                confirmPassword
            ) || getPasswordEqualsEmailError(password, session.user.email);

            if (validationError) {
                throw new Error(validationError);
            }

            const { error } = await supabase.auth.updateUser({
                password,
            });

            if (error) {
                throw error;
            }

            await API.post("/auth/password-change-complete");

            setSuccessMessage(
                activeView === LOGIN_VIEW.COMPLETE_RECOVERY
                    ? "Tu contrasena ya fue actualizada. En unos segundos entraras al sistema."
                    : "Tu contrasena ya quedo guardada. En unos segundos entraras al sistema."
            );

            window.setTimeout(() => {
                clearAuthAccessError();
                clearPendingAuthFlow();
                onAuthFlowComplete?.();
            }, 900);
        } catch (error) {
            setErrorMessage(getFriendlyAuthErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    function handleEmailKeyDown(event) {
        if (event.key !== "Enter" || submitting) {
            return;
        }

        const emailRequestViews = [
            LOGIN_VIEW.REQUEST_SETUP,
            LOGIN_VIEW.REQUEST_RECOVERY,
        ];

        if (emailRequestViews.includes(activeView) && isCooldownActive) {
            event.preventDefault();
            return;
        }

        event.preventDefault();

        if (activeView === LOGIN_VIEW.SIGN_IN) {
            signInWithPassword();
            return;
        }

        if (activeView === LOGIN_VIEW.REQUEST_SETUP) {
            requestPasswordSetup();
            return;
        }

        if (activeView === LOGIN_VIEW.REQUEST_RECOVERY) {
            requestPasswordRecovery();
        }
    }

    function handlePasswordKeyDown(event) {
        if (event.key === "Enter" && !submitting) {
            event.preventDefault();

            if (
                activeView === LOGIN_VIEW.COMPLETE_SETUP ||
                activeView === LOGIN_VIEW.COMPLETE_RECOVERY ||
                activeView === LOGIN_VIEW.CHANGE_REQUIRED
            ) {
                completePasswordSetup();
                return;
            }

            signInWithPassword();
        }
    }

    function getViewMeta() {
        switch (activeView) {
            case LOGIN_VIEW.REQUEST_SETUP:
                return {
                    kickerIcon: Mail,
                    title: "Crear contrasena",
                    helper:
                        loginContext.source === "phidias" && loginContext.email
                            ? "Estamos enviando un enlace seguro a tu correo para que definas tu contrasena."
                            : "Te enviaremos un enlace seguro para definir tu contrasena.",
                    submitLabel: isCooldownActive
                        ? `Espera ${cooldownRemaining}s para reenviar`
                        : "Enviar correo para crear contrasena",
                    onSubmit: requestPasswordSetup,
                };
            case LOGIN_VIEW.REQUEST_RECOVERY:
                return {
                    kickerIcon: RotateCcwKey,
                    title: "Recuperar acceso",
                    helper: "Recibe un enlace seguro para restablecer tu contrasena.",
                    submitLabel: isCooldownActive
                        ? `Espera ${cooldownRemaining}s para reenviar`
                        : "Enviar recuperacion",
                    onSubmit: requestPasswordRecovery,
                };
            case LOGIN_VIEW.COMPLETE_SETUP:
                return {
                    kickerIcon: KeyRound,
                    title: "Define tu contrasena",
                    helper: "Crea la contrasena con la que ingresaras al sistema.",
                    submitLabel: "Guardar contrasena",
                    onSubmit: completePasswordSetup,
                };
            case LOGIN_VIEW.COMPLETE_RECOVERY:
                return {
                    kickerIcon: RotateCcwKey,
                    title: "Restablece tu contrasena",
                    helper: "Define una contrasena nueva para volver a ingresar.",
                    submitLabel: "Actualizar contrasena",
                    onSubmit: completePasswordSetup,
                };
            case LOGIN_VIEW.CHANGE_REQUIRED:
                return {
                    kickerIcon: KeyRound,
                    title: "Cambia tu contrasena",
                    helper: "Tu acceso requiere una contrasena personal antes de entrar al sistema.",
                    submitLabel: "Guardar nueva contrasena",
                    onSubmit: completePasswordSetup,
                };
            case LOGIN_VIEW.SIGN_IN:
            default:
                return {
                    kickerIcon: LockKeyhole,
                    title: "Ingresar",
                    helper: "",
                    submitLabel: "Ingresar con contrasena",
                    onSubmit: signInWithPassword,
                };
        }
    }

    const accessLabel = fromPhidias ? "Acceso desde Phidias" : "Acceso seguro";
    const viewMeta = getViewMeta();
    const showPasswordFields =
        activeView === LOGIN_VIEW.SIGN_IN ||
        activeView === LOGIN_VIEW.COMPLETE_SETUP ||
        activeView === LOGIN_VIEW.COMPLETE_RECOVERY ||
        activeView === LOGIN_VIEW.CHANGE_REQUIRED;
    const isEmailDispatchView =
        activeView === LOGIN_VIEW.REQUEST_SETUP ||
        activeView === LOGIN_VIEW.REQUEST_RECOVERY;

    return (
        <MotionPage className="app-shell flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
            <div className="fixed right-5 top-5 z-20">
                <ThemeToggle />
            </div>

            <div className="relative w-full max-w-[28rem]">
                <MotionSection delay={0.05} className="pointer-events-none absolute inset-x-8 top-0 hidden h-40 xl:block">
                    <div className="login-aura h-full w-full rounded-full" />
                </MotionSection>

                <MotionSection delay={0.12}>
                    <Surface
                        variant="elevated"
                        className="login-card rounded-[2.25rem] p-6 sm:p-8"
                    >
                        <div className="mx-auto max-w-md">
                            <BrandMark
                                align="center"
                                className="justify-center"
                                markClassName="h-20 w-20 rounded-[1.8rem] p-3"
                            />

                            {activeView !== LOGIN_VIEW.SIGN_IN ? (
                                <p className="mt-6 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--app-text-tertiary)]">
                                    {accessLabel}
                                </p>
                            ) : null}

                            {activeView !== LOGIN_VIEW.SIGN_IN ? (
                                <h2 className="mt-3 text-center text-2xl font-semibold tracking-tight text-[color:var(--app-text-primary)]">
                                    {viewMeta.title}
                                </h2>
                            ) : null}

                            {viewMeta.helper ? (
                                <p className="mt-3 text-center text-sm leading-7 text-[color:var(--app-text-secondary)]">
                                    {viewMeta.helper}
                                </p>
                            ) : null}

                            {errorMessage ? (
                                <div className="mt-5 rounded-[1.2rem] border border-[color:color-mix(in_srgb,var(--brand-danger)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--brand-danger)_12%,transparent)] px-4 py-3 text-sm text-[color:color-mix(in_srgb,var(--brand-danger)_84%,white_16%)]">
                                    {errorMessage}
                                </div>
                            ) : null}

                            {isCooldownActive ? (
                                <div className="mt-5 rounded-[1.2rem] border border-[color:color-mix(in_srgb,var(--brand-warning)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--brand-warning)_10%,transparent)] px-4 py-3 text-sm text-[color:color-mix(in_srgb,var(--brand-warning)_84%,var(--app-text-strong)_16%)]">
                                    Podras solicitar un nuevo enlace en {cooldownRemaining}s.
                                </div>
                            ) : null}

                            {successMessage ? (
                                <div className="mt-5 flex items-start gap-3 rounded-[1.2rem] border border-[color:color-mix(in_srgb,var(--brand-success)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--brand-success)_12%,transparent)] px-4 py-3 text-sm text-[color:color-mix(in_srgb,var(--brand-success)_72%,white_28%)]">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{successMessage}</span>
                                </div>
                                ) : null}

                            <div className="mt-8 space-y-4">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                                        Email
                                    </span>
                                    <div className="field-shell flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-[color:var(--app-text-tertiary)]" />
                                        <input
                                            className="w-full bg-transparent outline-none"
                                            placeholder="nombre@empresa.com"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(event) =>
                                                setEmail(event.target.value)
                                            }
                                            onKeyDown={handleEmailKeyDown}
                                            disabled={Boolean(forcedView)}
                                        />
                                    </div>
                                </label>

                                {showPasswordFields ? (
                                    <>
                                        <label className="block">
                                            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                                                Contrasena
                                            </span>
                                            <div className="field-shell flex items-center gap-3">
                                                <LockKeyhole className="h-4 w-4 text-[color:var(--app-text-tertiary)]" />
                                                <input
                                                    className="w-full bg-transparent outline-none"
                                                    type="password"
                                                    placeholder="Tu contrasena"
                                                    autoComplete={
                                                        activeView === LOGIN_VIEW.SIGN_IN
                                                            ? "current-password"
                                                            : "new-password"
                                                    }
                                                    value={password}
                                                    onChange={(event) =>
                                                        setPassword(
                                                            event.target.value
                                                        )
                                                    }
                                                    onKeyDown={handlePasswordKeyDown}
                                                />
                                            </div>
                                        </label>

                                        {(activeView === LOGIN_VIEW.COMPLETE_SETUP ||
                                            activeView ===
                                                LOGIN_VIEW.COMPLETE_RECOVERY ||
                                            activeView ===
                                                LOGIN_VIEW.CHANGE_REQUIRED) && (
                                            <label className="block">
                                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                                                    Confirmar contrasena
                                                </span>
                                                <div className="field-shell flex items-center gap-3">
                                                    <KeyRound className="h-4 w-4 text-[color:var(--app-text-tertiary)]" />
                                                    <input
                                                        className="w-full bg-transparent outline-none"
                                                        type="password"
                                                        placeholder="Repite tu contrasena"
                                                        autoComplete="new-password"
                                                        value={confirmPassword}
                                                        onChange={(event) =>
                                                            setConfirmPassword(
                                                                event.target.value
                                                            )
                                                        }
                                                        onKeyDown={
                                                            handlePasswordKeyDown
                                                        }
                                                    />
                                                </div>
                                            </label>
                                        )}
                                    </>
                                ) : null}
                            </div>

                            <Button
                                fullWidth
                                size="lg"
                                iconRight={activeView === LOGIN_VIEW.SIGN_IN ? null : ArrowRight}
                                className="mt-8"
                                onClick={viewMeta.onSubmit}
                                disabled={
                                    submitting ||
                                    !email.trim() ||
                                    (isEmailDispatchView && isCooldownActive)
                                }
                            >
                                {submitting
                                    ? "Procesando..."
                                    : viewMeta.submitLabel}
                            </Button>

                            {!forcedView ? (
                                <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
                                    {activeView !== LOGIN_VIEW.SIGN_IN ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                goToView(LOGIN_VIEW.SIGN_IN)
                                            }
                                            className="font-medium text-[color:var(--app-accent)] transition-all duration-200 hover:opacity-80"
                                        >
                                            Ya tengo contrasena
                                        </button>
                                    ) : null}

                                    {activeView !== LOGIN_VIEW.REQUEST_SETUP ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                goToView(
                                                    LOGIN_VIEW.REQUEST_SETUP
                                                )
                                            }
                                            className="font-medium text-[color:var(--app-accent)] transition-all duration-200 hover:opacity-80"
                                        >
                                            Crear contrasena
                                        </button>
                                    ) : null}

                                    {activeView !== LOGIN_VIEW.REQUEST_RECOVERY ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                goToView(
                                                    LOGIN_VIEW.REQUEST_RECOVERY
                                                )
                                            }
                                            className="font-medium text-[color:var(--app-accent)] transition-all duration-200 hover:opacity-80"
                                        >
                                            Recuperar contrasena
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </Surface>
                </MotionSection>
            </div>
        </MotionPage>
    );
}
