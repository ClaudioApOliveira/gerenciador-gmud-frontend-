import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import style from "./layout.module.css";

export default function Layout() {
    return (
        <div className={style.conteiner}>
            <header>
                <Sidebar />
            </header>

            <main>
                <Outlet />
            </main>
        </div>
    )
}