import API from "./api";

export async function createManagedUser(payload) {
    const { data } = await API.post("/admin/users", payload);
    return data;
}

export async function updateManagedUser(id, payload) {
    const { data } = await API.put(`/admin/users/${id}`, payload);
    return data;
}

export async function deleteManagedUser(id) {
    const { data } = await API.delete(`/admin/users/${id}`);
    return data;
}

export async function preparePasswordChangeForAllUsers() {
    const { data } = await API.post("/admin/users/bootstrap-password-change");
    return data;
}
