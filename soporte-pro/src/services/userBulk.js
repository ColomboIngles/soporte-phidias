import { supabase } from "./supabase";

const VALID_ROLES = new Set(["admin", "tecnico", "usuario"]);
const TEMPLATE_COLUMNS = ["ID", "EMAIL", "NOMBRE", "ROL"];
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

    if (!raw) return "";
    if (raw === "tecnico") return "tecnico";
    if (raw === "usuario" || raw === "user") return "usuario";
    if (raw === "admin" || raw === "administrador") return "admin";
    return raw;
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

function buildImportPlan(rows, existingUsers) {
    const existingById = new Map(existingUsers.map((user) => [user.id, user]));
    const existingByEmail = new Map(
        existingUsers.map((user) => [normalizeEmail(user.email), user])
    );
    const seenIds = new Set();
    const seenEmails = new Set();

    const payload = [];
    const warnings = [];
    const errors = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    rows.forEach((row, index) => {
        const line = index + 2;
        const id = normalizeText(
            getRowValue(row, ["id", "uuid", "userid", "usuarioid"])
        );
        const email = normalizeEmail(
            getRowValue(row, ["email", "correo", "mail"])
        );
        const nombre = normalizeText(getRowValue(row, ["nombre", "name"]));
        const rol = normalizeRole(getRowValue(row, ["rol", "role"]));

        const isEmptyRow = !id && !email && !nombre && !rol;
        if (isEmptyRow) {
            skipped += 1;
            return;
        }

        if (!rol || !VALID_ROLES.has(rol)) {
            errors.push(
                `Fila ${line}: el rol debe ser admin, tecnico o usuario.`
            );
            return;
        }

        if (id && seenIds.has(id)) {
            errors.push(`Fila ${line}: el ID ${id} esta repetido en el archivo.`);
            return;
        }

        if (email && seenEmails.has(email)) {
            errors.push(
                `Fila ${line}: el email ${email} esta repetido en el archivo.`
            );
            return;
        }

        const existingByIdMatch = id ? existingById.get(id) : null;
        const existingByEmailMatch = email ? existingByEmail.get(email) : null;

        if (
            existingByIdMatch &&
            existingByEmailMatch &&
            existingByIdMatch.id !== existingByEmailMatch.id
        ) {
            errors.push(
                `Fila ${line}: el ID y el email apuntan a usuarios distintos en el sistema.`
            );
            return;
        }

        const existing = existingByIdMatch || existingByEmailMatch;
        const finalId = id || existing?.id || "";
        const finalEmail = email || normalizeEmail(existing?.email) || "";

        if (!finalId) {
            errors.push(
                `Fila ${line}: falta ID. Para crear un usuario nuevo se requiere ID; para actualizar, el email debe existir ya en el sistema.`
            );
            return;
        }

        if (!finalEmail) {
            errors.push(`Fila ${line}: falta email.`);
            return;
        }

        const finalNombre =
            nombre || normalizeText(existing?.nombre) || finalEmail;

        seenIds.add(finalId);
        seenEmails.add(finalEmail);

        payload.push({
            id: finalId,
            email: finalEmail,
            nombre: finalNombre,
            rol,
        });

        if (existing) {
            updated += 1;
        } else {
            inserted += 1;
            warnings.push(
                `Fila ${line}: se preparo como nuevo registro en public.usuarios. Verifica que el ID corresponda a un usuario real de Auth si tambien debe iniciar sesion.`
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
        ID: user.id,
        EMAIL: user.email,
        NOMBRE: user.nombre || "",
        ROL: user.rol || "usuario",
        CREATED_AT: user.created_at || "",
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    setWorksheetColumns(worksheet, [38, 32, 28, 14, 24]);
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
            "uuid-del-usuario-auth",
            "persona@empresa.com",
            "Nombre Apellido",
            "usuario",
        ],
    ]);

    const notesSheet = XLSX.utils.aoa_to_sheet([
        ["Reglas de importacion"],
        ["1. Columnas obligatorias: ID, EMAIL y ROL. NOMBRE es opcional."],
        ["2. ROL solo admite: admin, tecnico, usuario."],
        [
            "3. Si el email ya existe en public.usuarios, puedes omitir ID y se actualizara ese registro.",
        ],
        [
            "4. Si quieres crear una fila nueva, el ID debe corresponder al usuario real en Supabase Auth.",
        ],
    ]);

    setWorksheetColumns(templateSheet, [34, 30, 24, 14]);
    setWorksheetColumns(notesSheet, [110]);
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
