import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function ChatTicket({ ticketId, user }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    cargar();

    const channel = supabase
      .channel("chat-" + ticketId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comentarios",
          filter: `ticket_id=eq.${ticketId}`,
        },
        payload => {
          setMensajes(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [ticketId]);

  async function cargar() {
    const { data } = await supabase
      .from("comentarios")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at");

    setMensajes(data || []);
  }

  async function enviar() {
    if (!texto) return;

    await supabase.from("comentarios").insert([
      {
        ticket_id: ticketId,
        usuario: user,
        mensaje: texto,
      },
    ]);

    setTexto("");
  }

  return (
    <div className="bg-white/5 backdrop-blur p-4 rounded-xl border border-white/10 mt-6">
      <h3 className="mb-3 font-semibold">💬 Conversación</h3>

      <div className="h-64 overflow-y-auto space-y-2 mb-3">
        {mensajes.map(m => (
          <div
            key={m.id}
            className={`p-2 rounded-lg text-sm ${
              m.usuario === user
                ? "bg-indigo-500 text-white ml-auto w-fit"
                : "bg-gray-200 dark:bg-gray-700 w-fit"
            }`}
          >
            <p>{m.mensaje}</p>
            <span className="text-xs opacity-60">{m.usuario}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 p-2 rounded bg-white/10 border border-white/10"
        />
        <button
          onClick={enviar}
          className="px-4 bg-indigo-600 text-white rounded"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}