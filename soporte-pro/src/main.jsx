import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeTheme } from "./utils/theme";
import escudo from "./assets/branding/escudo.png";

initializeTheme();

if (typeof document !== "undefined") {
    document.title = "Sistema Soporte Técnico";

    let icon =
        document.querySelector("link[rel='icon']") ||
        document.createElement("link");

    icon.setAttribute("rel", "icon");
    icon.setAttribute("type", "image/png");
    icon.setAttribute("href", escudo);

    if (!icon.parentNode) {
        document.head.appendChild(icon);
    }
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
