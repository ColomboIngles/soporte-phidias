export const ROLE_OPTIONS = [
    { value: "admin", label: "Admin" },
    { value: "tecnico", label: "Tecnico" },
    { value: "usuario", label: "Usuario" },
];

export async function fetchUsuariosList(supabaseClient) {
    const { data, error } = await supabaseClient
        .from("usuarios")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }

    return data || [];
}

export async function loadUsuariosList(
    supabaseClient,
    { updateState = true, setUsuarios } = {}
) {
    const usuarios = await fetchUsuariosList(supabaseClient);

    if (updateState && typeof setUsuarios === "function") {
        setUsuarios(usuarios);
    }

    return usuarios;
}
