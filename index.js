const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ MIDDLEWARES
app.use(express.json());

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type"]
}));

// ✅ SERVIR FRONTEND
app.use(express.static("public"));

// 🔗 SUPABASE
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ===============================
// 📥 CREAR TICKET
// ===============================
app.post("/webhook-ticket", async (req, res) => {
    try {
        console.log("📥 CREATE:", req.body);

        let { email, titulo, descripcion, categoria, prioridad } = req.body;

        const { data, error } = await supabase.from("tickets").insert([
            {
                email: (email || "test@demo.com").toLowerCase().trim(),
                estado: "abierto",
                fecha: new Date().toISOString(),
                titulo: titulo || "Sin título",
                descripcion: descripcion || "Sin descripción",
                categoria: categoria || null,
                prioridad: prioridad || null
            }
        ]);

        if (error) throw error;

        res.json({ ok: true, data });

    } catch (err) {
        console.error("❌ ERROR CREATE:", err);
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

    if (error) {
        console.error("❌ ERROR LIST:", error);
        return res.status(500).send("Error BD");
    }

    res.json(data);
});

// ===============================
// 🔎 OBTENER TICKET POR ID (FIX)
// ===============================
app.get("/tickets/:id", async (req, res) => {
    try {
        const id = (req.params.id || "").trim();

        console.log("🔎 ID recibido:", id);

        if (!id) {
            return res.status(400).json({ message: "ID inválido" });
        }

        const { data, error } = await supabase
            .from("tickets")
            .select("*")
            .eq("id", id);

        if (error) {
            console.error("❌ ERROR BD:", error);
            return res.status(500).send("Error BD");
        }

        if (!data || data.length === 0) {
            console.log("❌ NO ENCONTRADO");
            return res.status(404).json({ message: "Ticket no encontrado" });
        }

        res.json(data[0]);

    } catch (err) {
        console.error("❌ ERROR SERVER:", err);
        res.status(500).send("Error interno");
    }
});

// ===============================
// 🔥 CERRAR TICKET
// ===============================
app.put("/tickets/:id/cerrar", async (req, res) => {
    const id = (req.params.id || "").trim();

    console.log("🔒 Cerrando ticket:", id);

    const { error } = await supabase
        .from("tickets")
        .update({ estado: "cerrado" })
        .eq("id", id);

    if (error) {
        console.error("❌ ERROR CERRAR:", error);
        return res.status(500).send("Error BD");
    }

    res.json({ ok: true });
});

// ===============================
// 🏠 HOME → REDIRIGE
// ===============================
app.get("/", (req, res) => {
    res.redirect("/tickets.html");
});

// ===============================
app.listen(PORT, () => {
    console.log("🚀 Server corriendo en puerto " + PORT);
});