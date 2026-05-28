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
        return "El enlace de activacion ya expiro o fue utilizado anteriormente. Solicita uno nuevo desde Phidias para continuar.";
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
