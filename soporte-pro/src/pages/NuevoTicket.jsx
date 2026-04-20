import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function NuevoTicket() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        titulo: "",
        descripcion: "",
        categoria: "Software",
        prioridad: "media",
    });

    async function guardar() {
        await API.post("/tickets", form);
        navigate("/tickets");
    }

    return (
        <div className="max-w-xl mx-auto space-y-4">

            <h2 className="text-2xl font-semibold">Nuevo Ticket</h2>

            <input
                placeholder="Título"
                className="w-full p-2 border rounded"
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />

            <textarea
                placeholder="Descripción"
                className="w-full p-2 border rounded"
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />

            <select
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                className="w-full p-2 border rounded"
            >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
            </select>

            <button
                onClick={guardar}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl"
            >
                Crear
            </button>

        </div>
    );
}