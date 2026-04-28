import { supabase } from "./supabase";

const VALID_ROLES = new Set(["admin", "tecnico", "usuario"]);
const TEMPLATE_COLUMNS = ["Nombre", "Cargo", "Email", "Rol Sistema"];
const USER_BATCH_SIZE = 100;

function normalizeText(value) {
    return String(value ?? "").trim();
}

function normalizeEmail(value) {
    return normalizeText(value).toLowerCase();
}

function normalizeRole(value) {
    const raw = normalizeText(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const compact = raw.replace(/[^a-z]/g, "");

    if (!compact) return "";
    if (compact.startsWith("tecnico") || compact.startsWith("technical")) {
        return "tecnico";
    }
    if (compact.startsWith("usuario") || compact.startsWith("user")) {
        return "usuario";
    }
    if (
        compact === "admin" ||
        compact.startsWith("administrador") ||
        compact.startsWith("administrator")
    ) {
        return "admin";
    }

    return compact;
}

function formatRoleForSheet(role) {
    if (role === "admin") return "Administrador";
    if (role === "tecnico") return "Tecnico";
    return "Usuario";
}

function normalizeHeader(header) {
    return normalizeText(header)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
}

function getRowValue(row, aliases) {
    for (const alias of aliases) {
        if (alias in row) return row[alias];
    }

    return "";
}

function chunk(items, size) {
    const output = [];

    for (let index = 0; index < items.length; index += size) {
        output.push(items.slice(index, index + size));
    }

    return output;
}

async function getXlsx() {
    return import("xlsx");
}

function mapWorkbookRows(rawRows) {
    return rawRows.map((row) => {
        const normalizedRow = {};

        for (const [key, value] of Object.entries(row)) {
            normalizedRow[normalizeHeader(key)] = value;
        }

        return normalizedRow;
    });
}

function setWorksheetColumns(worksheet, widths) {
    worksheet["!cols"] = widths.map((wch) => ({ wch }));
}

function createProvisionalId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `temp-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function buildImportPlan(rows, existingUsers) {
    const existingByEmail = new Map(
        existingUsers.map((user) => [normalizeEmail(user.email), user])
    );
    const seenEmails = new Set();

    const payload = [];
    const warnings = [];
    const errors = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    rows.forEach((row, index) => {
        const line = index + 2;
        const nombre = normalizeText(
            getRowValue(row, ["nombre", "name", "nombres"])
        );
        const email = normalizeEmail(
            getRowValue(row, ["email", "correo", "mail"])
        );
        const rol = normalizeRole(
            getRowValue(row, ["rolsistema", "rol", "role", "sistemarol"])
        );
        const isEmptyRow = !nombre && !email && !rol;

        if (isEmptyRow) {
            skipped += 1;
            return;
        }

        if (!email) {
            errors.push(`Fila ${line}: falta el email.`);
            return;
        }

        if (!rol || !VALID_ROLES.has(rol)) {
            errors.push(
                `Fila ${line}: el campo Rol Sistema debe ser Administrador, Tecnico o Usuario.`
            );
            return;
        }

        if (seenEmails.has(email)) {
            errors.push(`Fila ${line}: el email ${email} esta repetido en el archivo.`);
            return;
        }

        const existing = existingByEmail.get(email);
        const finalNombre = nombre || normalizeText(existing?.nombre) || email;

        seenEmails.add(email);

        payload.push({
            id: existing?.id || createProvisionalId(),
            email,
            nombre: finalNombre,
            rol,
        });

        if (existing) {
            updated += 1;
        } else {
            inserted += 1;
            warnings.push(
                `Fila ${line}: ${email} se preparo como usuario nuevo. El sistema completara su identidad definitiva cuando esa persona entre por primera vez con el acceso seguro por correo.`
            );
        }
    });

    return {
        payload,
        summary: {
            totalRows: rows.length,
            processed: payload.length,
            inserted,
            updated,
            skipped,
            warnings,
            errors,
        },
    };
}

export async function exportUsersWorkbook(users) {
    const XLSX = await getXlsx();
    const rows = users.map((user) => ({
        Nombre: user.nombre || "",
        Cargo: user.cargo || "",
        Email: user.email,
        "Rol Sistema": formatRoleForSheet(user.rol || "usuario"),
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    setWorksheetColumns(worksheet, [34, 24, 34, 18]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
    XLSX.writeFile(
        workbook,
        `usuarios_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
}

export async function exportUsersTemplateWorkbook() {
    const XLSX = await getXlsx();
    const workbook = XLSX.utils.book_new();

    const templateSheet = XLSX.utils.aoa_to_sheet([
        TEMPLATE_COLUMNS,
        [
            "Apellido Nombre",
            "Coordinacion Academica",
            "persona@empresa.com",
            "Usuario",
        ],
        [
            "Apellido Nombre",
            "Mesa de Soporte",
            "tecnico@empresa.com",
            "Tecnico",
        ],
        [
            "Apellido Nombre",
            "Direccion TI",
            "admin@empresa.com",
            "Administrador",
        ],
    ]);

    const notesSheet = XLSX.utils.aoa_to_sheet([
        ["Reglas de importacion"],
        ["1. Usa las columnas Nombre, Cargo, Email y Rol Sistema."],
        ["2. Rol Sistema solo admite: Administrador, Tecnico o Usuario."],
        [
            "3. Ya no necesitas enviar ID en el archivo. El sistema genera un identificador provisional y lo sincroniza cuando la persona entra por primera vez con el acceso seguro por correo.",
        ],
        [
            "4. Si el email ya existe, se actualizan nombre y rol con la informacion del archivo.",
        ],
    ]);

    setWorksheetColumns(templateSheet, [34, 26, 34, 18]);
    setWorksheetColumns(notesSheet, [118]);
    XLSX.utils.book_append_sheet(workbook, templateSheet, "Plantilla");
    XLSX.utils.book_append_sheet(workbook, notesSheet, "Notas");
    XLSX.writeFile(workbook, "plantilla_usuarios.xlsx");
}

export async function importUsersWorkbook(file, existingUsers) {
    const XLSX = await getXlsx();
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
        throw new Error("El archivo Excel no contiene hojas.");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    const rows = mapWorkbookRows(rawRows);
    const plan = buildImportPlan(rows, existingUsers);

    if (!plan.payload.length) {
        return plan.summary;
    }

    const batches = chunk(plan.payload, USER_BATCH_SIZE);

    for (const batch of batches) {
        const { error } = await supabase
            .from("usuarios")
            .upsert(batch, { onConflict: "id" });

        if (error) {
            throw error;
        }
    }

    return plan.summary;
}
