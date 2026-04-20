import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);

    useEffect(() => {
        cargar();
    }, []);

    async function cargar() {
        const { data } = await supabase
            .from("usuarios")
            .select("*")
            .order("created_at", { ascending: false });

        setUsuarios(data || []);
    }

    async function cambiarRol(id, rol) {
        await supabase
            .from("usuarios")
            .update({ rol })
            .eq("id", id);

        cargar();
    }

    async function eliminar(id) {
        if (!confirm("¿Eliminar usuario?")) return;

        await supabase.from("usuarios").delete().eq("id", id);
        cargar();
    }

    return (
        <div className="space-y-6">

            <h1 className="text-2xl font-bold">👥 Usuarios</h1>

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="p-4 text-left">Email</th>
                            <th>Nombre</th>
                            <th>Rol</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {usuarios.map((u) => (
                            <tr key={u.id} className="border-t">
                                <td className="p-4">{u.email}</td>
                                <td>{u.nombre}</td>

                                <td>
                                    <select
                                        value={u.rol}
                                        onChange={(e) =>
                                            cambiarRol(u.id, e.target.value)
                                        }
                                        className="bg-gray-200 dark:bg-gray-700 p-1 rounded"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="tecnico">Técnico</option>
                                        <option value="usuario">Usuario</option>
                                    </select>
                                </td>

                                <td>
                                    <button
                                        onClick={() => eliminar(u.id)}
                                        className="text-red-500"
                                    >
                                        🗑
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}