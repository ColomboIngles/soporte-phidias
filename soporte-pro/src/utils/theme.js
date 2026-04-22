const THEME_STORAGE_KEY = "theme";

export function getStoredTheme() {
    if (typeof window === "undefined") {
        return null;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : null;
}

export function getSystemTheme() {
    if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
        return "dark";
    }

    return "light";
}

export function getInitialTheme() {
    return getStoredTheme() || getSystemTheme();
}

export function applyTheme(theme) {
    if (typeof document === "undefined") {
        return;
    }

    const normalizedTheme = theme === "dark" ? "dark" : "light";
    const root = document.documentElement;

    root.classList.toggle("dark", normalizedTheme === "dark");
    root.dataset.theme = normalizedTheme;
    root.style.colorScheme = normalizedTheme;
}

export function setTheme(theme) {
    const normalizedTheme = theme === "dark" ? "dark" : "light";

    if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    }

    applyTheme(normalizedTheme);

    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent("app-theme-change", {
                detail: { theme: normalizedTheme },
            })
        );
    }
}

export function initializeTheme() {
    applyTheme(getInitialTheme());
}
