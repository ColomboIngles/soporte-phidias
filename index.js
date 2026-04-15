const express = require("express");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const SECRET = process.env.SECRET || "Colombo2026_SoporteTI";

// 📂 Usuarios
const usuarios = JSON.parse(fs.readFileSync("usuarios.json"));


// 🚀 LOGIN DESDE PHIDIAS
app.get("/login-phidias", (req, res) => {
    res.send(`
    <html>
      <head>
        <title>Acceso Soporte</title>
        <style>
          body {
            font-family: Arial;
            text-align: center;
            padding: 40px;
            background: #f4f6f9;
          }

          h2 {
            color: #1e593d;
          }

          input {
            padding: 12px;
            width: 280px;
            border-radius: 8px;
            border: 1px solid #ccc;
          }

          button {
            padding: 10px 20px;
            background: #1e593d;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
          }

          button:hover {
            background: #4a8c6a;
          }

          .secondary {
            background: #a1dc86;
            color: #1e593d;
          }
        </style>
      </head>

      <body>

        <script>
          const params = new URLSearchParams(window.location.search);
          const emailParam = params.get("email");

          if (emailParam) {
            localStorage.setItem("email", emailParam);
            window.location.href = "/login?email=" + emailParam;
          } else {
            const email = localStorage.getItem("email");
            if (email) {
              window.location.href = "/login?email=" + email;
            }
          }
        </script>

        <h2>Soporte Tecnológico</h2>
        <p><b>Digite su correo institucional registrado en Phidias</b></p>

        <input id="correo" placeholder="correo@colomboingles.edu.co"/>
        <br><br>

        <button onclick="ingresar()">Ingresar</button>

        <br><br>
        <button class="secondary" onclick="cambiar()">Cambiar usuario</button>

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

          function cambiar() {
            localStorage.removeItem("email");
            window.location.reload();
          }
        </script>

      </body>
    </html>
  `);
});


// 🔐 VALIDACIÓN Y REDIRECCIÓN
app.get("/login", (req, res) => {
    let tli = req.query.email;

    if (!tli) return res.send("❌ Falta correo");

    tli = tli.toLowerCase().trim();

    const usuario = usuarios.find(
        u => u.email.toLowerCase().trim() === tli
    );

    if (!usuario) {
        return res.send(`
      <h3 style="color:#ff914d;">❌ Usuario no autorizado</h3>
      <a href="/logout">Intentar nuevamente</a>
    `);
    }

    const tld = Math.floor(Date.now() / 1000);
    const string = \`\${SECRET}:\${tli}@\${tld}\`;
  const tlh = crypto.createHash("md5").update(string).digest("hex");

  const url = \`https://soportecolombo.lovable.app/?tli=\${tli}&tld=\${tld}&tlh=\${tlh}&autoTicket=true\`;

  res.redirect(url);
});


// 🔄 LOGOUT
app.get("/logout", (req, res) => {
  res.send(`
        < script >
        localStorage.removeItem("email");
    window.location.href = "/login-phidias";
    </script >
        `);
});


// 📊 MÉTRICAS (SIMULACIÓN REALISTA)
app.get("/metrics", (req, res) => {
  res.json({
    ticketsPorDia: [5, 8, 6, 10, 12, 7, 9],
    dias: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    estados: {
      abiertos: 7,
      cerrados: 11
    }
  });
});


// 📊 DASHBOARD CON GRÁFICAS
app.get("/dashboard", (req, res) => {
  res.send(`
        < html >
      <head>
        <title>Dashboard Soporte</title>

        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

        <style>
          body {
            font-family: Arial;
            background: #f4f6f9;
            padding: 30px;
          }

          h1 {
            text-align: center;
            color: #1e593d;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 30px;
          }

          .card {
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          }

          canvas {
            max-width: 100%;
          }

        </style>
      </head>

      <body>

        <h1>📊 Dashboard de Soporte</h1>

        <div class="grid">

          <div class="card">
            <h3>Tickets por día</h3>
            <canvas id="lineChart"></canvas>
          </div>

          <div class="card">
            <h3>Estado de Tickets</h3>
            <canvas id="pieChart"></canvas>
          </div>

        </div>

        <script>
          async function cargar() {
            const res = await fetch('/metrics');
            const data = await res.json();

            new Chart(document.getElementById('lineChart'), {
              type: 'line',
              data: {
                labels: data.dias,
                datasets: [{
                  label: 'Tickets',
                  data: data.ticketsPorDia,
                  borderColor: '#1e593d',
                  backgroundColor: '#a1dc86',
                  tension: 0.3
                }]
              }
            });

            new Chart(document.getElementById('pieChart'), {
              type: 'pie',
              data: {
                labels: ['Abiertos', 'Cerrados'],
                datasets: [{
                  data: [data.estados.abiertos, data.estados.cerrados],
                  backgroundColor: ['#ff914d', '#4a8c6a']
                }]
              }
            });
          }

          cargar();
        </script>

      </body>
    </html >
        `);
});


// 🟢 SERVER
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});