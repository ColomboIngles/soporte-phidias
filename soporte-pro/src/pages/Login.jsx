import { useState } from "react";
import {
    ArrowRight,
    LockKeyhole,
    Mail,
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
        title: "Identidad institucional",
        text: "La interfaz combina el verde del Colegio con una lectura SaaS moderna.",
    },
];

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function login() {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert(error.message);
            return;
        }

        window.location.reload();
    }

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

                        <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight text-white">
                            Una mesa de soporte con presencia de producto SaaS premium.
                        </h1>
                        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
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
                                        <p className="text-sm font-semibold text-white">
                                            {item.title}
                                        </p>
                                        <p className="mt-2 text-sm leading-7 text-slate-400">
                                            {item.text}
                                        </p>
                                    </Surface>
                                </MotionItem>
                            ))}
                        </MotionStagger>

                        <div className="mt-8 flex flex-wrap gap-3">
                            {[
                                "#1e593d",
                                "#44a66a",
                                "#3ca8ff",
                                "#d7b15a",
                                "#b7eac8",
                            ].map((color) => (
                                <div
                                    key={color}
                                    className="h-16 w-16 rounded-[1.35rem] border border-white/20 shadow-sm"
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
                                <Sparkles className="h-3.5 w-3.5" />
                                Acceso seguro
                            </div>

                            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white">
                                Iniciar sesion
                            </h2>
                            <p className="mt-3 text-sm leading-7 text-slate-400">
                                Ingresa al portal de soporte con una experiencia visual premium, consistente y mas amable para el trabajo diario.
                            </p>

                            <div className="mt-8 space-y-4">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Email
                                    </span>
                                    <div className="field-shell flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-slate-500" />
                                        <input
                                            className="w-full bg-transparent outline-none"
                                            placeholder="nombre@empresa.com"
                                            onChange={(event) =>
                                                setEmail(event.target.value)
                                            }
                                        />
                                    </div>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Contrasena
                                    </span>
                                    <div className="field-shell flex items-center gap-3">
                                        <LockKeyhole className="h-4 w-4 text-slate-500" />
                                        <input
                                            className="w-full bg-transparent outline-none"
                                            type="password"
                                            placeholder="Tu contrasena"
                                            onChange={(event) =>
                                                setPassword(event.target.value)
                                            }
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
                            >
                                Entrar al workspace
                            </Button>
                        </div>
                    </Surface>
                </MotionSection>
            </div>
        </MotionPage>
    );
}
