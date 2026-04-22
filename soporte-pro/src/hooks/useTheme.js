import { useEffect, useState } from "react";
import {
    getInitialTheme,
    setTheme as persistTheme,
} from "../utils/theme";

export default function useTheme() {
    const [theme, setThemeState] = useState(getInitialTheme);

    useEffect(() => {
        function syncTheme(event) {
            setThemeState(event.detail?.theme || getInitialTheme());
        }

        window.addEventListener("app-theme-change", syncTheme);

        return () => {
            window.removeEventListener("app-theme-change", syncTheme);
        };
    }, []);

    function setTheme(nextTheme) {
        persistTheme(nextTheme);
        setThemeState(nextTheme === "dark" ? "dark" : "light");
    }

    function toggleTheme() {
        setTheme(theme === "dark" ? "light" : "dark");
    }

    return {
        theme,
        isDark: theme === "dark",
        setTheme,
        toggleTheme,
    };
}
