import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listConversations } from "../../api/messages";

function formatTime(value) {
    if (!value) return "";
    // backend sends OffsetDateTime as epoch seconds (with fractional nanos) instead of
    // an ISO string in practice, despite the documented contract — normalize both.
    const date = new Date(typeof value === "number" ? value * 1000 : value);
    if (Number.isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function MessagesInboxPage() {
    const navigate = useNavigate();
    const [filterType, setFilterType] = useState("");
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setErrorMessage("");
        listConversations({ type: filterType || undefined, size: 50 })
            .then((res) => {
                if (!cancelled) setConversations(res.content ?? []);
            })
            .catch((err) => {
                if (!cancelled) {
                    setErrorMessage(err.response?.data?.message || "쪽지함을 불러오지 못했습니다.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [filterType]);

    const styles = {
        page: {
            minHeight: "100vh",
            backgroundColor: "#F8FAFC",
            padding: "32px 48px",
            fontFamily: "'Pretendard', sans-serif",
            color: "#0F172A",
        },
        backBtn: {
            backgroundColor: "#FFFFFF",
            border: "1px solid #CBD5E1",
            borderRadius: "12px",
            padding: "11px 16px",
            fontWeight: "900",
            cursor: "pointer",
            marginBottom: "24px",
        },
        header: {
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            padding: "34px 38px",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
            border: "1px solid #E2E8F0",
            marginBottom: "24px",
        },
        titleRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" },
        title: { margin: 0, fontSize: "34px", fontWeight: "900" },
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
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            padding: "12px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
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
        typeBadge: {
            fontSize: "11px",
            fontWeight: "800",
            color: "#64748B",
            backgroundColor: "#F1F5F9",
            borderRadius: "6px",
            padding: "3px 8px",
            marginLeft: "8px",
        },
        unreadBadge: {
            fontSize: "11px",
            fontWeight: "900",
            color: "#FFFFFF",
            backgroundColor: "#EF4444",
            borderRadius: "999px",
            padding: "2px 8px",
            marginLeft: "8px",
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
        empty: { padding: "60px", textAlign: "center", color: "#94A3B8", fontWeight: "900" },
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
            <button style={styles.backBtn} onClick={() => navigate("/company")}>
                ← 파트너 센터
            </button>

            <section style={styles.header}>
                <div style={styles.titleRow}>
                    <h1 style={styles.title}>✉️ 쪽지함</h1>
                </div>

                <div style={styles.tabs}>
                    <button style={styles.tab(filterType === "")} onClick={() => setFilterType("")}>
                        전체
                    </button>
                    <button style={styles.tab(filterType === "USER")} onClick={() => setFilterType("USER")}>
                        사용자
                    </button>
                    <button style={styles.tab(filterType === "COMPANY")} onClick={() => setFilterType("COMPANY")}>
                        업체
                    </button>
                </div>
            </section>

            {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}

            <section style={styles.listSection}>
                {loading ? (
                    <div style={styles.empty}>불러오는 중...</div>
                ) : conversations.length === 0 ? (
                    <div style={styles.empty}>쪽지가 없습니다.</div>
                ) : (
                    conversations.map((c) => (
                        <div
                            key={c.conversationId}
                            style={styles.row}
                            onClick={() => navigate(`/company/messages/${c.conversationId}`)}
                        >
                            <div style={styles.avatar}>{(c.otherDisplayName || "?").slice(0, 1)}</div>
                            <div style={styles.rowMain}>
                                <div style={styles.rowTop}>
                                    <span>
                                        <span style={styles.name}>{c.otherDisplayName}</span>
                                        <span style={styles.typeBadge}>
                                            {c.otherIsCompany ? "업체" : "사용자"}
                                        </span>
                                        {c.unreadCount > 0 ? (
                                            <span style={styles.unreadBadge}>{c.unreadCount}</span>
                                        ) : null}
                                    </span>
                                    <span style={styles.time}>{formatTime(c.lastMessageAt)}</span>
                                </div>
                                <div style={styles.preview}>
                                    {c.lastMessagePreview ?? "대화를 시작해보세요."}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </section>
        </div>
    );
}
