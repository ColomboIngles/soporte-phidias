import { useEffect } from "react";
import { supabase } from "../services/supabase";

export default function useRealtimeTickets(onChange) {
    useEffect(() => {
        const channel = supabase
            .channel("tickets-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tickets" },
                () => onChange()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
}