const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 10000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
const SUPPORT_ALLOWED_EMAIL_DOMAINS = (process.env.SUPPORT_ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
const PASSWORD_ACTIVATION_TOKEN_TTL_HOURS = Math.min(
    24,
    Math.max(0.5, Number(process.env.PASSWORD_ACTIVATION_TOKEN_TTL_HOURS || 24))
);
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
const SUPABASE_ADMIN_KEY = SUPABASE_SERVICE_ROLE_KEY ||
    (SUPABASE_KEY_ROLE === "service_role" ? SUPABASE_KEY : "");
const SUPABASE_ADMIN_KEY_ROLE = (() => {
    try {
        if (!SUPABASE_ADMIN_KEY) {
            return "missing";
        }

        const payload = SUPABASE_ADMIN_KEY.split(".")[1];
        return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role;
    } catch (error) {
        return "unknown";
    }
})();
const WEBHOOK_ENABLED = Boolean(WEBHOOK_SECRET) && SUPABASE_ADMIN_KEY_ROLE === "service_role";
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
const adminSupabase = SUPABASE_ADMIN_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ADMIN_KEY)
    : null;
const hasSupabaseAdmin = SUPABASE_ADMIN_KEY_ROLE === "service_role";
const passwordLinkRequests = new Map();
const PASSWORD_LINK_COOLDOWN_MS = 90 * 1000;

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

function getEmailDomain(email) {
    return normalizeEmail(email).split("@")[1] || "";
}

function isAllowedSupportEmail(email) {
    if (SUPPORT_ALLOWED_EMAIL_DOMAINS.length === 0) {
        return true;
    }

    return SUPPORT_ALLOWED_EMAIL_DOMAINS.includes(getEmailDomain(email));
}

function normalizeRole(value) {
    const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

    if (["admin", "tecnico", "usuario"].includes(normalized)) {
        return normalized;
    }

    return "usuario";
}

function createTemporaryPassword() {
    return crypto.randomBytes(24).toString("base64url");
}

function createPasswordActivationToken() {
    return crypto.randomBytes(32).toString("base64url");
}

function hashPasswordActivationToken(token) {
    return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function getErrorMessage(error) {
    return error?.message || error?.error_description || String(error);
}

function isMissingPasswordActivationTableError(error) {
    const message = getErrorMessage(error).toLowerCase();

    return message.includes("password_activation_tokens") &&
        (message.includes("schema cache") ||
            message.includes("could not find the table") ||
            message.includes("does not exist"));
}

function getPasswordActivationPublicError(error, fallback) {
    if (isMissingPasswordActivationTableError(error)) {
        return "La activacion de contrasena aun no esta configurada en la base de datos. Contacta al administrador del sistema.";
    }

    return error.message || fallback;
}

function pickUserProfilePayload(body = {}) {
    const email = normalizeEmail(body.email);
    const nombre = typeof body.nombre === "string" && body.nombre.trim()
        ? body.nombre.trim()
        : email;

    return {
        id: body.id || null,
        email,
        nombre,
        rol: normalizeRole(body.rol),
    };
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

function buildFrontendUrl(pathname = "/", params = {}) {
    const basePath = new URL(FRONTEND_APP_URL).pathname.replace(/\/+$/, "");
    const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const url = new URL(FRONTEND_APP_URL);

    url.pathname = `${basePath}${cleanPath}`.replace(/\/{2,}/g, "/");

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            url.searchParams.set(key, String(value));
        }
    });

    return url.toString();
}

function buildFrontendAccessUrl({
    email = "",
    source = "phidias",
    returnTo = "",
} = {}) {
    const params = {};

    if (email) {
        params.email = normalizeEmail(email);
    }

    if (source) {
        params.source = source;
    }

    if (returnTo) {
        params.returnTo = sanitizeReturnTo(returnTo);
    }

    return buildFrontendUrl("/phidias/access", params);
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

function buildPasswordAccessEmailHtml({ title, message, actionLink, expiresAt }) {
    const expirationText = expiresAt
        ? `Este enlace vence el ${new Date(expiresAt).toLocaleString("es-CO", {
            timeZone: "America/Bogota",
            dateStyle: "medium",
            timeStyle: "short",
        })}.`
        : "Este enlace es de un solo uso.";

    return `
        <div style="font-family:Inter,Arial,sans-serif;background:#f7f4ee;padding:32px;color:#24342d">
            <div style="max-width:640px;margin:0 auto;border:1px solid #e8dccb;background:#fffdf8;border-radius:24px;padding:28px">
                <div style="display:inline-block;border:1px solid #d7c8b4;background:#f3ede3;color:#315a49;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase">
                    Soporte Tecnico
                </div>
                <h1 style="margin:20px 0 12px;font-size:28px;line-height:1.2;color:#1f2d27">${escapeHtml(title)}</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#66746d">${escapeHtml(message)}</p>
                <a href="${escapeHtml(actionLink)}" style="display:inline-block;background:#1f5c46;color:#fff;text-decoration:none;border-radius:14px;padding:14px 22px;font-weight:700">
                    Crear o cambiar contrasena
                </a>
                <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#66746d">${escapeHtml(expirationText)}</p>
                <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#8b958f">
                    Si el boton no abre, copia y pega este enlace en tu navegador:<br>
                    <span style="word-break:break-all">${escapeHtml(actionLink)}</span>
                </p>
            </div>
        </div>
    `;
}

async function sendPasswordAccessEmail({ to, actionLink, expiresAt }) {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
        return false;
    }

    const recipient = normalizeEmail(to);

    if (!recipient || !actionLink) {
        return false;
    }

    const subject = "Crea o recupera tu contrasena del sistema de soporte";
    const message = "Usa este enlace seguro de un solo uso para definir tu contrasena personal e ingresar al sistema de soporte desde cualquier navegador o dispositivo.";

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: RESEND_FROM_EMAIL,
                to: [recipient],
                subject,
                html: buildPasswordAccessEmailHtml({
                    title: subject,
                    message,
                    actionLink,
                    expiresAt,
                }),
                text: `${subject}\n\n${message}\n\n${expiresAt ? `Vence: ${expiresAt}\n\n` : ""}${actionLink}`,
                ...(RESEND_REPLY_TO ? { reply_to: RESEND_REPLY_TO } : {}),
            }),
        });

        if (!response.ok) {
            const body = await response.text();
            console.error(
                "Fallo el envio del enlace de contrasena por Resend:",
                response.status,
                body
            );
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error al enviar enlace de contrasena con Resend:", error);
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

async function getAdminContext(req, res) {
    const context = await getAuthenticatedContext(req);

    if (context.error) {
        res.status(context.status).json({ message: context.error });
        return null;
    }

    if (!isAdmin(context.profile)) {
        res.status(403).json({ message: "Solo admin puede gestionar usuarios." });
        return null;
    }

    if (!hasSupabaseAdmin) {
        res.status(503).json({
            message:
                "La gestion segura de usuarios requiere SUPABASE_SERVICE_ROLE_KEY con rol service_role en el servidor.",
        });
        return null;
    }

    return context;
}

async function findAuthUserByEmail(email) {
    const targetEmail = normalizeEmail(email);
    let page = 1;
    const perPage = 1000;

    while (page <= 100) {
        const { data, error } = await adminSupabase.auth.admin.listUsers({
            page,
            perPage,
        });

        if (error) {
            throw error;
        }

        const users = data?.users || [];
        const foundUser = users.find(
            (user) => normalizeEmail(user.email) === targetEmail
        );

        if (foundUser) {
            return foundUser;
        }

        if (users.length < perPage) {
            return null;
        }

        page += 1;
    }

    return null;
}

async function findUsuarioByIdOrEmail({ id, email }) {
    const normalizedEmail = normalizeEmail(email);

    if (id) {
        const { data } = await adminSupabase
            .from("usuarios")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (data) {
            return data;
        }
    }

    if (!normalizedEmail) {
        return null;
    }

    const { data, error } = await adminSupabase
        .from("usuarios")
        .select("*")
        .ilike("email", normalizedEmail)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data || null;
}

function getPasswordLinkRequestKey(req, email) {
    const forwardedFor = req.headers["x-forwarded-for"];
    const ip = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : String(forwardedFor || req.ip || "").split(",")[0].trim();

    return `${normalizeEmail(email)}:${ip}`;
}

function assertPasswordLinkCooldown(req, email) {
    const key = getPasswordLinkRequestKey(req, email);
    const now = Date.now();
    const previousRequestAt = passwordLinkRequests.get(key) || 0;
    const elapsed = now - previousRequestAt;

    if (elapsed < PASSWORD_LINK_COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil(
            (PASSWORD_LINK_COOLDOWN_MS - elapsed) / 1000
        );
        const error = new Error(
            `Espera ${retryAfterSeconds}s antes de solicitar otro enlace.`
        );
        error.status = 429;
        throw error;
    }

    passwordLinkRequests.set(key, now);
}

async function sendPasswordSetupLink({
    email,
    source = "phidias",
}) {
    const normalizedEmail = normalizeEmail(email);
    const existingProfile = await findUsuarioByIdOrEmail({
        email: normalizedEmail,
    });

    if (!existingProfile) {
        const error = new Error(
            "Este correo no esta registrado en el sistema de soporte."
        );
        error.status = 404;
        throw error;
    }

    if (!isAllowedSupportEmail(normalizedEmail)) {
        const error = new Error("Este dominio de correo no esta autorizado.");
        error.status = 403;
        throw error;
    }

    if (!userIsEnabled(existingProfile)) {
        const error = new Error("Este correo no esta habilitado para acceder.");
        error.status = 403;
        throw error;
    }

    const managedProfile = await upsertManagedUsuario(existingProfile, {
        requirePasswordChange: true,
    });

    const token = createPasswordActivationToken();
    const tokenHash = hashPasswordActivationToken(token);
    const expiresAt = new Date(
        Date.now() + PASSWORD_ACTIVATION_TOKEN_TTL_HOURS * 60 * 60 * 1000
    ).toISOString();
    const actionLink = buildFrontendUrl("/set-password", { token });

    await adminSupabase
        .from("password_activation_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("user_id", managedProfile.id)
        .is("used_at", null);

    const { data: tokenRow, error: tokenError } = await adminSupabase
        .from("password_activation_tokens")
        .insert([
            {
                user_id: managedProfile.id,
                email: normalizedEmail,
                token_hash: tokenHash,
                source: source || "phidias",
                expires_at: expiresAt,
            },
        ])
        .select("id")
        .single();

    if (tokenError) {
        throw tokenError;
    }

    const sent = await sendPasswordAccessEmail({
        to: normalizedEmail,
        actionLink,
        expiresAt,
    });

    if (!sent) {
        await adminSupabase
            .from("password_activation_tokens")
            .update({ used_at: new Date().toISOString() })
            .eq("id", tokenRow.id);

        throw new Error(
            "No se pudo enviar el correo con el enlace seguro de contrasena."
        );
    }

    return {
        email: normalizedEmail,
        expiresAt,
    };
}

async function getValidPasswordActivationToken(token) {
    const tokenHash = hashPasswordActivationToken(token);

    if (!token || !tokenHash) {
        const error = new Error(
            "El enlace de activacion ya expiro o fue utilizado anteriormente. Solicita uno nuevo desde Phidias para continuar."
        );
        error.status = 400;
        throw error;
    }

    const { data, error } = await adminSupabase
        .from("password_activation_tokens")
        .select("id, user_id, email, expires_at, used_at")
        .eq("token_hash", tokenHash)
        .maybeSingle();

    if (error) {
        throw error;
    }

    const now = new Date();
    const expired = data?.expires_at
        ? new Date(data.expires_at).getTime() <= now.getTime()
        : true;

    if (!data || data.used_at || expired) {
        const invalidError = new Error(
            "El enlace de activacion ya expiro o fue utilizado anteriormente. Solicita uno nuevo desde Phidias para continuar."
        );
        invalidError.status = 410;
        throw invalidError;
    }

    const profile = await findUsuarioByIdOrEmail({
        id: data.user_id,
        email: data.email,
    });

    if (!profile || !userIsEnabled(profile)) {
        const accessError = new Error("Tu correo no esta autorizado para acceder.");
        accessError.status = 403;
        throw accessError;
    }

    return {
        token: data,
        profile,
    };
}

async function completePasswordActivation({ token, password }) {
    const { token: tokenRow, profile } = await getValidPasswordActivationToken(token);
    const normalizedEmail = normalizeEmail(profile.email || tokenRow.email);

    if (!password || password.length < 8) {
        const error = new Error("La contrasena debe tener al menos 8 caracteres.");
        error.status = 400;
        throw error;
    }

    if (normalizeEmail(password) === normalizedEmail) {
        const error = new Error(
            "Por seguridad, la nueva contrasena no puede ser igual al correo."
        );
        error.status = 400;
        throw error;
    }

    const now = new Date().toISOString();
    const { data: consumedToken, error: consumeError } = await adminSupabase
        .from("password_activation_tokens")
        .update({ used_at: now })
        .eq("id", tokenRow.id)
        .is("used_at", null)
        .gt("expires_at", now)
        .select("id")
        .maybeSingle();

    if (consumeError) {
        throw consumeError;
    }

    if (!consumedToken) {
        const error = new Error(
            "El enlace de activacion ya expiro o fue utilizado anteriormente. Solicita uno nuevo desde Phidias para continuar."
        );
        error.status = 410;
        throw error;
    }

    const { error: authError } = await adminSupabase.auth.admin.updateUserById(
        tokenRow.user_id,
        {
            password,
            email_confirm: true,
        }
    );

    if (authError) {
        throw authError;
    }

    const { data: updatedProfile, error: profileError } = await adminSupabase
        .from("usuarios")
        .update({
            requiere_cambio_contrasena: false,
            contrasena_actualizada_en: now,
        })
        .eq("id", tokenRow.user_id)
        .select("*")
        .maybeSingle();

    if (profileError) {
        throw profileError;
    }

    await adminSupabase
        .from("password_activation_tokens")
        .update({ used_at: now })
        .eq("user_id", tokenRow.user_id)
        .is("used_at", null);

    return {
        email: normalizedEmail,
        profile: updatedProfile,
    };
}

function userNeedsPasswordSetup(profile) {
    return Boolean(profile?.requiere_cambio_contrasena) ||
        !profile?.contrasena_actualizada_en;
}

function userIsEnabled(profile) {
    if (!profile || !Object.prototype.hasOwnProperty.call(profile, "habilitado")) {
        return true;
    }

    return profile.habilitado !== false;
}

async function updateUserReferences(previousId, nextId) {
    if (!previousId || !nextId || previousId === nextId) {
        return;
    }

    const ticketReferenceUpdates = [
        adminSupabase
            .from("tickets")
            .update({ asignado_a: nextId })
            .eq("asignado_a", previousId),
        adminSupabase
            .from("tickets")
            .update({ asignado_por: nextId })
            .eq("asignado_por", previousId),
    ];

    const results = await Promise.allSettled(ticketReferenceUpdates);

    results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.error) {
            console.warn(
                "No se pudo actualizar una referencia de usuario:",
                result.value.error.message
            );
        }
    });
}

async function saveManagedProfile(previousId, nextId, profileRow) {
    if (previousId && previousId !== nextId) {
        const { data, error } = await adminSupabase
            .from("usuarios")
            .update({
                ...profileRow,
                id: nextId,
            })
            .eq("id", previousId)
            .select("*")
            .single();

        if (!error) {
            return data;
        }

        console.warn(
            "No se pudo migrar el id del perfil, se intentara upsert:",
            getErrorMessage(error)
        );
    }

    const { data, error } = await adminSupabase
        .from("usuarios")
        .upsert([profileRow], { onConflict: "id" })
        .select("*")
        .single();

    if (error) {
        throw error;
    }

    return data;
}

async function ensureAuthUserForProfile(profile, { requirePasswordChange = true } = {}) {
    const email = normalizeEmail(profile.email);

    if (!email) {
        throw new Error("El email del usuario es obligatorio.");
    }

    let existingAuthUser = null;

    if (profile.id) {
        const { data, error } = await adminSupabase.auth.admin.getUserById(profile.id);

        if (!error && data?.user) {
            existingAuthUser = data.user;
        }
    }

    if (!existingAuthUser) {
        existingAuthUser = await findAuthUserByEmail(email);
    }

    if (existingAuthUser) {
        const { data, error } = await adminSupabase.auth.admin.updateUserById(
            existingAuthUser.id,
            {
                email,
                email_confirm: true,
                user_metadata: {
                    nombre: profile.nombre || email,
                    rol: normalizeRole(profile.rol),
                },
            }
        );

        if (error) {
            throw error;
        }

        return data.user;
    }

    const { data, error } = await adminSupabase.auth.admin.createUser({
        email,
        password: createTemporaryPassword(),
        email_confirm: true,
        user_metadata: {
            nombre: profile.nombre || email,
            rol: normalizeRole(profile.rol),
            requirePasswordChange,
        },
    });

    if (error) {
        throw error;
    }

    return data.user;
}

async function upsertManagedUsuario(body, { requirePasswordChange = true } = {}) {
    const payload = pickUserProfilePayload(body);
    const authUser = await ensureAuthUserForProfile(payload, {
        requirePasswordChange,
    });
    const existingProfile = await findUsuarioByIdOrEmail({
        id: payload.id,
        email: payload.email,
    });
    const previousId = existingProfile?.id;
    const profileRow = {
        id: authUser.id,
        email: payload.email,
        nombre: payload.nombre,
        rol: payload.rol,
        requiere_cambio_contrasena: requirePasswordChange,
    };

    if (requirePasswordChange) {
        profileRow.contrasena_temporal_establecida_en = new Date().toISOString();
    }

    if (previousId && previousId !== authUser.id) {
        await updateUserReferences(previousId, authUser.id);
    }

    return saveManagedProfile(previousId, authUser.id, profileRow);
}

async function upsertManagedUsuarios(users, options = {}) {
    const managedUsers = [];
    const errors = [];

    for (const user of users) {
        try {
            managedUsers.push(await upsertManagedUsuario(user, options));
        } catch (error) {
            errors.push({
                email: normalizeEmail(user?.email),
                id: user?.id || null,
                message: getErrorMessage(error),
            });
        }
    }

    return {
        managedUsers,
        errors,
    };
}

async function markPasswordChangeComplete(client, user) {
    const targetClient = hasSupabaseAdmin ? adminSupabase : client;
    const { data, error } = await targetClient
        .from("usuarios")
        .update({
            requiere_cambio_contrasena: false,
            contrasena_actualizada_en: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select("*")
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data || null;
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
            supabaseAdminKeyRole: SUPABASE_ADMIN_KEY_ROLE,
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

app.get(["/phidias/access", "/login-phidias"], (req, res) => {
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

app.get("/login", (req, res) => {
    const email = normalizeEmail(req.query.email);

    return res.redirect(
        buildFrontendUrl("/login", email ? { email } : {})
    );
});

app.get("/set-password", (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";

    return res.redirect(buildFrontendUrl("/set-password", token ? { token } : {}));
});

app.post("/auth/lookup", async (req, res) => {
    try {
        if (!hasSupabaseAdmin) {
            return res.status(503).json({
                message:
                    "La validacion de acceso requiere SUPABASE_SERVICE_ROLE_KEY configurada.",
            });
        }

        const email = normalizeEmail(req.body.email);

        if (!email) {
            return res.status(400).json({
                message: "Debes ingresar un correo valido.",
            });
        }

        if (!isAllowedSupportEmail(email)) {
            return res.status(403).json({
                authorized: false,
                message: "Este dominio de correo no esta autorizado.",
            });
        }

        const profile = await findUsuarioByIdOrEmail({ email });

        if (!profile) {
            return res.status(404).json({
                authorized: false,
                message: "Tu correo no esta autorizado para acceder.",
            });
        }

        if (!userIsEnabled(profile)) {
            return res.status(403).json({
                authorized: false,
                message: "Tu correo no esta habilitado para acceder.",
            });
        }

        const authUser = await findAuthUserByEmail(email);

        if (!authUser) {
            await upsertManagedUsuario(profile, {
                requirePasswordChange: true,
            });
        }

        return res.json({
            authorized: true,
            email,
            nombre: profile.nombre || email,
            rol: normalizeRole(profile.rol),
            needsPasswordSetup: userNeedsPasswordSetup(profile) || !authUser,
        });
    } catch (error) {
        console.error("Error al validar correo de soporte:", error);
        return res.status(error.status || 500).json({
            message: error.message || "No se pudo validar el correo.",
        });
    }
});

app.post("/auth/request-password-link", async (req, res) => {
    try {
        if (!hasSupabaseAdmin) {
            return res.status(503).json({
                message:
                    "El envio seguro de enlaces requiere SUPABASE_SERVICE_ROLE_KEY configurada.",
            });
        }

        const email = normalizeEmail(req.body.email);

        if (!email) {
            return res.status(400).json({
                message: "Debes ingresar un correo valido.",
            });
        }

        assertPasswordLinkCooldown(req, email);

        const result = await sendPasswordSetupLink({
            email,
            source: req.body.source || "phidias",
            returnTo: sanitizeReturnTo(req.body.returnTo),
        });

        return res.json({
            ok: true,
            email: result.email,
        });
    } catch (error) {
        console.error("Error al enviar enlace seguro de contrasena:", error);
        return res.status(error.status || 500).json({
            message: getPasswordActivationPublicError(
                error,
                "No se pudo enviar el enlace seguro de contrasena."
            ),
        });
    }
});

app.get("/auth/password-token", async (req, res) => {
    try {
        if (!hasSupabaseAdmin) {
            return res.status(503).json({
                message:
                    "La validacion del enlace requiere SUPABASE_SERVICE_ROLE_KEY configurada.",
            });
        }

        const { token, profile } = await getValidPasswordActivationToken(
            req.query.token
        );

        return res.json({
            ok: true,
            email: normalizeEmail(profile.email || token.email),
            expiresAt: token.expires_at,
        });
    } catch (error) {
        console.error("Error al validar token de activacion:", error);
        return res.status(error.status || 500).json({
            message: getPasswordActivationPublicError(
                error,
                "No se pudo validar el enlace de activacion."
            ),
        });
    }
});

app.post("/auth/password-token/complete", async (req, res) => {
    try {
        if (!hasSupabaseAdmin) {
            return res.status(503).json({
                message:
                    "La activacion de contrasena requiere SUPABASE_SERVICE_ROLE_KEY configurada.",
            });
        }

        const result = await completePasswordActivation({
            token: req.body.token,
            password: req.body.password,
        });

        return res.json({
            ok: true,
            email: result.email,
        });
    } catch (error) {
        console.error("Error al completar activacion de contrasena:", error);
        return res.status(error.status || 500).json({
            message: getPasswordActivationPublicError(
                error,
                "No se pudo completar la activacion de contrasena."
            ),
        });
    }
});

app.post("/auth/password-change-complete", async (req, res) => {
    try {
        const context = await getAuthenticatedContext(req);

        if (context.error) {
            return res.status(context.status).json({ message: context.error });
        }

        const profile = await markPasswordChangeComplete(
            context.supabase,
            context.user
        );

        return res.json({ ok: true, profile });
    } catch (error) {
        console.error("Error al marcar cambio de contrasena:", error);
        return res.status(500).json({
            message:
                "La contrasena fue actualizada, pero no se pudo cerrar el estado de cambio obligatorio.",
        });
    }
});

app.post("/admin/users", async (req, res) => {
    try {
        const context = await getAdminContext(req, res);

        if (!context) {
            return;
        }

        const user = await upsertManagedUsuario(req.body, {
            requirePasswordChange: true,
        });

        return res.status(201).json(user);
    } catch (error) {
        console.error("Error al crear usuario administrado:", error);
        return res.status(500).json({
            message: error.message || "No se pudo crear el usuario.",
        });
    }
});

app.put("/admin/users/:id", async (req, res) => {
    try {
        const context = await getAdminContext(req, res);

        if (!context) {
            return;
        }

        const user = await upsertManagedUsuario(
            {
                ...req.body,
                id: req.params.id,
            },
            {
                requirePasswordChange:
                    req.body.requiere_cambio_contrasena !== false,
            }
        );

        return res.json(user);
    } catch (error) {
        console.error("Error al actualizar usuario administrado:", error);
        return res.status(500).json({
            message: error.message || "No se pudo actualizar el usuario.",
        });
    }
});

app.delete("/admin/users/:id", async (req, res) => {
    try {
        const context = await getAdminContext(req, res);

        if (!context) {
            return;
        }

        if (req.params.id === context.user.id) {
            return res.status(400).json({
                message:
                    "No puedes eliminar tu propia cuenta mientras estas usando el sistema.",
            });
        }

        await adminSupabase.auth.admin.deleteUser(req.params.id).catch((error) => {
            console.warn("No se pudo eliminar el usuario en Auth:", error.message);
        });

        const { error } = await adminSupabase
            .from("usuarios")
            .delete()
            .eq("id", req.params.id);

        if (error) {
            throw error;
        }

        return res.json({ ok: true, id: req.params.id });
    } catch (error) {
        console.error("Error al eliminar usuario administrado:", error);
        return res.status(500).json({
            message: error.message || "No se pudo eliminar el usuario.",
        });
    }
});

app.post("/admin/users/bulk", async (req, res) => {
    try {
        const context = await getAdminContext(req, res);

        if (!context) {
            return;
        }

        const users = Array.isArray(req.body.users) ? req.body.users : [];

        if (users.length === 0) {
            return res.json({ users: [] });
        }

        const { managedUsers, errors } = await upsertManagedUsuarios(users, {
            requirePasswordChange: true,
        });

        if (errors.length > 0 && managedUsers.length === 0) {
            return res.status(500).json({
                message: "No se pudo procesar ningun usuario.",
                errors,
            });
        }

        return res.json({ users: managedUsers, errors });
    } catch (error) {
        console.error("Error en carga masiva de usuarios administrados:", error);
        return res.status(500).json({
            message: error.message || "No se pudo procesar la carga masiva.",
        });
    }
});

app.post("/admin/users/bootstrap-password-change", async (req, res) => {
    try {
        const context = await getAdminContext(req, res);

        if (!context) {
            return;
        }

        const { data: usuarios, error } = await adminSupabase
            .from("usuarios")
            .select("id, email, nombre, rol")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        const { managedUsers, errors } = await upsertManagedUsuarios(
            usuarios || [],
            {
                requirePasswordChange: true,
            }
        );

        if (errors.length > 0 && managedUsers.length === 0) {
            return res.status(500).json({
                message: "No se pudo preparar ningun acceso.",
                processed: 0,
                failed: errors.length,
                errors,
            });
        }

        return res.json({
            ok: errors.length === 0,
            processed: managedUsers.length,
            failed: errors.length,
            errors,
            users: managedUsers,
        });
    } catch (error) {
        console.error("Error al preparar cambio obligatorio de contrasena:", error);
        return res.status(500).json({
            message:
                error.message ||
                "No se pudo preparar el cambio obligatorio de contrasena.",
        });
    }
});

app.get("/admin/users/access-readiness", async (req, res) => {
    try {
        const context = await getAdminContext(req, res);

        if (!context) {
            return;
        }

        const { data: usuarios, error } = await adminSupabase
            .from("usuarios")
            .select(
                "id, email, nombre, rol, requiere_cambio_contrasena, contrasena_actualizada_en"
            )
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        const authUsersByEmail = new Map();
        let page = 1;
        const perPage = 1000;

        while (page <= 100) {
            const { data, error: authError } =
                await adminSupabase.auth.admin.listUsers({
                    page,
                    perPage,
                });

            if (authError) {
                throw authError;
            }

            const authUsers = data?.users || [];

            authUsers.forEach((user) => {
                authUsersByEmail.set(normalizeEmail(user.email), user);
            });

            if (authUsers.length < perPage) {
                break;
            }

            page += 1;
        }

        const readiness = (usuarios || []).map((usuario) => {
            const authUser = authUsersByEmail.get(normalizeEmail(usuario.email));

            return {
                id: usuario.id,
                email: usuario.email,
                nombre: usuario.nombre,
                rol: usuario.rol,
                authUserId: authUser?.id || null,
                authExists: Boolean(authUser),
                idMatchesAuth: authUser ? authUser.id === usuario.id : false,
                requiereCambioContrasena: Boolean(
                    usuario.requiere_cambio_contrasena
                ),
                contrasenaActualizadaEn: usuario.contrasena_actualizada_en,
            };
        });

        return res.json({
            total: readiness.length,
            ready: readiness.filter((item) => item.authExists).length,
            missing: readiness.filter((item) => !item.authExists),
            mismatched: readiness.filter(
                (item) => item.authExists && !item.idMatchesAuth
            ),
            users: readiness,
        });
    } catch (error) {
        console.error("Error al diagnosticar accesos de usuarios:", error);
        return res.status(500).json({
            message:
                error.message || "No se pudo diagnosticar el estado de accesos.",
        });
    }
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
