import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import {
    dedupeNotifications,
    mergeNotification,
    mergeNotificationList,
} from "../utils/notifications";

export default function useNotifications(user) {
    const [notificationState, setNotificationState] = useState({
        user: null,
        notificaciones: [],
    });

    useEffect(() => {
        if (!user) {
            return undefined;
        }

        let activo = true;

        async function cargar() {
            const { data } = await supabase
                .from("notificaciones")
                .select("*")
                .eq("usuario", user)
                .order("created_at", { ascending: false });

            if (!activo) {
                return;
            }

            const fetchedNotifications = dedupeNotifications(data || []);

            setNotificationState((prev) => {
                const previousNotifications =
                    prev.user === user ? prev.notificaciones : [];

                return {
                    user,
                    notificaciones: mergeNotificationList(
                        previousNotifications,
                        fetchedNotifications
                    ),
                };
            });
        }

        cargar();

        const channel = supabase
            .channel(`notificaciones-${user}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "notificaciones" },
                (payload) => {
                    if (payload.new.usuario === user) {
                        setNotificationState((prev) => {
                            const previousNotifications =
                                prev.user === user ? prev.notificaciones : [];
                            const nextNotifications = mergeNotification(
                                previousNotifications,
                                payload.new
                            );

                            if (
                                prev.user === user &&
                                nextNotifications === previousNotifications
                            ) {
                                return prev;
                            }

                            return {
                                user,
                                notificaciones: nextNotifications,
                            };
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            activo = false;
            supabase.removeChannel(channel);
        };
    }, [user]);

    return user && notificationState.user === user
        ? notificationState.notificaciones
        : [];
}
