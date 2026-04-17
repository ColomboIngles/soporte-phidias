const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(cors({ origin: "*" }));

// 📁 FRONTEND
app.use(express.static("public"));

// 🔐 CONFIG
const SECRET = process.env.SECRET || "Colombo2026_SoporteTI";

// 🟢 SUPABASE
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// 📂 USUARIOS
let usuarios = [];
try {
    usuarios = JSON.parse(fs.readFileSync("usuarios.json", "utf8"));
} catch (e) {
    console.log("⚠️ usuarios.json no encontrado");
}

// ===============================
// 🔐 LOGIN PHIDIAS (FIX)
// ===============================
app.get("/login-phidias", (req, res) => {
    res.send(`
<html>
<body style="font-family:Arial;text-align:center;padding-top:100px;">

<h2>Soporte TI</h2>
<input id="correo" placeholder="correo@colomboingles.edu.co"/>
<br><br>
<button onclick="ingresar()">Ingresar</button>

<script>
const emailGuardado = localStorage.getItem("email");
if (emailGuardado) {
  window.location.href = "/login?email=" + emailGuardado;
}

function ingresar() {
  let email = document.getElementById("correo").value;
  if (!email) return alert("Ingrese correo");

  email = email.toLowerCase().trim();
  localStorage.setItem("email", email);

  window.location.href = "/login?email=" + email;
}
</script>

</body>
</html>
    `);
});

// ===============================
// 🔐 LOGIN
// ===============================
app.get("/login", (req, res) => {
    let email = (req.query.email || "").toLowerCase().trim();

    const usuario = usuarios.find(u => u.email.toLowerCase() === email);

    if (!usuario) {
        return res.send("❌ Usuario no autorizado");
    }

    const tld = Math.floor(Date.now() / 1000);
    const string = `${SECRET}:${email}@${tld}`;
    const tlh = crypto.createHash("md5").update(string).digest("hex");

    const url = `/tickets.html?tli=${email}&tld=${tld}&tlh=${tlh}`;

    res.redirect(url);
});

// ===============================
// 📥 CREAR TICKET
// ===============================
app.post("/webhook-ticket", async (req, res) => {
    try {
        const { email, titulo, descripcion, categoria, prioridad } = req.body;

        const { error } = await supabase.from("tickets").insert([
            {
                email,
                estado: "abierto",
                fecha: new Date().toISOString(),
                titulo,
                descripcion,
                categoria,
                prioridad
            }
        ]);

        if (error) throw error;

        res.json({ ok: true });

    } catch (err) {
        console.error(err);
        res.status(500).send("Error");
    }
});

// ===============================
// 📋 LISTAR
// ===============================
app.get("/tickets", async (req, res) => {
    const { data } = await supabase
        .from("tickets")
        .select("*")
        .order("fecha", { ascending: false });

    res.json(data);
});

// ===============================
// 🔎 DETALLE
// ===============================
app.get("/tickets/:id", async (req, res) => {
    const { data } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", req.params.id);

    if (!data || data.length === 0) {
        return res.status(404).send("No encontrado");
    }

    res.json(data[0]);
});

// ===============================
// 🔥 CERRAR
// ===============================
app.put("/tickets/:id/cerrar", async (req, res) => {
    await supabase
        .from("tickets")
        .update({ estado: "cerrado" })
        .eq("id", req.params.id);

    res.json({ ok: true });
});

// ===============================
app.get("/", (req, res) => {
    res.redirect("/login-phidias");
});

// ===============================
app.listen(PORT, () => {
    console.log("🚀 Server activo en " + PORT);
});