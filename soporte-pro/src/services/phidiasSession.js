export const TRUSTED_EMAIL_KEY = "soporte_phidias_trusted_email";
export const PHIDIAS_SESSION_MODE_KEY = "soporte_phidias_session_mode";
export const PHIDIAS_RETURN_TO_KEY = "soporte_phidias_return_to";
export const PHIDIAS_REFERRER_KEY = "soporte_phidias_referrer";
export const MAGIC_LINK_COOLDOWN_KEY =
    "soporte_phidias_magic_link_cooldown_until";
export const AUTH_ACCESS_ERROR_KEY = "soporte_phidias_auth_access_error";
export const AUTH_PENDING_FLOW_KEY = "soporte_phidias_auth_pending_flow";

function hasBrowserWindow() {
    return typeof window !== "undefined";
}

function readStoredString(key) {
    if (!hasBrowserWindow()) {
        return "";
    }

    return window.localStorage.getItem(key) || "";
}

function writeStoredString(key, value) {
    if (!hasBrowserWindow()) {
        return;
    }

    window.localStorage.setItem(key, value);
}

function removeStoredValue(key) {
    if (!hasBrowserWindow()) {
        return;
    }

    window.localStorage.removeItem(key);
}

export function normalizeEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function readAccessContext() {
    if (!hasBrowserWindow()) {
        return {
            email: "",
            source: "",
            returnTo: "",
            flow: "",
        };
    }

    const params = new URLSearchParams(window.location.search);

    return {
        email: normalizeEmail(params.get("email") || ""),
        source: (params.get("source") || "").trim().toLowerCase(),
        returnTo: (params.get("returnTo") || "").trim(),
        flow: (params.get("flow") || "").trim().toLowerCase(),
    };
}

function readAuthParamsFromHash() {
    if (!hasBrowserWindow() || !window.location.hash) {
        return new URLSearchParams();
    }

    const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;

    return new URLSearchParams(hash);
}

function normalizeRequestedAuthFlow(flow) {
    const normalizedFlow = String(flow || "").trim().toLowerCase();

    if (
        normalizedFlow === "recovery" ||
        normalizedFlow === "password_recovery"
    ) {
        return "recovery";
    }

    if (
        normalizedFlow === "create-password" ||
        normalizedFlow === "signup" ||
        normalizedFlow === "invite"
    ) {
        return "create-password";
    }

    if (normalizedFlow === "change-required") {
        return "change-required";
    }

    return "";
}

export function resolveRequestedAuthFlow() {
    const context = readAccessContext();
    const searchParams = hasBrowserWindow()
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const hashParams = readAuthParamsFromHash();
    const urlFlow =
        normalizeRequestedAuthFlow(context.flow) ||
        normalizeRequestedAuthFlow(searchParams.get("type")) ||
        normalizeRequestedAuthFlow(hashParams.get("type"));

    return urlFlow || normalizeRequestedAuthFlow(readPendingAuthFlow());
}

export function clearAccessFlowFromUrl() {
    if (!hasBrowserWindow()) {
        return;
    }

    const url = new URL(window.location.href);

    if (!url.searchParams.has("flow")) {
        return;
    }

    url.searchParams.delete("flow");
    window.history.replaceState({}, document.title, url.toString());
}

export function clearPhidiasAccess() {
    removeStoredValue(TRUSTED_EMAIL_KEY);
    removeStoredValue(PHIDIAS_SESSION_MODE_KEY);
    removeStoredValue(PHIDIAS_RETURN_TO_KEY);
    removeStoredValue(PHIDIAS_REFERRER_KEY);
}

export function readPhidiasSessionMode() {
    return readStoredString(PHIDIAS_SESSION_MODE_KEY) === "1";
}

export function readPhidiasReturnTo() {
    return readStoredString(PHIDIAS_RETURN_TO_KEY);
}

export function readPhidiasReferrer() {
    return readStoredString(PHIDIAS_REFERRER_KEY);
}

export function readPhidiasAccessState() {
    return {
        mode: readPhidiasSessionMode(),
        returnTo: readPhidiasReturnTo(),
        referrer: readPhidiasReferrer(),
    };
}

export function resolveExternalReferrer() {
    if (typeof document === "undefined" || !hasBrowserWindow()) {
        return "";
    }

    const referrer = document.referrer || "";

    if (!referrer || referrer.includes(window.location.origin)) {
        return "";
    }

    return referrer;
}

export function persistPhidiasAccess({ returnTo = "", referrer = "" } = {}) {
    writeStoredString(PHIDIAS_SESSION_MODE_KEY, "1");

    if (returnTo) {
        writeStoredString(PHIDIAS_RETURN_TO_KEY, returnTo);
    }

    if (referrer) {
        writeStoredString(PHIDIAS_REFERRER_KEY, referrer);
    }
}

export function getTrustedEmail() {
    return normalizeEmail(readStoredString(TRUSTED_EMAIL_KEY));
}

export function persistTrustedEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        removeStoredValue(TRUSTED_EMAIL_KEY);
        return "";
    }

    writeStoredString(TRUSTED_EMAIL_KEY, normalizedEmail);
    return normalizedEmail;
}

export function readMagicLinkCooldown() {
    const storedValue = Number(readStoredString(MAGIC_LINK_COOLDOWN_KEY) || 0);

    return Number.isFinite(storedValue) ? storedValue : 0;
}

export function storeMagicLinkCooldown(timestamp) {
    writeStoredString(MAGIC_LINK_COOLDOWN_KEY, String(timestamp));
}

export function clearMagicLinkCooldown() {
    removeStoredValue(MAGIC_LINK_COOLDOWN_KEY);
}

export function readAuthAccessError() {
    return readStoredString(AUTH_ACCESS_ERROR_KEY);
}

export function persistAuthAccessError(message) {
    if (!message) {
        removeStoredValue(AUTH_ACCESS_ERROR_KEY);
        return;
    }

    writeStoredString(AUTH_ACCESS_ERROR_KEY, String(message));
}

export function clearAuthAccessError() {
    removeStoredValue(AUTH_ACCESS_ERROR_KEY);
}

export function readPendingAuthFlow() {
    return readStoredString(AUTH_PENDING_FLOW_KEY);
}

export function persistPendingAuthFlow(flow) {
    if (!flow) {
        removeStoredValue(AUTH_PENDING_FLOW_KEY);
        return;
    }

    writeStoredString(AUTH_PENDING_FLOW_KEY, String(flow));
}

export function clearPendingAuthFlow() {
    removeStoredValue(AUTH_PENDING_FLOW_KEY);
}
