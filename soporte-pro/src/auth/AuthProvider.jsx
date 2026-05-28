import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { supabase } from "../services/supabase";
import { crearUsuarioSiNoExiste, obtenerRol } from "../services/usuarios";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState("");
    const hydratedUserIdRef = useRef("");
    const profileRef = useRef(null);

    const hydrateSession = useCallback(async (nextSession) => {
        setSession(nextSession || null);
        setAuthError("");

        if (!nextSession?.user) {
            hydratedUserIdRef.current = "";
            profileRef.current = null;
            setProfile(null);
            setRole(null);
            setLoading(false);
            return;
        }

        const userId = nextSession.user.id;

        if (hydratedUserIdRef.current === userId && profileRef.current) {
            setLoading(false);
            return;
        }

        try {
            const hydratedProfile = await crearUsuarioSiNoExiste(nextSession.user, {
                allowCreateIfMissing: false,
            });

            if (!hydratedProfile) {
                await supabase.auth.signOut();
                setSession(null);
                profileRef.current = null;
                setProfile(null);
                setRole(null);
                setAuthError(
                    "Este correo no tiene acceso habilitado en el sistema de soporte."
                );
                setLoading(false);
                return;
            }

            const nextRole =
                hydratedProfile.rol ||
                (await obtenerRol(nextSession.user.id, nextSession.user.email));

            hydratedUserIdRef.current = userId;
            profileRef.current = hydratedProfile;
            setProfile(hydratedProfile);
            setRole(nextRole);
        } catch (error) {
            setAuthError(
                error?.message ||
                    "No se pudo validar tu usuario en el sistema de soporte."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        const { data } = await supabase.auth.getSession();
        hydratedUserIdRef.current = "";
        await hydrateSession(data.session);
        return data.session;
    }, [hydrateSession]);

    useEffect(() => {
        let active = true;

        async function bootstrap() {
            setLoading(true);

            const { data } = await supabase.auth.getSession();

            if (!active) {
                return;
            }

            await hydrateSession(data.session);
        }

        bootstrap();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_, nextSession) => {
            setLoading(true);
            hydrateSession(nextSession);
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [hydrateSession]);

    const value = useMemo(
        () => ({
            session,
            user: session?.user || null,
            profile,
            role,
            loading,
            authError,
            refreshProfile,
        }),
        [
            session,
            profile,
            role,
            loading,
            authError,
            refreshProfile,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
