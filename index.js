const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

const SECRET = "Colombo2026_SoporteTI";

// Lista de usuarios (luego la conectamos a tu BD)
const usuarios = [
    "ing.wilsonreales@gmail.com",
    "docente1@colomboingles.edu.co",
    "docente2@colomboingles.edu.co"
];

// Pantalla inicial (desde Phidias)
app.get("/login-phidias", (req, res) => {
    let html = "<h2>Selecciona tu usuario</h2>";

    usuarios.forEach(email => {
        html += `<p><a href="/login?email=${email}">${email}</a></p>`;
    });

    res.send(html);
});

// Genera token y redirige a Lovable
app.get("/login", (req, res) => {
    const tli = req.query.email;
    const tld = Math.floor(Date.now() / 1000);

    const string = `${SECRET}:${tli}@${tld}`;
    const tlh = crypto.createHash("md5").update(string).digest("hex");

    const url = `https://soportecolombo.lovable.app/?tli=${tli}&tld=${tld}&tlh=${tlh}&autoTicket=true`;

    res.redirect(url);
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});