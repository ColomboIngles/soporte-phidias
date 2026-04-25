const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 10000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SECRET = process.env.SECRET;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const RESEND_REPLY_TO = process.env.RESEND_REPLY_TO;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME;
const WHATSAPP_TEMPLATE_LANGUAGE_CODE =
    process.env.WHATSAPP_TEMPLATE_LANGUAGE_CODE || "es_CO";
const EMAIL_NOTIFICATIONS_WEBHOOK_URL = process.env.EMAIL_NOTIFICATIONS_WEBHOOK_URL;
const EMAIL_NOTIFICATIONS_WEBHOOK_TOKEN = process.env.EMAIL_NOTIFICATIONS_WEBHOOK_TOKEN;
const WHATSAPP_NOTIFICATIONS_WEBHOOK_URL = process.env.WHATSAPP_NOTIFICATIONS_WEBHOOK_URL;
const WHATSAPP_NOTIFICATIONS_WEBHOOK_TOKEN = process.env.WHATSAPP_NOTIFICATIONS_WEBHOOK_TOKEN;
const FRONTEND_APP_URL = (process.env.FRONTEND_APP_URL || "https://soporte-phidias.onrender.com/app")
    .replace(/\/+$/, "");
const FRONTEND_APP_ORIGIN = (() => {
    try {
        return new URL(FRONTEND_APP_URL).origin;
    } catch (error) {
        return "";
    }
})();
const SUPPORT_NOTIFICATION_EMAILS = (process.env.SUPPORT_NOTIFICATION_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
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
    FRONTEND_APP_ORIGIN,
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
const FRONTEND_DIST_PATH = path.join(__dirname, "soporte-pro", "dist");
const FRONTEND_INDEX_PATH = path.join(FRONTEND_DIST_PATH, "index.html");
const HAS_FRONTEND_BUILD = fs.existsSync(FRONTEND_INDEX_PATH);

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
    const payload = {
        titulo: body.titulo?.trim(),
        descripcion: body.descripcion?.trim(),
        categoria: body.categoria?.trim() || "Software",
        prioridad: body.prioridad?.trim() || "media",
        estado: estado === "proceso" ? "en_proceso" : estado,
        asignado_a: body.asignado_a || null,
    };

    if (body.whatsapp?.trim()) {
        payload.whatsapp = body.whatsapp.trim();
    }

    return payload;
}

function validateTicketPayload(ticket) {
    const missing = [];

    if (!ticket.titulo) missing.push("titulo");
    if (!ticket.descripcion) missing.push("descripcion");
    if (!ticket.categoria) missing.push("categoria");
    if (!ticket.prioridad) missing.push("prioridad");

    return missing;
}

function normalizeEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePhone(value) {
    if (typeof value !== "string") {
        return "";
    }

    const trimmed = value.trim();

    if (!trimmed) {
        return "";
    }

    if (trimmed.startsWith("+")) {
        return `+${trimmed.slice(1).replace(/\D/g, "")}`;
    }

    return trimmed.replace(/\D/g, "");
}

function sanitizeReturnTo(value) {
    if (typeof value !== "string") {
        return "";
    }

    const trimmed = value.trim();

    if (!trimmed.startsWith("/")) {
        return "";
    }

    if (trimmed.startsWith("//")) {
        return "";
    }

    return trimmed;
}

function buildFrontendAccessUrl({ email = "", source = "phidias", returnTo = "" } = {}) {
    const url = new URL(FRONTEND_APP_URL);

    if (email) {
        url.searchParams.set("email", normalizeEmail(email));
    }

    if (source) {
        url.searchParams.set("source", source);
    }

    if (returnTo) {
        url.searchParams.set("returnTo", sanitizeReturnTo(returnTo));
    }

    return url.toString();
}

function formatStatusLabel(status) {
    if (status === "en_proceso") return "en proceso";
    return status || "actualizado";
}

function getTicketWhatsappTarget(ticket) {
    return (
        normalizePhone(ticket?.whatsapp) ||
        normalizePhone(ticket?.telefono) ||
        normalizePhone(ticket?.celular) ||
        normalizePhone(ticket?.phone)
    );
}

async function fetchAssignedProfile(client, assignedUserId) {
    if (!assignedUserId) {
        return null;
    }

    const { data, error } = await client
        .from("usuarios")
        .select("id, email, nombre")
        .eq("id", assignedUserId)
        .maybeSingle();

    if (error) {
        console.error("No se pudo resolver el técnico asignado:", error);
        return null;
    }

    return data || null;
}

async function createInAppNotifications(client, recipients, message) {
    const uniqueRecipients = [...new Set(recipients.map(normalizeEmail).filter(Boolean))];

    if (uniqueRecipients.length === 0) {
        return;
    }

    const rows = uniqueRecipients.map((usuario) => ({
        usuario,
        mensaje: message,
    }));

    const { error } = await client.from("notificaciones").insert(rows);

    if (error) {
        console.error("No se pudo registrar la notificación in-app:", error);
    }
}

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function buildEmailHtml({ title, message, ticket }) {
    return `
        <div style="font-family:Inter,Arial,sans-serif;background:#020617;padding:32px;color:#e2e8f0">
            <div style="max-width:640px;margin:0 auto;border:1px solid rgba(148,163,184,.18);background:rgba(15,23,42,.92);border-radius:24px;padding:28px">
                <div style="display:inline-block;border:1px solid rgba(34,211,238,.25);background:rgba(34,211,238,.12);color:#cffafe;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase">
                    Soporte Pro
                </div>
                <h1 style="margin:20px 0 12px;font-size:28px;line-height:1.2;color:#fff">${escapeHtml(title)}</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#cbd5e1">${escapeHtml(message)}</p>
                <div style="border:1px solid rgba(148,163,184,.16);border-radius:20px;padding:18px;background:rgba(15,23,42,.65)">
                    <p style="margin:0;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#64748b">Ticket</p>
                    <p style="margin:10px 0 0;font-size:18px;font-weight:600;color:#fff">${escapeHtml(ticket.titulo || "Sin título")}</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#94a3b8">ID: ${escapeHtml(ticket.id || "-")}</p>
                    <p style="margin:8px 0 0;font-size:14px;color:#94a3b8">Estado: ${escapeHtml(formatStatusLabel(ticket.estado))}</p>
                </div>
            </div>
        </div>
    `;
}

async function sendViaResend({ to, subject, message, ticket }) {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
        return false;
    }

    const recipients = [...new Set((Array.isArray(to) ? to : [to]).map(normalizeEmail).filter(Boolean))];

    if (recipients.length === 0) {
        return false;
    }

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: RESEND_FROM_EMAIL,
                to: recipients,
                subject,
                html: buildEmailHtml({
                    title: subject,
                    message,
                    ticket,
                }),
                text: `${subject}\n\n${message}\n\nTicket: ${ticket.titulo} (${ticket.id})`,
                ...(RESEND_REPLY_TO ? { reply_to: RESEND_REPLY_TO } : {}),
            }),
        });

        if (!response.ok) {
            const body = await response.text();
            console.error("Falló el envío por Resend:", response.status, body);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error al enviar correo con Resend:", error);
        return false;
    }
}

function buildWhatsAppPayload({ to, message }) {
    if (WHATSAPP_TEMPLATE_NAME) {
        return {
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
                name: WHATSAPP_TEMPLATE_NAME,
                language: {
                    code: WHATSAPP_TEMPLATE_LANGUAGE_CODE,
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            {
                                type: "text",
                                text: message,
                            },
                        ],
                    },
                ],
            },
        };
    }

    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
            preview_url: false,
            body: message,
        },
    };
}

async function sendViaWhatsAppCloud({ to, message }) {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        return false;
    }

    const target = normalizePhone(to);

    if (!target) {
        return false;
    }

    try {
        const response = await fetch(
            `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(
                    buildWhatsAppPayload({
                        to: target,
                        message,
                    })
                ),
            }
        );

        if (!response.ok) {
            const body = await response.text();
            console.error("Falló el envío por WhatsApp Cloud API:", response.status, body);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error al enviar WhatsApp con Cloud API:", error);
        return false;
    }
}

async function postNotificationWebhook(url, token, payload, label) {
    if (!url) {
        return false;
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const body = await response.text();
            console.error(`Falló el webhook de ${label}:`, response.status, body);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`Error al invocar el webhook de ${label}:`, error);
        return false;
    }
}

async function sendEmailNotification(payload) {
    const recipients = [...new Set((Array.isArray(payload.to) ? payload.to : [payload.to]).map(normalizeEmail).filter(Boolean))];

    if (recipients.length === 0) {
        return false;
    }

    const sent = await sendViaResend(payload);

    if (sent) {
        return true;
    }

    return postNotificationWebhook(
        EMAIL_NOTIFICATIONS_WEBHOOK_URL,
        EMAIL_NOTIFICATIONS_WEBHOOK_TOKEN,
        {
            channel: "email",
            ...payload,
            to: recipients,
        },
        "correo"
    );
}

async function sendWhatsAppNotification(payload) {
    const sent = await sendViaWhatsAppCloud(payload);

    if (sent) {
        return true;
    }

    return postNotificationWebhook(
        WHATSAPP_NOTIFICATIONS_WEBHOOK_URL,
        WHATSAPP_NOTIFICATIONS_WEBHOOK_TOKEN,
        {
            channel: "whatsapp",
            ...payload,
        },
        "whatsapp"
    );
}

function buildTicketNotification({
    type,
    ticket,
    previousTicket,
    actorEmail,
    assignedProfile,
}) {
    const requesterEmail = normalizeEmail(ticket?.email);
    const assignedEmail = normalizeEmail(assignedProfile?.email);
    const assignedName =
        assignedProfile?.nombre || assignedProfile?.email || "el equipo de soporte";

    let message = `Tu ticket "${ticket.titulo}" fue actualizado.`;
    let subject = `Actualización de ticket: ${ticket.titulo}`;
    const inAppRecipients = [requesterEmail];
    const emailRecipients = [requesterEmail];

    if (type === "created") {
        message = `Tu ticket "${ticket.titulo}" fue creado y quedó en estado abierto.`;
        subject = `Ticket recibido: ${ticket.titulo}`;
        inAppRecipients.push(...SUPPORT_NOTIFICATION_EMAILS);
    } else if (
        previousTicket &&
        previousTicket.estado !== ticket.estado
    ) {
        message = `Tu ticket "${ticket.titulo}" cambió a ${formatStatusLabel(ticket.estado)}.`;
        subject = `Cambio de estado: ${ticket.titulo}`;
    } else if (
        previousTicket &&
        previousTicket.asignado_a !== ticket.asignado_a
    ) {
        message = ticket.asignado_a
            ? `Tu ticket "${ticket.titulo}" fue asignado a ${assignedName}.`
            : `Tu ticket "${ticket.titulo}" quedó nuevamente sin técnico asignado.`;
        subject = `Cambio de asignación: ${ticket.titulo}`;
    } else if (type === "deleted") {
        message = `Tu ticket "${ticket.titulo}" fue eliminado del sistema.`;
        subject = `Ticket eliminado: ${ticket.titulo}`;
    }

    if (assignedEmail) {
        inAppRecipients.push(assignedEmail);
    }

    return {
        message,
        subject,
        emailRecipients,
        whatsappTarget: getTicketWhatsappTarget(ticket),
        inAppRecipients,
        actorEmail: normalizeEmail(actorEmail),
    };
}

function buildCommentNotification({
    ticket,
    comment,
    actorEmail,
    assignedProfile,
}) {
    const requesterEmail = normalizeEmail(ticket?.email);
    const assignedEmail = normalizeEmail(assignedProfile?.email);
    const normalizedActorEmail = normalizeEmail(actorEmail);
    const requesterIsActor = requesterEmail === normalizedActorEmail;

    const inAppRecipients = [requesterEmail, assignedEmail].filter(
        (email) => email && email !== normalizedActorEmail
    );

    const emailRecipients = requesterIsActor
        ? [assignedEmail].filter(Boolean)
        : [requesterEmail].filter(Boolean);

    return {
        subject: `Nuevo mensaje en ticket: ${ticket.titulo}`,
        message: requesterIsActor
            ? `Se registró un nuevo mensaje del solicitante en el ticket "${ticket.titulo}".`
            : `Hay una nueva respuesta del equipo de soporte en tu ticket "${ticket.titulo}".`,
        preview: comment.mensaje,
        emailRecipients,
        inAppRecipients,
        whatsappTarget: requesterIsActor ? "" : getTicketWhatsappTarget(ticket),
        actorEmail: normalizedActorEmail,
    };
}

async function notifyTicketLifecycle(client, {
    type,
    ticket,
    previousTicket = null,
    actor,
}) {
    const assignedProfile = await fetchAssignedProfile(client, ticket.asignado_a);
    const notification = buildTicketNotification({
        type,
        ticket,
        previousTicket,
        actorEmail: actor?.email,
        assignedProfile,
    });

    await createInAppNotifications(
        client,
        notification.inAppRecipients,
        notification.message
    );

    await sendEmailNotification({
        to: notification.emailRecipients,
        subject: notification.subject,
        message: notification.message,
        ticket,
        previousTicket,
        actorEmail: notification.actorEmail,
    });

    if (notification.whatsappTarget) {
        await sendWhatsAppNotification({
            to: notification.whatsappTarget,
            subject: notification.subject,
            message: notification.message,
            ticket,
            previousTicket,
            actorEmail: notification.actorEmail,
        });
    }
}

async function notifyTicketComment(client, {
    ticket,
    comment,
    actor,
}) {
    const assignedProfile = await fetchAssignedProfile(client, ticket.asignado_a);
    const notification = buildCommentNotification({
        ticket,
        comment,
        actorEmail: actor?.email,
        assignedProfile,
    });

    if (notification.inAppRecipients.length > 0) {
        await createInAppNotifications(
            client,
            notification.inAppRecipients,
            `${notification.message} "${comment.mensaje}"`
        );
    }

    if (notification.emailRecipients.length > 0) {
        await sendEmailNotification({
            to: notification.emailRecipients,
            subject: notification.subject,
            message: `${notification.message}\n\nMensaje: ${notification.preview}`,
            ticket,
            actorEmail: notification.actorEmail,
        });
    }

    if (notification.whatsappTarget) {
        await sendWhatsAppNotification({
            to: notification.whatsappTarget,
            subject: notification.subject,
            message: `${notification.message}\n\n${notification.preview}`,
            ticket,
            actorEmail: notification.actorEmail,
        });
    }
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

function isRequester(ticket, context) {
    return ticket.email?.toLowerCase() === context.user.email?.toLowerCase();
}

function canUpdateTicket(ticket, context) {
    return (
        isAdmin(context.profile) ||
        isTechnician(context.profile) ||
        isRequester(ticket, context)
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

async function insertTicketWithOptionalFields(client, row) {
    let query = client
        .from("tickets")
        .insert([row])
        .select("*")
        .single();

    let result = await query;

    if (
        result.error &&
        row.whatsapp &&
        /whatsapp/i.test(result.error.message || "")
    ) {
        const fallbackRow = { ...row };
        delete fallbackRow.whatsapp;

        result = await client
            .from("tickets")
            .insert([fallbackRow])
            .select("*")
            .single();
    }

    return result;
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
            resendConfigured: Boolean(RESEND_API_KEY && RESEND_FROM_EMAIL),
            whatsappCloudConfigured: Boolean(
                WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID
            ),
            whatsappTemplateConfigured: Boolean(WHATSAPP_TEMPLATE_NAME),
            emailNotificationsWebhook: Boolean(EMAIL_NOTIFICATIONS_WEBHOOK_URL),
            whatsappNotificationsWebhook: Boolean(WHATSAPP_NOTIFICATIONS_WEBHOOK_URL),
            allowedOrigins,
        },
    });
});

app.get(["/phidias/access", "/login-phidias", "/login"], (req, res) => {
    const email = normalizeEmail(req.query.email);
    const returnTo = sanitizeReturnTo(req.query.returnTo);

    return res.redirect(
        buildFrontendAccessUrl({
            email,
            source: "phidias",
            returnTo,
        })
    );
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
        const { data, error } = await insertTicketWithOptionalFields(supabase, {
            ...payload,
            email,
            estado: "abierto",
            created_at: now,
            updated_at: now,
            fecha: now,
        });

        if (error) {
            throw error;
        }

        await notifyTicketLifecycle(supabase, {
            type: "created",
            ticket: data,
            actor: { email },
        });

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

app.post("/tickets/:id/comments", async (req, res) => {
    const context = await getAuthenticatedContext(req);

    if (context.error) {
        return res.status(context.status).json({ message: context.error });
    }

    const ticket = await findTicketById(context.supabase, req.params.id);

    if (!ticket) {
        return res.status(404).json({ message: "Ticket no encontrado." });
    }

    if (!canReadTicket(ticket, context)) {
        return res.status(403).json({ message: "No puedes comentar este ticket." });
    }

    const mensaje = req.body.mensaje?.trim();

    if (!mensaje) {
        return res.status(400).json({ message: "El mensaje es obligatorio." });
    }

    const { data, error } = await context.supabase
        .from("comentarios")
        .insert([
            {
                ticket_id: ticket.id,
                usuario: context.user.email,
                mensaje,
            },
        ])
        .select("*")
        .single();

    if (error) {
        console.error("Error al registrar comentario:", error);
        return res.status(500).json({ message: "No se pudo registrar el comentario." });
    }

    await notifyTicketComment(context.supabase, {
        ticket,
        comment: data,
        actor: context.user,
    });

    return res.status(201).json(data);
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

    const { data, error } = await insertTicketWithOptionalFields(context.supabase, {
        ...payload,
        email,
        created_at: now,
        updated_at: now,
        fecha: now,
    });

    if (error) {
        console.error("Error al crear ticket:", error);
        return res.status(500).json({ message: "No se pudo crear el ticket." });
    }

    await notifyTicketLifecycle(context.supabase, {
        type: "created",
        ticket: data,
        actor: context.user,
    });

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
    const requesterEditableFields = [
        "titulo",
        "descripcion",
        "categoria",
        "prioridad",
    ];
    const staffEditableFields = [
        ...requesterEditableFields,
        "estado",
        "asignado_a",
    ];
    const actorIsStaff = isAdmin(context.profile) || isTechnician(context.profile);
    const allowedFields = actorIsStaff
        ? staffEditableFields
        : requesterEditableFields;

    if (!actorIsStaff) {
        const forbiddenFields = ["estado", "asignado_a"].filter((field) =>
            Object.prototype.hasOwnProperty.call(req.body, field)
        );

        if (forbiddenFields.length > 0) {
            return res.status(403).json({
                message: "Solo el equipo de soporte puede cambiar estado o asignación.",
            });
        }
    }

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

    await notifyTicketLifecycle(context.supabase, {
        type: "updated",
        ticket: data,
        previousTicket: ticket,
        actor: context.user,
    });

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

    await notifyTicketLifecycle(context.supabase, {
        type: "deleted",
        ticket,
        actor: context.user,
    });

    return res.json({ ok: true, id: req.params.id });
});

if (HAS_FRONTEND_BUILD) {
    app.use("/app", express.static(FRONTEND_DIST_PATH));

    app.get("/", (_req, res) => {
        res.redirect("/app");
    });

    app.get("/app", (_req, res) => {
        res.sendFile(FRONTEND_INDEX_PATH);
    });

    app.get("/app/*", (_req, res) => {
        res.sendFile(FRONTEND_INDEX_PATH);
    });
} else {
    app.get("/", (_req, res) => {
        res.redirect("/phidias/access");
    });
}

app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
    console.log(`Origenes permitidos: ${allowedOrigins.join(", ")}`);
    console.log(`Rol de la clave de Supabase: ${SUPABASE_KEY_ROLE}`);
    console.log(`Frontend integrado: ${HAS_FRONTEND_BUILD ? "si" : "no"}`);
});
