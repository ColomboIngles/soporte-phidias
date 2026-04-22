export function isAdminRole(role) {
    return role === "admin";
}

export function isTechnicianRole(role) {
    return role === "tecnico";
}

export function isEndUserRole(role) {
    return role === "usuario";
}

export function isStaffRole(role) {
    return isAdminRole(role) || isTechnicianRole(role);
}

export function canAccessDashboard(role) {
    return isStaffRole(role);
}

export function canAccessKanban(role) {
    return isStaffRole(role);
}

export function canAccessUserAdmin(role) {
    return isAdminRole(role);
}

export function canCreateTickets(role) {
    return Boolean(role);
}

export function canAccessTicketEdit(role) {
    return isStaffRole(role);
}

export function canManageTicketState(role) {
    return isStaffRole(role);
}

export function getHomeRouteByRole(role) {
    return isEndUserRole(role) ? "/tickets" : "/";
}

export function getNavigationItems(role) {
    const items = [{ path: "/tickets", label: "Tickets", key: "tickets" }];

    if (canAccessDashboard(role)) {
        items.unshift({ path: "/", label: "Dashboard", key: "dashboard" });
    }

    if (canAccessKanban(role)) {
        items.push({ path: "/kanban", label: "Kanban", key: "kanban" });
    }

    if (canAccessUserAdmin(role)) {
        items.push({ path: "/usuarios", label: "Usuarios", key: "usuarios" });
        items.push({ path: "/auditoria", label: "Auditoria", key: "auditoria" });
    }

    return items;
}
