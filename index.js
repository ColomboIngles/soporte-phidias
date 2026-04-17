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
    origin: "*", // luego puedes restringir a tu dominio Lovable
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

// 🔐 CONFIG
const SECRET = process.env.SECRET || "Colombo2026_SoporteTI";
const TOKEN_HASH_ALGO = process.env.TOKEN_HASH_ALGO || "md5";

// 🟢 SUPABASE
let supabase;
try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY
        );
        console.log("✅ Supabase conectado");
    } else {
        console.log("⚠️ Supabase no configurado");
    }
} catch (error) {
    console.error("❌ Error conectando Supabase:", error.message);
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

// 🚀 LOGIN DESDE PHIDIAS
app.get("/login-phidias", (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
<title>Soporte TI</title>
<style>
body { font-family: Arial; background:#f4f6f9; display:flex; justify-content:center; align-items:center; height:100vh; }
.card { background:white; padding:30px; border-radius:15px; box-shadow:0 5px 20px rgba(0,0,0,0.1); text-align:center; width:320px; }
h2 { color:#1e593d; }
input { padding:10px; width:100%; border-radius:8px; border:1px solid #ccc; margin-top:10px; }
button { margin-top:15px; padding:10px; width:100%; background:#1e593d; color:white; border:none; border-radius:8px; cursor:pointer; }
</style>
</head>
<body>
<div class="card">
<h2>Soporte TI</h2>
<input id="correo" placeholder="correo@colomboingles.edu.co"/>
<button onclick="ingresar()">Ingresar</button>
</div>
<script>
function ingresar() {
  let email = document.getElementById("correo").value;
  if (!email) return alert("Ingrese su correo");
  email = email.toLowerCase().trim();
  localStorage.setItem("email", email);
  window.location.href = "/login?email=" + email;
}
</script>
</body>
</html>`);
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

    const url = `https://soportecolombo.lovable.app/?tli=${email}&tld=${tld}&tlh=${tlh}&autoTicket=true`;

    res.redirect(url);
});

// 📥 CREAR TICKET
app.post("/webhook-ticket", async (req, res) => {
    try {
        console.log("📥 REQUEST DESDE LOVABLE:", req.body);

        if (!supabase) {
            return res.status(500).send("Supabase no configurado");
        }

        let { email, titulo, descripcion, categoria, prioridad } = req.body;

        // fallback por si Lovable no envía email
        if (!email) {
            email = "test@demo.com";
        }

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
            console.error("❌ ERROR REAL SUPABASE:", error);
            return res.status(500).json({
                message: "Error BD",
                detalle: error.message,
                code: error.code
            });
        }

        console.log("✅ Ticket creado:", data);
        res.status(200).json({ message: "Ticket creado", data });

    } catch (err) {
        console.error("❌ ERROR SERVER:", err);
        res.status(500).send("Error interno");
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
            console.error("❌ Error obteniendo tickets:", error);
            return res.status(500).send("Error BD");
        }

        res.json(data);

    } catch (err) {
        console.error("❌ Error server:", err);
        res.status(500).send("Error interno");
    }
});

// 📊 MÉTRICAS
app.get("/metrics", async (req, res) => {
    const { data, error } = await supabase.from("tickets").select("*");

    if (error) return res.status(500).send("Error");

    const abiertos = data.filter(t => t.estado === "abierto").length;
    const cerrados = data.filter(t => t.estado === "cerrado").length;

    res.json({ abiertos, cerrados });
});

// 🚀 SERVIDOR
app.listen(PORT, () => {
    console.log("🚀 Servidor corriendo en puerto " + PORT);
});