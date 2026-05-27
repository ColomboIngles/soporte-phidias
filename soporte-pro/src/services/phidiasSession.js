const PHIDIAS_SESSION_MODE_KEY = "soporte_phidias_session_mode";
const PHIDIAS_RETURN_TO_KEY = "soporte_phidias_return_to";
const PHIDIAS_REFERRER_KEY = "soporte_phidias_referrer";

function hasBrowserWindow() {
    return typeof window !== "undefined";
}

function removeStoredValue(key) {
    if (!hasBrowserWindow()) {
        return;
    }

    window.localStorage.removeItem(key);
}

export function clearPhidiasAccess() {
    removeStoredValue(PHIDIAS_SESSION_MODE_KEY);
    removeStoredValue(PHIDIAS_RETURN_TO_KEY);
    removeStoredValue(PHIDIAS_REFERRER_KEY);
}
