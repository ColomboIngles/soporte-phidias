const express = require("express");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Clave segura (usa variable de entorno en Render)
const SECRET = process.env.SECRET || "Colombo2026_SoporteTI";

// 📂 Cargar usuarios desde archivo JSON
const usuarios = JSON.parse(fs.readFileSync("usuarios.json"));


// 🚀 1. Entrada desde Phidias
app.get("/login-phidias", (req, res) => {
    res.send(`
    <html>
      <head>
        <title>Acceso Soporte</title>
      </head>
      <body style="font-family: Arial; text-align:center; padding:40px;">

        <script>
          const email = localStorage.getItem("email");

          if (email) {
            window.location.href = "/login?email=" + email;
          }
        </script>

        <h2>Bienvenido al sistema de soporte</h2>
        <p><b>Digite su correo electrónico guardado en Phidias por primera vez para validar sus datos</b></p>

        <input id="correo" placeholder="correo@colomboingles.edu.co" style="padding:10px; width:280px;" />
        <br><br>
        <button onclick="ingresar()" style="padding:10px 20px;">Ingresar</button>

        <script>
          function ingresar() {
            const email = document.getElementById("correo").value;

            if (!email) {
              alert("Por favor ingrese su correo");
              return;
            }

            // Guardar en navegador
            localStorage.setItem("email", email);

            // Redirigir para validación
            window.location.href = "/login?email=" + email;
          }
        </script>

      </body>
    </html>
  `);
});


// 🔐 2. Validar usuario y generar acceso
app.get("/login", (req, res) => {
    const tli = req.query.email.toLowerCase().trim();

    if (!tli) {
        return res.send("❌ Falta el correo");
    }

    // 🔍 Validar contra base de datos
    const usuario = usuarios.find(
        u => u.email.toLowerCase().trim() === tli
    );

    if (!usuario) {
        return res.send(`
      <h3>❌ Usuario no autorizado</h3>
      <p>Verifique que su correo esté registrado en el sistema</p>
      <a href="/logout">Intentar nuevamente</a>
    `);
    }

    // 🕒 Generar timestamp
    const tld = Math.floor(Date.now() / 1000);

    // 🔐 Generar hash
    const string = `${SECRET}:${tli}@${tld}`;
    const tlh = crypto.createHash("md5").update(string).digest("hex");

    // 🔗 URL de acceso a Lovable
    const url = `https://soportecolombo.lovable.app/?tli=${tli}&tld=${tld}&tlh=${tlh}&autoTicket=true`;

    res.redirect(url);
});


// 🔄 3. Resetear usuario (cambiar correo)
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