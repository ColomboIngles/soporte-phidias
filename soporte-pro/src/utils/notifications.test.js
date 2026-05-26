import assert from "node:assert/strict";
import test from "node:test";
import {
    dedupeNotifications,
    mergeNotification,
    mergeNotificationList,
} from "./notifications.js";

test("dedupeNotifications keeps the newest copy from the ordered fetch", () => {
    const first = { id: "n-1", mensaje: "primera", created_at: "2026-01-02" };
    const duplicate = {
        id: "n-1",
        mensaje: "duplicada",
        created_at: "2026-01-01",
    };
    const second = { id: "n-2", mensaje: "segunda", created_at: "2026-01-01" };

    assert.deepEqual(dedupeNotifications([first, duplicate, second]), [
        first,
        second,
    ]);
});

test("dedupeNotifications preserves id-less notifications", () => {
    const first = { mensaje: "sin id" };
    const second = { mensaje: "sin id tambien" };

    assert.deepEqual(dedupeNotifications([first, second]), [first, second]);
});

test("mergeNotification ignores realtime inserts already present in state", () => {
    const previous = [
        { id: "n-1", mensaje: "existente" },
        { id: "n-2", mensaje: "otra" },
    ];

    const merged = mergeNotification(previous, {
        id: "n-1",
        mensaje: "duplicada",
    });

    assert.equal(merged, previous);
    assert.equal(merged.length, 2);
});

test("mergeNotification prepends new realtime notifications", () => {
    const previous = [{ id: "n-1", mensaje: "existente" }];
    const next = { id: "n-2", mensaje: "nueva" };

    assert.deepEqual(mergeNotification(previous, next), [next, ...previous]);
});

test("mergeNotificationList keeps realtime items when the fetch resolves later", () => {
    const realtime = { id: "n-2", mensaje: "llego por realtime" };
    const fetchedDuplicate = { id: "n-2", mensaje: "llego por fetch" };
    const fetchedOlder = { id: "n-1", mensaje: "mas antigua" };

    assert.deepEqual(
        mergeNotificationList([realtime], [fetchedDuplicate, fetchedOlder]),
        [realtime, fetchedOlder]
    );
});
