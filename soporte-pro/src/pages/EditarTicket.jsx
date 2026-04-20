import { useEffect, useState } from "react";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";

export default function EditarTicket() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({});

    useEffect(() => {
        API.get(`/tickets/${id}`).then((res) => setForm(res.data));
    }, []);

    async function guardar() {
        await API.put(`/tickets/${id}`, form);
        navigate("/tickets");
    }

    return (
        <div className="max-w-xl mx-auto space-y-4">

            <h2 className="text-2xl font-semibold">Editar Ticket</h2>

            <input
                value={form.titulo || ""}
                className="w-full p-2 border rounded"
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />

            <textarea
                value={form.descripcion || ""}
                className="w-full p-2 border rounded"
                onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                }
            />

            <select
                value={form.estado || "abierto"}
                onChange={(e) =>
                    setForm({ ...form, estado: e.target.value })
                }
                className="w-full p-2 border rounded"
            >
                <option value="abierto">Abierto</option>
                <option value="proceso">Proceso</option>
                <option value="cerrado">Cerrado</option>
            </select>

            <button
                onClick={guardar}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl"
            >
                Guardar
            </button>

        </div>
    );
}