import { supabase } from "./supabase";

function normalizeEmail(value) {
    return String(value ?? "").trim().toLowerCase();
}

const ROLE_PRIORITY = {
    admin: 3,
    tecnico: 2,
    usuario: 1,
};

function normalizeRole(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return ROLE_PRIORITY[normalized] ? normalized : "usuario";
}

function pickPreferredUser(...users) {
    return users
        .filter(Boolean)
        .sort((left, right) => {
            const byRole =
                (ROLE_PRIORITY[normalizeRole(right?.rol)] || 0) -
                (ROLE_PRIORITY[normalizeRole(left?.rol)] || 0);

            if (byRole !== 0) {
                return byRole;
            }

            const leftCreated = new Date(left?.created_at || 0).getTime();
            const rightCreated = new Date(right?.created_at || 0).getTime();
            return rightCreated - leftCreated;
        })[0] || null;
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

async function getCurrentUserRoleFromRpc() {
    const { data, error } = await supabase.rpc("current_user_role");

    if (error) {
        throw error;
    }

    return normalizeRole(data);
}

export async function crearUsuarioSiNoExiste(
    user,
    { allowCreateIfMissing = true } = {}
) {
    const normalizedEmail = normalizeEmail(user.email);
    const existingById = await getUserById(user.id);
    const existingByEmail = await getUserByEmail(normalizedEmail);
    const preferredUser = pickPreferredUser(existingById, existingByEmail);

    if (existingById) {
        const nextRole = normalizeRole(preferredUser?.rol || existingById.rol);
        const nextNombre =
            preferredUser?.nombre || existingById.nombre || normalizedEmail;
        const nextEmail = normalizedEmail || normalizeEmail(existingById.email);

        const needsSync =
            normalizeRole(existingById.rol) !== nextRole ||
            normalizeEmail(existingById.email) !== nextEmail ||
            (existingById.nombre || "") !== (nextNombre || "");

        if (!needsSync) {
            return {
                ...existingById,
                rol: nextRole,
                email: nextEmail,
                nombre: nextNombre,
            };
        }

        const { data, error } = await supabase
            .from("usuarios")
            .update({
                email: nextEmail,
                nombre: nextNombre,
                rol: nextRole,
            })
            .eq("id", existingById.id)
            .select("*")
            .maybeSingle();

        if (!error && data) {
            return data;
        }

        return {
            ...existingById,
            rol: nextRole,
            email: nextEmail,
            nombre: nextNombre,
        };
    }

    if (existingByEmail) {
        const nextRole = normalizeRole(existingByEmail.rol);
        const { data, error } = await supabase
            .from("usuarios")
            .update({
                id: user.id,
                email: normalizedEmail,
                nombre: existingByEmail.nombre || normalizedEmail,
                rol: nextRole,
            })
            .eq("id", existingByEmail.id)
            .select("*")
            .maybeSingle();

        if (!error && data) {
            return data;
        }

        return {
            ...existingByEmail,
            id: user.id,
            email: normalizedEmail,
            nombre: existingByEmail.nombre || normalizedEmail,
            rol: nextRole,
        };
    }

    if (!allowCreateIfMissing) {
        return null;
    }

    try {
        const { data, error } = await supabase
            .from("usuarios")
            .insert([
                {
                    id: user.id,
                    email: normalizedEmail,
                    nombre: normalizedEmail,
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
        const rpcRole = await getCurrentUserRoleFromRpc().catch(() => null);

        if (rpcRole && rpcRole !== "usuario") {
            return rpcRole;
        }

        const [existingById, existingByEmail] = await Promise.all([
            getUserById(userId),
            getUserByEmail(email),
        ]);

        const resolvedRole = normalizeRole(
            pickPreferredUser(existingById, existingByEmail)?.rol
        );

        return rpcRole || resolvedRole;
    } catch {
        return "usuario";
    }
}
