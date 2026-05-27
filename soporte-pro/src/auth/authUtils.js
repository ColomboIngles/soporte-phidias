export function normalizeEmail(value) {
    return String(value ?? "").trim().toLowerCase();
}

export function getFriendlyAuthErrorMessage(error) {
    const apiMessage =
        typeof error?.response?.data?.message === "string"
            ? error.response.data.message.trim()
            : "";
    const rawMessage =
        apiMessage ||
        (typeof error?.message === "string" ? error.message.trim() : "");
    const normalized = rawMessage.toLowerCase();

    if (normalized.includes("email rate limit exceeded")) {
        return "Ya se enviaron demasiados enlaces en poco tiempo. Espera unos minutos y vuelve a intentarlo.";
    }

    if (normalized.includes("invalid email")) {
        return "Debes ingresar un correo valido para continuar.";
    }

    if (
        normalized.includes("invalid login credentials") ||
        normalized.includes("invalid_credentials")
    ) {
        return "Correo o contrasena incorrectos. Verifica tus datos e intenta nuevamente.";
    }

    if (normalized.includes("email not confirmed")) {
        return "Debes validar tu correo primero para ingresar con contrasena.";
    }

    if (
        normalized.includes("auth session missing") ||
        normalized.includes("session from session_id claim")
    ) {
        return "El enlace expiro o ya fue usado. Solicita uno nuevo desde el acceso de Phidias.";
    }

    if (normalized.includes("failed to fetch")) {
        return "No se pudo conectar con el servicio de acceso. Revisa tu conexion e intenta nuevamente.";
    }

    return rawMessage || "No se pudo completar la autenticacion.";
}

export function getPasswordValidationError(password, confirmPassword, email = "") {
    if (!password || password.length < 8) {
        return "La contrasena debe tener al menos 8 caracteres.";
    }

    if (password !== confirmPassword) {
        return "Las contrasenas no coinciden.";
    }

    if (normalizeEmail(password) === normalizeEmail(email)) {
        return "Por seguridad, la contrasena no puede ser igual al correo.";
    }

    return "";
}

export function readAuthUrlState() {
    if (typeof window === "undefined") {
        return {
            code: "",
            hasRecoveryToken: false,
            recoveryType: false,
        };
    }

    const url = new URL(window.location.href);
    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    const hashParams = new URLSearchParams(hash);
    const searchType = url.searchParams.get("type");
    const hashType = hashParams.get("type");

    return {
        code: url.searchParams.get("code") || "",
        hasRecoveryToken:
            hashParams.has("access_token") || url.searchParams.has("access_token"),
        recoveryType:
            searchType === "recovery" ||
            hashType === "recovery" ||
            url.searchParams.get("type") === "password_recovery",
    };
}

export function stripAuthTokensFromUrl() {
    if (typeof window === "undefined") {
        return;
    }

    const url = new URL(window.location.href);
    const removable = [
        "code",
        "type",
        "access_token",
        "refresh_token",
        "expires_at",
        "expires_in",
        "token_type",
    ];
    let changed = false;

    removable.forEach((param) => {
        if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            changed = true;
        }
    });

    if (url.hash) {
        const hash = url.hash.toLowerCase();
        if (
            hash.includes("access_token") ||
            hash.includes("refresh_token") ||
            hash.includes("token_type") ||
            hash.includes("type=recovery")
        ) {
            url.hash = "";
            changed = true;
        }
    }

    if (changed) {
        window.history.replaceState({}, document.title, url.toString());
    }
}
