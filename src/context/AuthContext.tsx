import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode
} from "react";
import { ApiError, getMe, login, logout, type AuthUser } from "../lib/api";

type AuthContextValue = {
    user: AuthUser | null;
    isLoading: boolean;
    signIn: (username: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshSession = useCallback(async () => {
        try {
            const me = await getMe();
            setUser(me);
        } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                setUser(null);
                return;
            }

            setUser(null);
        }
    }, []);

    useEffect(() => {
        async function bootstrap() {
            setIsLoading(true);
            await refreshSession();
            setIsLoading(false);
        }

        void bootstrap();
    }, [refreshSession]);

    const signIn = useCallback(async (username: string, password: string) => {
        await login(username, password);
        const me = await getMe();
        setUser(me);
    }, []);

    const signOut = useCallback(async () => {
        await logout();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({
            user,
            isLoading,
            signIn,
            signOut,
            refreshSession
        }),
        [isLoading, refreshSession, signIn, signOut, user]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth precisa ser usado dentro de AuthProvider");
    }

    return context;
}
