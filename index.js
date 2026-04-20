const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 10000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SECRET = process.env.SECRET;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("SUPABASE_URL y SUPABASE_KEY son obligatorios.");
}

if (!SECRET) {
    throw new Error("SECRET es obligatorio para el flujo de login.");
}

const defaultOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://soportecolombo.lovable.app",
];

const allowedOrigins = [...new Set([...defaultOrigins, ...FRONTEND_ORIGINS])];
const SUPABASE_KEY_ROLE = (() => {
    try {
        const payload = SUPABASE_KEY.split(".")[1];
        return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role;
    } catch (error) {
        return "unknown";
    }
})();
const WEBHOOK_ENABLED = Boolean(WEBHOOK_SECRET) && SUPABASE_KEY_ROLE === "service_role";

app.use(express.json());
app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Origen no permitido por CORS."));
        },
    })
);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarios = [];
try {
    usuarios = JSON.parse(fs.readFileSync("usuarios.json", "utf8"));
    console.log("usuarios cargados");
} catch (error) {
    console.log("usuarios.json no encontrado");
}

function createUserScopedClient(token) {
    return createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
}

function pickTicketPayload(body = {}) {
    const estado = body.estado?.trim() || "abierto";

    return {
        titulo: body.titulo?.trim(),
        descripcion: body.descripcion?.trim(),
        categoria: body.categoria?.trim() || "Software",
        prioridad: body.prioridad?.trim() || "media",
        estado: estado === "proceso" ? "en_proceso" : estado,
        asignado_a: body.asignado_a || null,
    };
}

function validateTicketPayload(ticket) {
    const missing = [];

    if (!ticket.titulo) missing.push("titulo");
    if (!ticket.descripcion) missing.push("descripcion");
    if (!ticket.categoria) missing.push("categoria");
    if (!ticket.prioridad) missing.push("prioridad");

    return missing;
}

async function getAuthenticatedContext(req) {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";

    if (!token) {
        return { error: "Falta token de autorizacion.", status: 401 };
    }

    const userSupabase = createUserScopedClient(token);
    const {
        data: { user },
        error: authError,
    } = await userSupabase.auth.getUser(token);

    if (authError || !user) {
        return { error: "Sesion invalida o expirada.", status: 401 };
    }

    const { data: profile, error: profileError } = await userSupabase
        .from("usuarios")
        .select("id, email, nombre, rol")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        return { error: "No se encontro el perfil del usuario.", status: 403 };
    }

    return {
        user,
        profile,
        supabase: userSupabase,
    };
}

function isAdmin(profile) {
    return profile?.rol === "admin";
}

function isTechnician(profile) {
    return profile?.rol === "tecnico";
}

function canReadTicket(ticket, context) {
    const email = context.user.email?.toLowerCase();

    return (
        isAdmin(context.profile) ||
        ticket.asignado_a === context.user.id ||
        ticket.email?.toLowerCase() === email
    );
}

function canUpdateTicket(ticket, context) {
    const email = context.user.email?.toLowerCase();

    return (
        isAdmin(context.profile) ||
        isTechnician(context.profile) ||
        ticket.email?.toLowerCase() === email
    );
}

function canDeleteTicket(context) {
    return isAdmin(context.profile);
}

async function findTicketById(client, id) {
    const { data, error } = await client
        .from("tickets")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        return null;
    }

    return data;
}

app.get("/health", (_req, res) => {
    res.json({
        ok: true,
        service: "soporte-phidias-api",
        timestamp: new Date().toISOString(),
        config: {
            supabaseUrl: Boolean(SUPABASE_URL),
            supabaseKey: Boolean(SUPABASE_KEY),
            supabaseKeyRole: SUPABASE_KEY_ROLE,
            secret: Boolean(SECRET),
            webhookSecret: Boolean(WEBHOOK_SECRET),
            webhookEnabled: WEBHOOK_ENABLED,
            allowedOrigins,
        },
    });
});

app.get("/login-phidias", (_req, res) => {
    res.send(`
  <html>
  <body style="font-family:Arial;text-align:center;padding-top:100px;">
  
  <h2>Soporte TI</h2>
  <p>Ingrese su correo institucional</p>

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

app.get("/login", (req, res) => {
    const email = (req.query.email || "").toLowerCase().trim();
    const usuario = usuarios.find((item) => item.email.toLowerCase() === email);

    if (!usuario) {
        return res.status(403).send("Usuario no autorizado");
    }

    const tld = Math.floor(Date.now() / 1000);
    const string = `${SECRET}:${email}@${tld}`;
    const tlh = crypto.createHash("md5").update(string).digest("hex");
    const url = `https://soportecolombo.lovable.app/?tli=${email}&tld=${tld}&tlh=${tlh}&autoTicket=true`;

    return res.redirect(url);
});

app.post("/webhook-ticket", async (req, res) => {
    try {
        if (!WEBHOOK_ENABLED) {
            return res.status(404).json({ message: "Webhook no disponible." });
        }

        if (req.headers["x-webhook-secret"] !== WEBHOOK_SECRET) {
            return res.status(401).json({ message: "Webhook no autorizado." });
        }

        const payload = pickTicketPayload(req.body);
        const email = req.body.email?.toLowerCase().trim();
        const missing = validateTicketPayload(payload);

        if (!email) {
            missing.push("email");
        }

        if (missing.length > 0) {
            return res.status(400).json({
                message: `Campos obligatorios faltantes: ${missing.join(", ")}`,
            });
        }

        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from("tickets")
            .insert([
                {
                    ...payload,
                    email,
                    estado: "abierto",
                    created_at: now,
                    updated_at: now,
                    fecha: now,
                },
            ])
            .select("*")
            .single();

        if (error) {
            throw error;
        }

        return res.status(201).json(data);
    } catch (error) {
        console.error("Error al crear ticket desde webhook:", error);
        return res.status(500).json({ message: "Error al guardar ticket." });
    }
});

app.get("/tickets", async (req, res) => {
    const context = await getAuthenticatedContext(req);

    if (context.error) {
        return res.status(context.status).json({ message: context.error });
    }

    let query = context.supabase.from("tickets").select("*");

    if (isTechnician(context.profile)) {
        query = query.eq("asignado_a", context.user.id);
    } else if (!isAdmin(context.profile)) {
        query = query.eq("email", context.user.email);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("Error al listar tickets:", error);
        return res.status(500).json({ message: "No se pudieron cargar los tickets." });
    }

    return res.json(data || []);
});

app.get("/tickets/:id", async (req, res) => {
    const context = await getAuthenticatedContext(req);

    if (context.error) {
        return res.status(context.status).json({ message: context.error });
    }

    const ticket = await findTicketById(context.supabase, req.params.id);

    if (!ticket) {
        return res.status(404).json({ message: "Ticket no encontrado." });
    }

    if (!canReadTicket(ticket, context)) {
        return res.status(403).json({ message: "No tienes acceso a este ticket." });
    }

    return res.json(ticket);
});

app.post("/tickets", async (req, res) => {
    const context = await getAuthenticatedContext(req);

    if (context.error) {
        return res.status(context.status).json({ message: context.error });
    }

    const payload = pickTicketPayload(req.body);
    const missing = validateTicketPayload(payload);

    if (missing.length > 0) {
        return res.status(400).json({
            message: `Campos obligatorios faltantes: ${missing.join(", ")}`,
        });
    }

    const now = new Date().toISOString();
    const email =
        isAdmin(context.profile) || isTechnician(context.profile)
            ? req.body.email?.toLowerCase().trim() || context.user.email
            : context.user.email;

    const { data, error } = await context.supabase
        .from("tickets")
        .insert([
            {
                ...payload,
                email,
                created_at: now,
                updated_at: now,
                fecha: now,
            },
        ])
        .select("*")
        .single();

    if (error) {
        console.error("Error al crear ticket:", error);
        return res.status(500).json({ message: "No se pudo crear el ticket." });
    }

    return res.status(201).json(data);
});

app.put("/tickets/:id", async (req, res) => {
    const context = await getAuthenticatedContext(req);

    if (context.error) {
        return res.status(context.status).json({ message: context.error });
    }

    const ticket = await findTicketById(context.supabase, req.params.id);

    if (!ticket) {
        return res.status(404).json({ message: "Ticket no encontrado." });
    }

    if (!canUpdateTicket(ticket, context)) {
        return res.status(403).json({ message: "No puedes editar este ticket." });
    }

    const updatePayload = {};
    const allowedFields = [
        "titulo",
        "descripcion",
        "categoria",
        "prioridad",
        "estado",
        "asignado_a",
    ];

    allowedFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            updatePayload[field] = field === "estado" && req.body[field] === "proceso"
                ? "en_proceso"
                : req.body[field];
        }
    });

    if (
        Object.prototype.hasOwnProperty.call(updatePayload, "asignado_a") &&
        !isAdmin(context.profile)
    ) {
        delete updatePayload.asignado_a;
    }

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await context.supabase
        .from("tickets")
        .update(updatePayload)
        .eq("id", req.params.id)
        .select("*")
        .single();

    if (error) {
        console.error("Error al actualizar ticket:", error);
        return res.status(500).json({ message: "No se pudo actualizar el ticket." });
    }

    return res.json(data);
});

app.delete("/tickets/:id", async (req, res) => {
    const context = await getAuthenticatedContext(req);

    if (context.error) {
        return res.status(context.status).json({ message: context.error });
    }

    if (!canDeleteTicket(context)) {
        return res.status(403).json({ message: "Solo admin puede eliminar tickets." });
    }

    const ticket = await findTicketById(context.supabase, req.params.id);

    if (!ticket) {
        return res.status(404).json({ message: "Ticket no encontrado." });
    }

    const { error } = await context.supabase
        .from("tickets")
        .delete()
        .eq("id", req.params.id);

    if (error) {
        console.error("Error al eliminar ticket:", error);
        return res.status(500).json({ message: "No se pudo eliminar el ticket." });
    }

    return res.json({ ok: true, id: req.params.id });
});

app.get("/", (_req, res) => {
    res.redirect("/login-phidias");
});

app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
    console.log(`Origenes permitidos: ${allowedOrigins.join(", ")}`);
    console.log(`Rol de la clave de Supabase: ${SUPABASE_KEY_ROLE}`);
});
