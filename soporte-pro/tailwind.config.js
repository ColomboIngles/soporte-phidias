/** @type {import('tailwindcss').Config} */
import {
    colorTokens,
    fontFamilyTokens,
    letterSpacingTokens,
    radiusTokens,
    shadowTokens,
    spacingTokens,
    zIndexTokens,
} from "./src/styles/tokens.js";

export default {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: colorTokens,
            fontFamily: fontFamilyTokens,
            spacing: spacingTokens,
            borderRadius: radiusTokens,
            boxShadow: shadowTokens,
            zIndex: zIndexTokens,
            letterSpacing: letterSpacingTokens,
        },
    },
    plugins: [],
};
