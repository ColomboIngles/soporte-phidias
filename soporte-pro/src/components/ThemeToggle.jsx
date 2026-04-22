import { MoonStar, SunMedium } from "lucide-react";
import useTheme from "../hooks/useTheme";

export default function ThemeToggle({ compact = false }) {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`theme-toggle ${compact ? "theme-toggle-compact" : ""}`}
            aria-label={`Activar modo ${isDark ? "claro" : "oscuro"}`}
        >
            <span className="theme-toggle-track">
                <span className="theme-toggle-thumb">
                    {isDark ? (
                        <SunMedium className="h-4 w-4" />
                    ) : (
                        <MoonStar className="h-4 w-4" />
                    )}
                </span>
            </span>

            {!compact ? (
                <span className="theme-toggle-copy">
                    <span className="theme-toggle-label">
                        {isDark ? "Modo noche" : "Modo dia"}
                    </span>
                    <span className="theme-toggle-helper">
                        {isDark
                            ? "Superficies profundas y contraste suave"
                            : "Luz editorial con lectura limpia"}
                    </span>
                </span>
            ) : null}
        </button>
    );
}
