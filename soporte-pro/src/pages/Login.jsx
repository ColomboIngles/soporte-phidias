import { useState } from "react";
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
        <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-[#0f172a]">

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md w-80">

                <h2 className="text-xl font-bold mb-4 text-center">Iniciar sesión</h2>

                <input
                    className="w-full mb-3 p-2 border rounded"
                    placeholder="Email"
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    className="w-full mb-4 p-2 border rounded"
                    type="password"
                    placeholder="Password"
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    onClick={login}
                    className="w-full bg-indigo-600 text-white py-2 rounded"
                >
                    Entrar
                </button>

            </div>
        </div>
    );
}