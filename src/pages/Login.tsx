import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import styles from "./Login.module.css";

export default function Login() {
    const { user, signIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (user) {
        return <Navigate to="/" replace />;
    }

    const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            await signIn(username, password);
            navigate(redirectTo, { replace: true });
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setError("Usuário ou senha inválidos.");
            } else {
                setError("Não foi possível autenticar no momento.");
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Entrar</h1>
                <p className={styles.subtitle}>Use suas credenciais para acessar o sistema de GMUD.</p>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <label>
                        Usuário
                        <input
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            autoComplete="username"
                            required
                        />
                    </label>

                    <label>
                        Senha
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </label>

                    {error && <p className={styles.error}>{error}</p>}

                    <button className={styles.submit} type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Entrando..." : "Entrar"}
                    </button>
                </form>
            </div>
        </section>
    );
}
