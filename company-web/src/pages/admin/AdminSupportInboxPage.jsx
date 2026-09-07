import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listThreads } from "../../api/support";
import { layout, badgeColors } from "./adminTheme";

function formatTime(value) {
    if (!value) return "";
    const date = new Date(typeof value === "number" ? value * 1000 : value);
    if (Number.isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

const STATUS_LABEL = { PENDING: "대기중", ANSWERED: "답변완료" };

export default function AdminSupportInboxPage() {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState("");
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setErrorMessage("");
        listThreads({ status: statusFilter || undefined, size: 50 })
            .then((res) => {
                if (!cancelled) setThreads(res.content ?? []);
            })
            .catch((err) => {
                if (!cancelled) {
                    setErrorMessage(err.response?.data?.message || "문의 목록을 불러오지 못했습니다.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [statusFilter]);

    const styles = {
        page: layout.container,
        header: { marginBottom: "24px" },
        titleRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" },
        title: layout.title,
        tabs: { display: "flex", gap: "8px" },
        tab: (active) => ({
            padding: "10px 18px",
            borderRadius: "999px",
            border: active ? "1px solid #0066FF" : "1px solid #E2E8F0",
            backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
            color: active ? "#0066FF" : "#475569",
            fontWeight: "800",
            cursor: "pointer",
        }),
        listSection: {
            ...layout.tableCard,
            padding: "12px",
        },
        row: {
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "18px 20px",
            borderBottom: "1px solid #F1F5F9",
            cursor: "pointer",
        },
        avatar: {
            width: "46px",
            height: "46px",
            borderRadius: "14px",
            backgroundColor: "#DBEAFE",
            color: "#2563EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "900",
            flexShrink: 0,
        },
        rowMain: { flex: 1, minWidth: 0 },
        rowTop: { display: "flex", justifyContent: "space-between", marginBottom: "4px" },
        name: { fontWeight: "800", fontSize: "15px" },
        statusBadge: (status) => {
            const c = status === "PENDING" ? badgeColors.danger : badgeColors.success;
            return {
                fontSize: "11px",
                fontWeight: "700",
                color: c.text,
                backgroundColor: c.bg,
                borderRadius: "8px",
                padding: "3px 8px",
                marginLeft: "8px",
            };
        },
        time: { fontSize: "12px", color: "#94A3B8", fontWeight: "700" },
        preview: {
            fontSize: "13px",
            color: "#64748B",
            fontWeight: "600",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
        },
        empty: layout.emptyBox,
        errorBox: {
            backgroundColor: "#FEF2F2",
            color: "#991B1B",
            border: "1px solid #FECACA",
            borderRadius: "16px",
            padding: "18px",
            fontWeight: "800",
            marginBottom: "18px",
        },
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div style={styles.titleRow}>
                    <h2 style={styles.title}>🎧 고객센터</h2>
                </div>

                <div style={styles.tabs}>
                    <button style={styles.tab(statusFilter === "")} onClick={() => setStatusFilter("")}>
                        전체
                    </button>
                    <button style={styles.tab(statusFilter === "PENDING")} onClick={() => setStatusFilter("PENDING")}>
                        대기중
                    </button>
                    <button style={styles.tab(statusFilter === "ANSWERED")} onClick={() => setStatusFilter("ANSWERED")}>
                        답변완료
                    </button>
                </div>
            </div>

            {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}

            <section style={styles.listSection}>
                {loading ? (
                    <div style={styles.empty}>불러오는 중...</div>
                ) : threads.length === 0 ? (
                    <div style={styles.empty}>문의 내역이 없습니다.</div>
                ) : (
                    threads.map((t) => (
                        <div
                            key={t.threadId}
                            style={styles.row}
                            onClick={() => navigate(`/admin/support/${t.threadId}`)}
                        >
                            <div style={styles.avatar}>{(t.username || "?").slice(0, 1).toUpperCase()}</div>
                            <div style={styles.rowMain}>
                                <div style={styles.rowTop}>
                                    <span>
                                        <span style={styles.name}>{t.username}</span>
                                        <span style={styles.statusBadge(t.status)}>
                                            {STATUS_LABEL[t.status] || t.status}
                                        </span>
                                    </span>
                                    <span style={styles.time}>{formatTime(t.lastMessageAt)}</span>
                                </div>
                                <div style={styles.preview}>
                                    {t.lastMessagePreview ?? "아직 문의 내용이 없습니다."}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </section>
        </div>
    );
}
