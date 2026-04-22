import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function manualChunks(id) {
    if (!id.includes("node_modules")) {
        return undefined;
    }

    if (id.includes("recharts")) {
        return "charts";
    }

    if (id.includes("@hello-pangea")) {
        return "kanban-dnd";
    }

    if (id.includes("framer-motion")) {
        return "motion";
    }

    if (id.includes("@supabase") || id.includes("axios")) {
        return "data";
    }

    if (id.includes("react-router-dom")) {
        return "router";
    }

    if (id.includes("lucide-react")) {
        return "icons";
    }

    return "vendor";
}

export default defineConfig({
    plugins: [react()],
    build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks,
            },
        },
    },
});
