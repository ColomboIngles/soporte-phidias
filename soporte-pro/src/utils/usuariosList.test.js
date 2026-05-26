import assert from "node:assert/strict";
import test from "node:test";
import { fetchUsuariosList, loadUsuariosList } from "./usuariosList.js";

function createUsuariosClient(result, calls = []) {
    return {
        from(table) {
            calls.push(["from", table]);

            return {
                select(columns) {
                    calls.push(["select", columns]);

                    return {
                        order(column, options) {
                            calls.push(["order", column, options]);
                            return result;
                        },
                    };
                },
            };
        },
    };
}

test("fetchUsuariosList loads users ordered by newest first", async () => {
    const usuarios = [{ id: "u-1", email: "admin@example.com" }];
    const calls = [];
    const client = createUsuariosClient({ data: usuarios, error: null }, calls);

    assert.equal(await fetchUsuariosList(client), usuarios);
    assert.deepEqual(calls, [
        ["from", "usuarios"],
        ["select", "*"],
        ["order", "created_at", { ascending: false }],
    ]);
});

test("loadUsuariosList can fetch without updating state before active checks", async () => {
    const usuarios = [{ id: "u-1" }];
    const client = createUsuariosClient({ data: usuarios, error: null });
    const updates = [];

    const result = await loadUsuariosList(client, {
        updateState: false,
        setUsuarios: (nextUsuarios) => updates.push(nextUsuarios),
    });

    assert.equal(result, usuarios);
    assert.deepEqual(updates, []);
});

test("loadUsuariosList updates state after successful mutation reloads", async () => {
    const usuarios = [{ id: "u-2" }];
    const client = createUsuariosClient({ data: usuarios, error: null });
    const updates = [];

    assert.equal(
        await loadUsuariosList(client, {
            setUsuarios: (nextUsuarios) => updates.push(nextUsuarios),
        }),
        usuarios
    );
    assert.deepEqual(updates, [usuarios]);
});

test("loadUsuariosList throws query errors without updating state", async () => {
    const error = new Error("fallo de Supabase");
    const client = createUsuariosClient({ data: null, error });
    const updates = [];

    await assert.rejects(
        loadUsuariosList(client, {
            setUsuarios: (nextUsuarios) => updates.push(nextUsuarios),
        }),
        error
    );
    assert.deepEqual(updates, []);
});
