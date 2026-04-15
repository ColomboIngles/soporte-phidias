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
        <p><b>Digite su correo institucional registrado en Phidias para validar su acceso</b></p>

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


// 📊 MÉTRICAS (TEMPORALES)
app.get("/metrics", (req, res) => {
  res.json({
    ticketsHoy: 18,
    abiertos: 7,
    cerrados: 11,
    usuariosActivos: 32
  });
});


// 📊 DASHBOARD PRO
app.get("/dashboard", (req, res) => {
  res.send(`
        < html >
      <head>
        <title>Dashboard Soporte</title>
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
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-top: 30px;
          }

          .card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            text-align: center;
            border-top: 5px solid #1e593d;
          }

          .card h2 {
            margin: 0;
            font-size: 42px;
            color: #1e593d;
          }

          .label {
            color: #666;
            margin-top: 10px;
          }

          button {
            margin-top: 20px;
            padding: 10px 20px;
            background: #4a8c6a;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
          }

        </style>
      </head>

      <body>

        <h1>📊 Dashboard Soporte</h1>

        <div class="grid">
          <div class="card">
            <h2 id="ticketsHoy">0</h2>
            <div class="label">Tickets Hoy</div>
          </div>

          <div class="card">
            <h2 id="abiertos">0</h2>
            <div class="label">Abiertos</div>
          </div>

          <div class="card">
            <h2 id="cerrados">0</h2>
            <div class="label">Cerrados</div>
          </div>

          <div class="card">
            <h2 id="usuarios">0</h2>
            <div class="label">Usuarios Activos</div>
          </div>
        </div>

        <center>
          <button onclick="cargar()">Actualizar</button>
        </center>

        <script>
          function cargar() {
            fetch('/metrics')
              .then(res => res.json())
              .then(data => {
                document.getElementById('ticketsHoy').innerText = data.ticketsHoy;
                document.getElementById('abiertos').innerText = data.abiertos;
                document.getElementById('cerrados').innerText = data.cerrados;
                document.getElementById('usuarios').innerText = data.usuariosActivos;
              });
          }

          cargar();
          setInterval(cargar, 10000);
        </script>

      </body>
    </html >
        `);
});


// 🟢 SERVER
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});