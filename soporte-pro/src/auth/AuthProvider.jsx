import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { supabase } from "../services/supabase";
import { crearUsuarioSiNoExiste, obtenerRol } from "../services/usuarios";
import { readAuthUrlState, stripAuthTokensFromUrl } from "./authUtils";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState("");
    const [recoveryMode, setRecoveryMode] = useState(() => {
        const urlState = readAuthUrlState();
        return urlState.hasRecoveryToken || urlState.recoveryType;
    });
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

            const urlState = readAuthUrlState();
            if (urlState.hasRecoveryToken || urlState.recoveryType) {
                setRecoveryMode(true);
            }

            if (urlState.code) {
                await supabase.auth.exchangeCodeForSession(urlState.code).catch(() => null);
            }

            const { data } = await supabase.auth.getSession();

            if (!active) {
                return;
            }

            await hydrateSession(data.session);
        }

        bootstrap();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, nextSession) => {
            if (event === "PASSWORD_RECOVERY") {
                setRecoveryMode(true);
            }

            if (event === "SIGNED_OUT") {
                setRecoveryMode(false);
            }

            setLoading(true);
            hydrateSession(nextSession);
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [hydrateSession]);

    const markRecoveryHandled = useCallback(() => {
        setRecoveryMode(false);
        stripAuthTokensFromUrl();
    }, []);

    const value = useMemo(
        () => ({
            session,
            user: session?.user || null,
            profile,
            role,
            loading,
            authError,
            recoveryMode,
            refreshProfile,
            markRecoveryHandled,
        }),
        [
            session,
            profile,
            role,
            loading,
            authError,
            recoveryMode,
            refreshProfile,
            markRecoveryHandled,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
