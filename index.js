const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type"]
}));

// SUPABASE
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// NORMALIZAR EMAIL
function normalizarEmail(email) {
    return email.toLowerCase().trim();
}

// ===============================
// 📥 CREAR TICKET
// ===============================
app.post("/webhook-ticket", async (req, res) => {
    try {
        console.log("📥 CREATE:", req.body);

        let { email, titulo, descripcion, categoria, prioridad } = req.body;

        const { data, error } = await supabase.from("tickets").insert([
            {
                email: normalizarEmail(email || "test@demo.com"),
                estado: "abierto",
                fecha: new Date().toISOString(),
                titulo,
                descripcion,
                categoria,
                prioridad
            }
        ]);

        if (error) throw error;

        res.json(data);

    } catch (err) {
        console.error("❌ ERROR:", err);
        res.status(500).send("Error");
    }
});

// ===============================
// 📋 LISTAR TICKETS
// ===============================
app.get("/tickets", async (req, res) => {
    const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("fecha", { ascending: false });

    if (error) return res.status(500).send(error);

    res.json(data);
});

// ===============================
// 🔎 OBTENER TICKET POR ID
// ===============================
app.get("/tickets/:id", async (req, res) => {
    const { id } = req.params;

    console.log("🔎 BUSCANDO ID:", id);

    const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        console.log("❌ NO ENCONTRADO");
        return res.status(404).json({ message: "Ticket no encontrado" });
    }

    res.json(data);
});

// ===============================
// 🔥 CERRAR TICKET
// ===============================
app.put("/tickets/:id/cerrar", async (req, res) => {
    const { id } = req.params;

    const { error } = await supabase
        .from("tickets")
        .update({ estado: "cerrado" })
        .eq("id", id);

    if (error) return res.status(500).send("Error");

    res.send("OK");
});

// ===============================
app.listen(PORT, () => {
    console.log("🚀 Server corriendo en puerto " + PORT);
});