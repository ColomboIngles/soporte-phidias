import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function useNotifications(user) {
    const [notificaciones, setNotificaciones] = useState([]);

    useEffect(() => {
        if (!user) {
            return undefined;
        }

        async function cargar() {
            const { data } = await supabase
                .from("notificaciones")
                .select("*")
                .eq("usuario", user)
                .order("created_at", { ascending: false });

            setNotificaciones(data || []);
        }

        cargar();

        const channel = supabase
            .channel("notificaciones")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "notificaciones" },
                payload => {
                    if (payload.new.usuario === user) {
                        setNotificaciones(prev => [payload.new, ...prev]);
                    }
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user]);

    return user ? notificaciones : [];
}
