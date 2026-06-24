import { CheckCircle2, ClipboardList, Clock, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ApiError, listGmuds, type GmudItem } from "../lib/api";
import styles from "./Home.module.css";

export default function Home() {
    const [gmuds, setGmuds] = useState<GmudItem[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                const data = await listGmuds();
                setGmuds(data);
            } catch (err) {
                if (err instanceof ApiError && err.status === 401) {
                    setError("Sessão expirada. Faça login novamente.");
                    return;
                }

                setError("Não foi possível carregar as métricas.");
            }
        }

        void loadData();
    }, []);

    const stats = useMemo(
        () => [
            {
                label: "Total de GMUDs",
                value: gmuds.length,
                icon: ClipboardList,
                color: "blue"
            },
            {
                label: "Pendentes",
                value: gmuds.filter((item) => item.status === "Pendente").length,
                icon: Clock,
                color: "yellow"
            },
            {
                label: "Concluídas",
                value: gmuds.filter((item) => item.status === "Concluida").length,
                icon: CheckCircle2,
                color: "green"
            },
            {
                label: "Canceladas",
                value: gmuds.filter((item) => item.status === "Cancelada").length,
                icon: XCircle,
                color: "red"
            }
        ],
        [gmuds]
    );

    return (
        <section className={styles.page}>
            <div className={styles.header}>
                <h2 className={styles.title}>Dashboard</h2>
            </div>

            {error && <p className={styles.resultCount}>{error}</p>}

            <div className={styles.statsGrid}>
                {stats.map((stat) => (
                    <div key={stat.label} className={`${styles.statCard} ${styles[`card${stat.color}`]}`}>
                        <div className={styles.statIcon}>
                            <stat.icon size={28} />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stat.value}</span>
                            <span className={styles.statLabel}>{stat.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.dashboardActions}>
                <Link to="/gmud" className={styles.actionCard}>
                    <ClipboardList size={22} />
                    <span>Ver todas as GMUDs</span>
                </Link>
            </div>
        </section>
    );
}
