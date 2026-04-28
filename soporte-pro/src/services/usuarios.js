import { supabase } from "./supabase";

function normalizeEmail(value) {
    return String(value ?? "").trim().toLowerCase();
}

async function getUserById(id) {
    const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data || null;
}

async function getUserByEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        return null;
    }

    const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .ilike("email", normalizedEmail)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data || null;
}

export async function crearUsuarioSiNoExiste(user) {
    const existingById = await getUserById(user.id);

    if (existingById) {
        return existingById;
    }

    const existingByEmail = await getUserByEmail(user.email);

    if (existingByEmail) {
        const { data, error } = await supabase
            .from("usuarios")
            .update({
                id: user.id,
                email: normalizeEmail(user.email),
                nombre: existingByEmail.nombre || user.email,
            })
            .eq("id", existingByEmail.id)
            .select("*")
            .maybeSingle();

        if (!error && data) {
            return data;
        }
    }

    try {
        const { data, error } = await supabase
            .from("usuarios")
            .insert([
                {
                    id: user.id,
                    email: normalizeEmail(user.email),
                    nombre: user.email,
                    rol: "usuario",
                },
            ])
            .select("*")
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data || null;
    } catch (error) {
        if (error?.code === "23505") {
            return null;
        }

        throw error;
    }
}

export async function obtenerRol(userId, email = "") {
    try {
        const existingById = await getUserById(userId);

        if (existingById?.rol) {
            return existingById.rol;
        }

        const existingByEmail = await getUserByEmail(email);
        return existingByEmail?.rol || "usuario";
    } catch {
        return "usuario";
    }
}
