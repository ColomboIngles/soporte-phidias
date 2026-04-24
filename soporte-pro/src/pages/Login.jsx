import { useMemo, useState } from "react";
import {
    ArrowRight,
    LockKeyhole,
    Mail,
    MoveRight,
    ShieldCheck,
    Sparkles,
} from "lucide-react";
import { supabase } from "../services/supabase";
import ThemeToggle from "../components/ThemeToggle";
import Button from "../components/ui/Button";
import Surface from "../components/ui/Surface";
import {
    MotionItem,
    MotionPage,
    MotionSection,
    MotionStagger,
} from "../components/AppMotion";

const HIGHLIGHTS = [
    {
        title: "Seguimiento premium",
        text: "Historial, chat y adjuntos en una experiencia mas comercial y clara.",
    },
    {
        title: "Tema dual real",
        text: "Modo claro y oscuro consistentes, pensados para trabajar muchas horas.",
    },
    {
        title: "Paleta profesional IT",
        text: "Azules de confianza, grises tecnicos y estados semanticos listos para operacion diaria.",
    },
];

function readLoginContext() {
    if (typeof window === "undefined") {
        return {
            email: "",
            source: "",
            returnTo: "",
        };
    }

    const params = new URLSearchParams(window.location.search);

    return {
        email: (params.get("email") || "").trim().toLowerCase(),
        source: (params.get("source") || "").trim().toLowerCase(),
        returnTo: (params.get("returnTo") || "").trim(),
    };
}

function getAppBasePath() {
    const baseUrl = import.meta.env.BASE_URL || "/";
    return baseUrl === "/" ? "" : baseUrl.replace(/\/$/, "");
}

export default function Login() {
    const loginContext = useMemo(() => readLoginContext(), []);
    const appBasePath = useMemo(() => getAppBasePath(), []);
    const [email, setEmail] = useState(loginContext.email);
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const fromPhidias = loginContext.source === "phidias";

    async function login() {
        try {
            setSubmitting(true);
            setErrorMessage("");

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            if (loginContext.returnTo?.startsWith("/")) {
                window.location.assign(
                    `${appBasePath}${loginContext.returnTo}`
                );
                return;
            }

            window.location.reload();
        } catch (error) {
            setErrorMessage(
                error.message || "No se pudo validar el inicio de sesion."
            );
        } finally {
            setSubmitting(false);
        }
    }

    function handlePasswordKeyDown(event) {
        if (event.key === "Enter" && !submitting) {
            event.preventDefault();
            login();
        }
    }

    const accessLabel = fromPhidias ? "Acceso desde Phidias" : "Acceso seguro";
    const helperCopy = fromPhidias
        ? "Llegaste desde Phidias. Tu correo ya viene precargado y solo falta validar la contrasena."
        : "Ingresa al portal de soporte con una experiencia visual premium, consistente y mas amable para el trabajo diario.";

    return (
        <MotionPage className="app-shell flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
            <div className="fixed right-5 top-5 z-20">
                <ThemeToggle />
            </div>

            <div className="relative grid w-full max-w-7xl gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <MotionSection delay={0.05} className="hidden xl:block">
                    <Surface
                        variant="hero"
                        className="brand-glow rounded-[2.5rem] p-8"
                    >
                        <div className="brand-badge">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Soporte institucional
                        </div>

                        <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight text-[color:var(--app-text-primary)]">
                            Una mesa de soporte con presencia de producto SaaS premium.
                        </h1>
                        <p className="mt-5 max-w-2xl text-base leading-8 text-[color:var(--app-text-secondary)]">
                            La experiencia combina analitica, seguimiento y conversacion en una interfaz moderna, limpia y lista para presentarse como producto comercial.
                        </p>

                        <MotionStagger
                            className="mt-10 grid gap-4 lg:grid-cols-3"
                            delayChildren={0.1}
                            staggerChildren={0.06}
                        >
                            {HIGHLIGHTS.map((item) => (
                                <MotionItem key={item.title}>
                                    <Surface
                                        variant="muted"
                                        interactive
                                        className="rounded-[1.8rem] p-5"
                                    >
                                        <p className="text-sm font-semibold text-[color:var(--app-text-primary)]">
                                            {item.title}
                                        </p>
                                        <p className="mt-2 text-sm leading-7 text-[color:var(--app-text-secondary)]">
                                            {item.text}
                                        </p>
                                    </Surface>
                                </MotionItem>
                            ))}
                        </MotionStagger>

                        <div className="mt-8 flex flex-wrap gap-3">
                            {[
                                "var(--brand-primary)",
                                "var(--brand-secondary)",
                                "var(--brand-accent)",
                                "var(--brand-warning)",
                                "var(--brand-success)",
                            ].map((color) => (
                                <div
                                    key={color}
                                    className="h-16 w-16 rounded-[1.35rem] border border-[color:var(--app-border)] shadow-sm"
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </Surface>
                </MotionSection>

                <MotionSection delay={0.12}>
                    <Surface
                        variant="elevated"
                        className="rounded-[2.5rem] p-6 sm:p-8 xl:p-10"
                    >
                        <div className="mx-auto max-w-md">
                            <div className="app-kicker">
                                {fromPhidias ? (
                                    <MoveRight className="h-3.5 w-3.5" />
                                ) : (
                                    <Sparkles className="h-3.5 w-3.5" />
                                )}
                                {accessLabel}
                            </div>

                            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-[color:var(--app-text-primary)]">
                                Iniciar sesion
                            </h2>
                            <p className="mt-3 text-sm leading-7 text-[color:var(--app-text-secondary)]">
                                {helperCopy}
                            </p>

                            {fromPhidias ? (
                                <div className="app-surface-muted mt-6 rounded-[1.4rem] border border-[color:var(--app-border)] px-4 py-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-text-tertiary)]">
                                        Integracion cloud
                                    </p>
                                    <p className="mt-2 text-sm leading-7 text-[color:var(--app-text-secondary)]">
                                        El acceso llego desde un boton de Phidias y la validacion final del usuario se realiza con Supabase Auth.
                                    </p>
                                </div>
                            ) : null}

                            {errorMessage ? (
                                <div className="mt-5 rounded-[1.2rem] border border-[color:color-mix(in_srgb,var(--brand-danger)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--brand-danger)_12%,transparent)] px-4 py-3 text-sm text-[color:color-mix(in_srgb,var(--brand-danger)_84%,white_16%)]">
                                    {errorMessage}
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
                                        />
                                    </div>
                                </label>

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
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(event.target.value)
                                            }
                                            onKeyDown={handlePasswordKeyDown}
                                        />
                                    </div>
                                </label>
                            </div>

                            <Button
                                fullWidth
                                size="lg"
                                iconRight={ArrowRight}
                                className="mt-8"
                                onClick={login}
                                disabled={submitting || !email.trim() || !password}
                            >
                                {submitting
                                    ? "Validando acceso..."
                                    : "Entrar al workspace"}
                            </Button>
                        </div>
                    </Surface>
                </MotionSection>
            </div>
        </MotionPage>
    );
}
