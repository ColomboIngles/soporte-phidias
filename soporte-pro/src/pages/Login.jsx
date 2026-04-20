import { useState } from "react";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "../services/supabase";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function login() {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) return alert(error.message);

        window.location.reload();
    }

    return (
        <div className="flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-4 py-10">
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

            <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="glass-panel hidden rounded-[2rem] p-8 lg:block">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Soporte premium
                    </div>
                    <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">
                        Controla la operación de soporte con una experiencia SaaS moderna.
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                        Tickets, analítica, asignación técnica y colaboración en tiempo real dentro de un workspace más claro, rápido y confiable.
                    </p>

                    <div className="mt-10 grid gap-4 sm:grid-cols-3">
                        {[
                            { title: "Realtime", text: "Eventos sincronizados en vivo con Supabase." },
                            { title: "BI", text: "Dashboard con lectura operativa tipo Power BI." },
                            { title: "Workflow", text: "Asignación, auditoría y seguimiento end-to-end." },
                        ].map((item) => (
                            <div key={item.title} className="glass-card rounded-[1.5rem] p-4 soft-hover">
                                <p className="text-sm font-semibold text-white">{item.title}</p>
                                <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
                    <div className="mx-auto max-w-md">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                            Acceso seguro
                        </p>
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                            Iniciar sesión
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            Accede a tu entorno de soporte y retoma el flujo operativo en segundos.
                        </p>

                        <div className="mt-8 space-y-4">
                            <label className="block">
                                <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-400">
                                    Email
                                </span>
                                <div className="field-shell flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-slate-500" />
                                    <input
                                        className="w-full bg-transparent outline-none"
                                        placeholder="nombre@empresa.com"
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-slate-400">
                                    Contraseña
                                </span>
                                <div className="field-shell flex items-center gap-3">
                                    <LockKeyhole className="h-4 w-4 text-slate-500" />
                                    <input
                                        className="w-full bg-transparent outline-none"
                                        type="password"
                                        placeholder="Tu contraseña"
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </label>
                        </div>

                        <button
                            onClick={login}
                            className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(56,189,248,0.28)] hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(56,189,248,0.32)]"
                        >
                            Entrar al workspace
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
