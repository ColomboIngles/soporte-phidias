const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔐 Clave
const SECRET = process.env.SECRET || "Colombo2026_SoporteTI";

// 🟢 Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// 📂 Usuarios
const usuarios = JSON.parse(fs.readFileSync("usuarios.json"));


// 🧠 FUNCIÓN PARA LIMPIAR EMAIL
function normalizarEmail(email) {
    return email.toLowerCase().trim();
}


// 🚀 LOGIN DESDE PHIDIAS
app.get("/login-phidias", (req, res) => {

    let email = req.query.email;

    console.log("📩 Email recibido desde Phidias:", email);

    if (!email) {
        return res.send(`
      <h3>❌ No se recibió correo desde Phidias</h3>
      <p>Verifica la variable {{email}}</p>
    `);
    }

    email = normalizarEmail(email);

    return res.redirect("/login?email=" + email);
});


// 🔐 VALIDACIÓN Y REDIRECCIÓN
app.get("/login", (req, res) => {

    let email = req.query.email;

    if (!email) {
        return res.send("❌ Falta correo");
    }

    email = normalizarEmail(email);

    console.log("🔍 Buscando usuario:", email);

    // 🔍 Buscar usuario
    const usuario = usuarios.find(u =>
        normalizarEmail(u.email) === email
    );

    if (!usuario) {
        console.log("❌ Usuario NO encontrado:", email);

        return res.send(`
      <h2 style="color:red;">❌ Usuario no autorizado</h2>
      <p>Correo: ${email}</p>
      <p>Verifique que esté registrado en el sistema</p>
    `);
    }

    console.log("✅ Usuario encontrado:", usuario.nombre);

    // 🔐 Generar token
    const tld = Math.floor(Date.now() / 1000);
    const string = `${SECRET}:${email}@${tld}`;
    const tlh = crypto.createHash("md5").update(string).digest("hex");

    const url = `https://soportecolombo.lovable.app/?tli=${email}&tld=${tld}&tlh=${tlh}&autoTicket=true`;

    res.redirect(url);
});


// 📥 WEBHOOK DESDE LOVABLE
app.post("/webhook-ticket", async (req, res) => {

    const { email, titulo, descripcion } = req.body;

    console.log("📥 Ticket recibido:", req.body);

    if (!email) {
        return res.status(400).send("Falta email");
    }

    const { error } = await supabase
        .from("tickets")
        .insert([
            {
                email: normalizarEmail(email),
                estado: "abierto",
                fecha: new Date(),
                titulo: titulo || "Sin título",
                descripcion: descripcion || "Sin descripción"
            }
        ]);

    if (error) {
        console.error("❌ Error guardando en Supabase:", error);
        return res.status(500).send("Error BD");
    }

    console.log("✅ Ticket guardado correctamente");

    res.sendStatus(200);
});


// 📊 MÉTRICAS REALES
app.get("/metrics", async (req, res) => {

    const { data, error } = await supabase
        .from("tickets")
        .select("*");

    if (error) {
        console.error(error);
        return res.status(500).send("Error obteniendo datos");
    }

    const abiertos = data.filter(t => t.estado === "abierto").length;
    const cerrados = data.filter(t => t.estado === "cerrado").length;

    let dias = [];
    let ticketsPorDia = [];

    for (let i = 6; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);

        dias.push(d.toLocaleDateString("es-ES", { weekday: "short" }));

        const count = data.filter(t =>
            new Date(t.fecha).toDateString() === d.toDateString()
        ).length;

        ticketsPorDia.push(count);
    }

    res.json({
        ticketsPorDia,
        dias,
        estados: { abiertos, cerrados }
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
        <div class="card">
          <canvas id="line"></canvas>
        </div>
        <div class="card">
          <canvas id="pie"></canvas>
        </div>
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


// 🟢 SERVER
app.listen(PORT, () => {
    console.log("🚀 Servidor corriendo en puerto " + PORT);
});