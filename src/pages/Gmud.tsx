import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
    ApiError,
    createGmud,
    deleteGmud,
    listGmudsPaginated,
    updateGmud,
    type CreateGmudPayload,
    type GmudItem,
    type PaginationMeta,
    type GmudStatus
} from "../lib/api";
import styles from "./Home.module.css";

type GmudForm = Omit<GmudItem, "id">;

const emptyForm: GmudForm = {
    nomeProjeto: "",
    numeroProjeto: "",
    sprint: "",
    gmudNumber: "",
    status: "Pendente",
    tipoProjeto: "",
    desenvolvedorNova: "",
    responsavelBrasilis: ""
};

export default function Gmud() {
    const pageSize = 10;
    const [gmuds, setGmuds] = useState<GmudItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationMeta>({
        page: 1,
        limit: pageSize,
        totalItems: 0,
        totalPages: 1
    });
    const [showModal, setShowModal] = useState(false);
    const [editingGmudId, setEditingGmudId] = useState<number | null>(null);
    const [formData, setFormData] = useState<GmudForm>(emptyForm);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"Todos" | GmudStatus>("Todos");
    const [sprintFilter, setSprintFilter] = useState("Todos");
    const [devFilter, setDevFilter] = useState("Todos");

    const sprintOptions = useMemo(
        () => ["Todos", ...new Set(gmuds.map((item) => item.sprint))],
        [gmuds]
    );

    const devOptions = useMemo(
        () => ["Todos", ...new Set(gmuds.map((item) => item.desenvolvedorNova))],
        [gmuds]
    );

    const filteredGmuds = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return gmuds.filter((item) => {
            const matchesStatus = statusFilter === "Todos" || item.status === statusFilter;
            const matchesSprint = sprintFilter === "Todos" || item.sprint === sprintFilter;
            const matchesDev = devFilter === "Todos" || item.desenvolvedorNova === devFilter;

            if (!matchesStatus || !matchesSprint || !matchesDev) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            const searchableText = [
                item.nomeProjeto,
                item.numeroProjeto,
                item.sprint,
                item.gmudNumber,
                item.status,
                item.tipoProjeto,
                item.desenvolvedorNova,
                item.responsavelBrasilis
            ]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(normalizedSearch);
        });
    }, [devFilter, gmuds, searchTerm, sprintFilter, statusFilter]);

    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < pagination.totalPages;

    async function loadGmuds(page = 1) {
        setIsLoading(true);
        setError("");

        try {
            const response = await listGmudsPaginated({ page, limit: pageSize });
            console.log(response.items);
            setGmuds(response.items);
            setPagination(response.pagination);
            setCurrentPage(response.pagination.page);
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setError("Sessão expirada. Faça login novamente.");
            } else {
                setError("Não foi possível carregar as GMUDs.");
            }
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadGmuds(1);
    }, []);

    function openModal() {
        setFormData(emptyForm);
        setEditingGmudId(null);
        setShowModal(true);
    }

    function openEditModal(item: GmudItem) {
        setFormData({
            nomeProjeto: item.nomeProjeto,
            numeroProjeto: item.numeroProjeto,
            sprint: item.sprint,
            gmudNumber: item.gmudNumber,
            status: item.status,
            tipoProjeto: item.tipoProjeto,
            desenvolvedorNova: item.desenvolvedorNova,
            responsavelBrasilis: item.responsavelBrasilis
        });
        setEditingGmudId(item.id);
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setEditingGmudId(null);
        setFormData(emptyForm);
    }

    function handleChange<K extends keyof GmudForm>(field: K, value: GmudForm[K]) {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmitGmud(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!formData.nomeProjeto.trim()) {
            return;
        }

        const payload: CreateGmudPayload = {
            nomeProjeto: formData.nomeProjeto.trim(),
            numeroProjeto: formData.numeroProjeto.trim() || "-",
            sprint: formData.sprint.trim() || "-",
            gmudNumber: formData.gmudNumber.trim() || "-",
            status: formData.status,
            tipoProjeto: formData.tipoProjeto.trim() || "-",
            desenvolvedorNova: formData.desenvolvedorNova.trim() || "-",
            responsavelBrasilis: formData.responsavelBrasilis.trim() || "-"
        };

        try {
            if (editingGmudId) {
                await updateGmud(editingGmudId, payload);
                await loadGmuds(currentPage);
            } else {
                await createGmud(payload);
                await loadGmuds(1);
            }

            closeModal();
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setError("Sessão expirada. Faça login novamente.");
                return;
            }

            setError("Falha ao salvar GMUD.");
        }
    }

    async function handleRemoveGmud(id: number) {
        try {
            await deleteGmud(id);
            const fallbackPage = filteredGmuds.length === 1 && currentPage > 1
                ? currentPage - 1
                : currentPage;

            await loadGmuds(fallbackPage);
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setError("Sessão expirada. Faça login novamente.");
                return;
            }

            setError("Falha ao remover GMUD.");
        }
    }

    function resetFilters() {
        setSearchTerm("");
        setStatusFilter("Todos");
        setSprintFilter("Todos");
        setDevFilter("Todos");
    }

    function handlePreviousPage() {
        if (!canGoPrevious || isLoading) {
            return;
        }

        void loadGmuds(currentPage - 1);
    }

    function handleNextPage() {
        if (!canGoNext || isLoading) {
            return;
        }

        void loadGmuds(currentPage + 1);
    }

    return (
        <section className={styles.page}>
            <div className={styles.header}>
                <h2 className={styles.title}>Gestao de GMUDs</h2>
                <button type="button" className={styles.addButton} onClick={openModal}>
                    <Plus size={18} />
                    Adicionar GMUD
                </button>
            </div>

            {error && <p className={styles.resultCount}>{error}</p>}
            {isLoading && <p className={styles.resultCount}>Carregando GMUDs...</p>}

            <div className={styles.filtersBar}>
                <label className={styles.filterField}>
                    Busca
                    <input
                        type="search"
                        placeholder="Projeto, change, responsavel..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </label>

                <label className={styles.filterField}>
                    Status
                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(event.target.value as "Todos" | GmudStatus)
                        }
                    >
                        <option value="Todos">Todos</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Concluida">Concluida</option>
                        <option value="Cancelada">Cancelada</option>
                    </select>
                </label>

                <label className={styles.filterField}>
                    Sprint
                    <select
                        value={sprintFilter}
                        onChange={(event) => setSprintFilter(event.target.value)}
                    >
                        {sprintOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>

                <label className={styles.filterField}>
                    Desenvolvedor
                    <select value={devFilter} onChange={(event) => setDevFilter(event.target.value)}>
                        {devOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>

                <button type="button" className={styles.clearButton} onClick={resetFilters}>
                    Limpar filtros
                </button>
            </div>

            <p className={styles.resultCount}>Mostrando {filteredGmuds.length} GMUD(s)</p>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nome do Projeto</th>
                            <th>Numero do Projeto</th>
                            <th>Sprint</th>
                            <th>Numero da Change</th>
                            <th>Status Change</th>
                            <th>Tipo de Projeto</th>
                            <th>Desenvolvedor Nova</th>
                            <th>Responsavel Brasilis</th>
                            <th>Acao</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredGmuds.map((item) => (
                            <tr key={item.id}>
                                <td>{item.nomeProjeto}</td>
                                <td>{item.numeroProjeto}</td>
                                <td>{item.sprint}</td>
                                <td>{item.gmudNumber}</td>
                                <td>
                                    <span
                                        className={`${styles.status} ${styles[`status${item.status}`]}`}
                                    >
                                        {item.status}
                                    </span>
                                </td>
                                <td>{item.tipoProjeto}</td>
                                <td>{item.desenvolvedorNova}</td>
                                <td>{item.responsavelBrasilis}</td>
                                <td>
                                    <div className={styles.actionButtons}>
                                        <button
                                            type="button"
                                            className={styles.editButton}
                                            onClick={() => openEditModal(item)}
                                            aria-label={`Editar GMUD ${item.numeroProjeto}`}
                                        >
                                            <Pencil size={16} />
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            className={styles.removeButton}
                                            onClick={() => handleRemoveGmud(item.id)}
                                            aria-label={`Remover GMUD ${item.numeroProjeto}`}
                                        >
                                            <Trash2 size={16} />
                                            Remover
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!filteredGmuds.length && (
                            <tr>
                                <td colSpan={9} className={styles.emptyState}>
                                    Nenhuma GMUD encontrada com os filtros atuais.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className={styles.paginationBar}>
                <button
                    type="button"
                    className={styles.paginationButton}
                    onClick={handlePreviousPage}
                    disabled={!canGoPrevious || isLoading}
                >
                    Anterior
                </button>

                <span className={styles.paginationInfo}>
                    Página {pagination.page} de {pagination.totalPages} · Total {pagination.totalItems}
                </span>

                <button
                    type="button"
                    className={styles.paginationButton}
                    onClick={handleNextPage}
                    disabled={!canGoNext || isLoading}
                >
                    Próxima
                </button>
            </div>

            {showModal && (
                <div className={styles.overlay} role="presentation" onClick={closeModal}>
                    <div
                        className={styles.modal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="gmud-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className={styles.modalHeader}>
                            <h3 id="gmud-modal-title">
                                {editingGmudId ? "Editar GMUD" : "Adicionar nova GMUD"}
                            </h3>
                            <button type="button" className={styles.iconButton} onClick={closeModal}>
                                <X size={18} />
                            </button>
                        </div>

                        <form className={styles.form} onSubmit={handleSubmitGmud}>
                            <label>
                                Nome do Projeto*
                                <input
                                    required
                                    value={formData.nomeProjeto}
                                    onChange={(event) => handleChange("nomeProjeto", event.target.value)}
                                />
                            </label>

                            <label>
                                Numero do Projeto
                                <input
                                    value={formData.numeroProjeto}
                                    onChange={(event) => handleChange("numeroProjeto", event.target.value)}
                                />
                            </label>

                            <label>
                                Sprint
                                <input
                                    value={formData.sprint}
                                    onChange={(event) => handleChange("sprint", event.target.value)}
                                />
                            </label>

                            <label>
                                Numero da Change
                                <input
                                    value={formData.gmudNumber}
                                    onChange={(event) => handleChange("gmudNumber", event.target.value)}
                                />
                            </label>

                            <label>
                                Status Change
                                <select
                                    value={formData.status}
                                    onChange={(event) =>
                                        handleChange("status", event.target.value as GmudStatus)
                                    }
                                >
                                    <option value="Pendente">Pendente</option>
                                    <option value="Concluida">Concluida</option>
                                    <option value="Cancelada">Cancelada</option>
                                </select>
                            </label>

                            <label>
                                Tipo de Projeto
                                <input
                                    value={formData.tipoProjeto}
                                    onChange={(event) => handleChange("tipoProjeto", event.target.value)}
                                />
                            </label>

                            <label>
                                Desenvolvedor Nova
                                <input
                                    value={formData.desenvolvedorNova}
                                    onChange={(event) =>
                                        handleChange("desenvolvedorNova", event.target.value)
                                    }
                                />
                            </label>

                            <label>
                                Responsavel Brasilis
                                <input
                                    value={formData.responsavelBrasilis}
                                    onChange={(event) =>
                                        handleChange("responsavelBrasilis", event.target.value)
                                    }
                                />
                            </label>

                            <div className={styles.formActions}>
                                <button type="button" className={styles.cancelButton} onClick={closeModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className={styles.saveButton}>
                                    {editingGmudId ? "Salvar alterações" : "Salvar GMUD"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
