import axios from "axios";
import { supabase } from "./supabase";

const fallbackApiUrl = "https://soporte-phidias.onrender.com";
const baseURL = (import.meta.env.VITE_API_URL || fallbackApiUrl).replace(/\/+$/, "");

const API = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
});

API.interceptors.request.use(async (config) => {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
});

export default API;
