const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// 🔐 CONFIG
const SECRET = process.env.SECRET || "Colombo2026_SoporteTI";

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
    res.send(`
<html>
<head>
  <title>Soporte TI</title>
  <style>
    body { font-family: Arial; text-align:center; padding:40px; background:#f4f6f9;}
    h2 { color:#1e593d; }
    input { padding:10px; width:280px; border-radius:8px; }
    button { padding:10px 20px; background:#1e593d; color:white; border:none; border-radius:8px; }
  </style>
</head>

<body>

<script>
  const emailGuardado = localStorage.getItem("email");
  if (emailGuardado) {
    window.location.href = "/login?email=" + emailGuardado;
  }
</script>

<h2>Soporte Tecnológico</h2>
<p><b>Digite su correo institucional (solo la primera vez)</b></p>

<input id="correo" placeholder="correo@colomboingles.edu.co"/>
<br><br>

<button onclick="ingresar()">Ingresar</button>

<script>
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

// 🔐 VALIDACIÓN Y REDIRECCIÓN
app.get("/login", (req, res) => {
    let email = req.query.email;

    if (!email) {
        return res.send("❌ Falta correo");
    }

    email = normalizarEmail(email);

    const usuario = usuarios.find(
        (u) => normalizarEmail(u.email) === email
    );

    if (!usuario) {
        return res.send(`
<h2 style="color:red;">❌ Usuario no autorizado</h2>
<p>${email}</p>
<button onclick="localStorage.removeItem('email');location.href='/login-phidias'">
  Intentar nuevamente
</button>
    `);
    }

    // 🔐 TOKEN
    const tld = Math.floor(Date.now() / 1000);
    const string = `${SECRET}:${email}@${tld}`;
    const tlh = crypto.createHash("md5").update(string).digest("hex");

    const url = `https://soportecolombo.lovable.app/?tli=${email}&tld=${tld}&tlh=${tlh}&autoTicket=true`;

    res.redirect(url);
});

// 🔄 LOGOUT
app.get("/logout", (req, res) => {
    res.send(`
<script>
  localStorage.removeItem("email");
  window.location.href = "/login-phidias";
</script>
  `);
});

// 📥 WEBHOOK DESDE LOVABLE
app.post("/webhook-ticket", async (req, res) => {
    if (!supabase) {
        return res.status(500).send("Supabase no configurado");
    }

    const { email, titulo, descripcion } = req.body;

    if (!email) return res.status(400).send("Falta email");

    const { error } = await supabase.from("tickets").insert([
        {
            email: normalizarEmail(email),
            estado: "abierto",
            fecha: new Date(),
            titulo: titulo || "Sin título",
            descripcion: descripcion || "Sin descripción",
        },
    ]);

    if (error) {
        console.error("❌ Error BD:", error);
        return res.status(500).send("Error BD");
    }

    res.sendStatus(200);
});

// 📊 MÉTRICAS
app.get("/metrics", async (req, res) => {
    if (!supabase) {
        return res.status(500).send("Supabase no configurado");
    }

    const { data, error } = await supabase.from("tickets").select("*");

    if (error) return res.status(500).send("Error");

    const abiertos = data.filter((t) => t.estado === "abierto").length;
    const cerrados = data.filter((t) => t.estado === "cerrado").length;

    let dias = [];
    let ticketsPorDia = [];

    for (let i = 6; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);

        dias.push(d.toLocaleDateString("es-ES", { weekday: "short" }));

        const count = data.filter(
            (t) => new Date(t.fecha).toDateString() === d.toDateString()
        ).length;

        ticketsPorDia.push(count);
    }

    res.json({
        ticketsPorDia,
        dias,
        estados: { abiertos, cerrados },
    });
});

// 📊 DASHBOARD
app.get("/dashboard", (req, res) => {
    res.send(`
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: Arial; background:#f4f6f9; padding:30px; }
    h1 { text-align:center; color:#1e593d; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:30px; }
    .card { background:white; padding:20px; border-radius:15px; }
  </style>
</head>

<body>

<h1>📊 Dashboard Soporte</h1>

<div class="grid">
  <div class="card"><canvas id="line"></canvas></div>
  <div class="card"><canvas id="pie"></canvas></div>
</div>

<script>
  async function cargar() {
    const res = await fetch('/metrics');
    const data = await res.json();

    new Chart(document.getElementById('line'), {
      type: 'line',
      data: {
        labels: data.dias,
        datasets: [{
          data: data.ticketsPorDia,
          borderColor: '#1e593d'
        }]
      }
    });

    new Chart(document.getElementById('pie'), {
      type: 'pie',
      data: {
        labels: ['Abiertos','Cerrados'],
        datasets: [{
          data: [data.estados.abiertos, data.estados.cerrados],
          backgroundColor: ['#ff914d','#4a8c6a']
        }]
      }
    });
  }

  cargar();
</script>

</body>
</html>
  `);
});

// 🚀 SERVIDOR
app.listen(PORT, () => {
    console.log("🚀 Servidor corriendo en puerto " + PORT);
});