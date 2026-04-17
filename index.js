const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ MIDDLEWARES
app.use(express.json());

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

// 🔐 CONFIG
const SECRET = process.env.SECRET || "Colombo2026_SoporteTI";
const TOKEN_HASH_ALGO = process.env.TOKEN_HASH_ALGO || "md5";

// 🟢 SUPABASE
let supabase;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );
    console.log("✅ Supabase conectado");
} else {
    console.log("⚠️ Supabase no configurado");
}

// 📂 USUARIOS
let usuarios = [];
try {
    usuarios = JSON.parse(fs.readFileSync("usuarios.json", "utf8"));
    console.log("✅ usuarios.json cargado");
} catch (error) {
    console.error("❌ Error cargando usuarios.json:", error.message);
}

// 🧠 NORMALIZAR EMAIL
function normalizarEmail(email) {
    return email.toLowerCase().trim();
}

// 🚀 LOGIN PHIDIAS (MEJORADO)
app.get("/login-phidias", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<body>

<h2>Soporte TI</h2>

<input id="correo" placeholder="correo@colomboingles.edu.co"/>
<button onclick="ingresar()">Ingresar</button>

<script>
const emailGuardado = localStorage.getItem("email");

if (emailGuardado) {
  window.location.href = "/login?email=" + emailGuardado;
}

function ingresar() {
  let email = document.getElementById("correo").value;

  if (!email) {
    alert("Ingrese su correo");
    return;
  }

  email = email.toLowerCase().trim();
  localStorage.setItem("email", email);

  window.location.href = "/login?email=" + email;
}
</script>

</body>
</html>
`);
});

// 🔐 LOGIN
app.get("/login", (req, res) => {
    let email = req.query.email;

    if (!email) return res.send("❌ Falta correo");

    email = normalizarEmail(email);

    const usuario = usuarios.find(
        (u) => normalizarEmail(u.email) === email
    );

    if (!usuario) {
        return res.send("❌ Usuario no autorizado");
    }

    const tld = Math.floor(Date.now() / 1000);
    const string = `${SECRET}:${email}@${tld}`;
    const tlh = crypto.createHash(TOKEN_HASH_ALGO).update(string).digest("hex");

    const url = `https://soportecolombo.lovable.app/?tli=${email}&tld=${tld}&tlh=${tlh}`;

    res.redirect(url);
});

// 🔄 LOGOUT
app.get("/logout", (req, res) => {
    res.send(`
<script>
localStorage.removeItem("email");
window.location.href="/login-phidias";
</script>
`);
});

// 📥 CREAR TICKET
app.post("/webhook-ticket", async (req, res) => {
    try {
        console.log("📥 REQUEST:", req.body);

        let { email, titulo, descripcion, categoria, prioridad } = req.body;

        if (!email) email = "test@demo.com";

        const { data, error } = await supabase.from("tickets").insert([
            {
                email: normalizarEmail(email),
                estado: "abierto",
                fecha: new Date().toISOString(),
                titulo: titulo || "Sin título",
                descripcion: descripcion || "Sin descripción",
                categoria: categoria || null,
                prioridad: prioridad || null
            }
        ]);

        if (error) {
            console.error("❌ Error BD:", error);
            return res.status(500).json(error);
        }

        res.json({ ok: true, data });

    } catch (err) {
        console.error("❌ Error server:", err);
        res.status(500).send("Error");
    }
});

// 📋 LISTAR TICKETS
app.get("/tickets", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("tickets")
            .select("*")
            .order("fecha", { ascending: false });

        if (error) {
            console.error("❌ Error listando:", error);
            return res.status(500).send("Error BD");
        }

        res.json(data);

    } catch (err) {
        console.error("❌ Error server:", err);
        res.status(500).send("Error");
    }
});

// 🔎 OBTENER TICKET POR ID (SOLUCIÓN PROBLEMA 1)
app.get("/tickets/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from("tickets")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) {
            return res.status(404).json({ message: "Ticket no encontrado" });
        }

        res.json(data);

    } catch (err) {
        console.error("❌ Error obteniendo ticket:", err);
        res.status(500).send("Error interno");
    }
});

// 🔥 CERRAR TICKET
app.put("/tickets/:id/cerrar", async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from("tickets")
            .update({ estado: "cerrado" })
            .eq("id", id);

        if (error) {
            console.error("❌ Error cerrando:", error);
            return res.status(500).send("Error BD");
        }

        res.json({ ok: true, message: "Ticket cerrado" });

    } catch (err) {
        console.error("❌ Error server:", err);
        res.status(500).send("Error");
    }
});

// 📊 MÉTRICAS
app.get("/metrics", async (req, res) => {
    try {
        const { data, error } = await supabase.from("tickets").select("*");

        if (error) return res.status(500).send("Error");

        const abiertos = data.filter(t => t.estado === "abierto").length;
        const cerrados = data.filter(t => t.estado === "cerrado").length;

        res.json({ abiertos, cerrados });

    } catch (err) {
        res.status(500).send("Error");
    }
});

// 🚀 SERVIDOR
app.listen(PORT, () => {
    console.log("🚀 Servidor corriendo en puerto " + PORT);
});