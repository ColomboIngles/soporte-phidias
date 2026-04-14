const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Usa variable de entorno en producción (Render)
const SECRET = process.env.SECRET || "Colombo2026_SoporteTI";

// 📋 Lista temporal (luego puedes conectarla a tu BD)
const usuarios = [
    "ing.wilsonreales@gmail.com",
    "docente1@colomboingles.edu.co",
    "docente2@colomboingles.edu.co"
];


// 🚀 1. Entrada desde Phidias
app.get("/login-phidias", (req, res) => {
    res.send(`
    <html>
      <head>
        <title>Redirigiendo...</title>
      </head>
      <body>
        <script>
          const email = localStorage.getItem("email");

          if (email) {
            // Si ya tiene usuario guardado → entra directo
            window.location.href = "/login?email=" + email;
          } else {
            // Primera vez → seleccionar usuario
            window.location.href = "/seleccionar";
          }
        </script>
      </body>
    </html>
  `);
});


// 👤 2. Pantalla de selección (solo primera vez)
app.get("/seleccionar", (req, res) => {
    let html = `
    <html>
      <head>
        <title>Seleccionar usuario</title>
        <style>
          body {
            font-family: Arial;
            text-align: center;
            padding: 40px;
          }
          a {
            display: block;
            margin: 10px;
            padding: 10px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <h2>Selecciona tu usuario</h2>
  `;

    usuarios.forEach(email => {
        html += `<a href="#" onclick="guardar('${email}')">${email}</a>`;
    });

    html += `
        <script>
          function guardar(email) {
            localStorage.setItem("email", email);
            window.location.href = "/login?email=" + email;
          }
        </script>
      </body>
    </html>
  `;

    res.send(html);
});


// 🔐 3. Generar token y redirigir a Lovable
app.get("/login", (req, res) => {
    const tli = req.query.email;

    if (!tli) {
        return res.send("❌ Falta el correo");
    }

    const tld = Math.floor(Date.now() / 1000);

    const string = `${SECRET}:${tli}@${tld}`;
    const tlh = crypto.createHash("md5").update(string).digest("hex");

    const url = `https://soportecolombo.lovable.app/?tli=${tli}&tld=${tld}&tlh=${tlh}&autoTicket=true`;

    res.redirect(url);
});


// 🔄 4. Cambiar usuario (opcional)
app.get("/logout", (req, res) => {
    res.send(`
    <script>
      localStorage.removeItem("email");
      window.location.href = "/login-phidias";
    </script>
  `);
});


// 🟢 Servidor
app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto " + PORT);
});