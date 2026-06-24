import { Home, ClipboardList, Info } from "lucide-react";
import { Link } from "react-router-dom";
import style from "./aside.module.css";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
    const { user, signOut } = useAuth();
    const displayName = user?.username ?? user?.nome ?? user?.usuario ?? user?.email ?? "Usuário";

    async function handleLogout() {
        await signOut();
    }

    return (
        <aside className={style.aside}>
            <h1>Gerência de GMUD</h1>
            <nav className={style.nav}>
                <Link to="/" className={style.menuLink}>
                    <Home size={20} /> Início
                </Link>
                <Link to="/gmud" className={style.menuLink}>
                    <ClipboardList size={20} /> GMUDs
                </Link>
                <Link to="/sobre" className={style.menuLink}>
                    <Info size={20} /> Sobre
                </Link>
                <span className={style.userLabel}>{displayName}</span>
                <button type="button" className={style.logoutButton} onClick={handleLogout}>
                    Sair
                </button>
            </nav>
        </aside>
    )
}