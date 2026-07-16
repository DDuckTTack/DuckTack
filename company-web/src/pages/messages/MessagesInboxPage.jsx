import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getOrCreateThread, getThreads } from "../../mock/messages";

function formatTime(ts) {
    if (!ts) return "";
    const date = new Date(ts);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function MessagesInboxPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [filterType, setFilterType] = useState("");
    const [threads, setThreads] = useState([]);

    useEffect(() => {
        const withName = searchParams.get("with");
        const withType = searchParams.get("type");
        if (withName && withType) {
            const thread = getOrCreateThread(withName, withType);
            navigate(`/company/messages/${thread.id}`, { replace: true });
        }
    }, [searchParams, navigate]);

    useEffect(() => {
        setThreads(getThreads(filterType || undefined));
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
        titleRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" },
        title: { margin: 0, fontSize: "34px", fontWeight: "900" },
        demoBadge: {
            fontSize: "12px",
            fontWeight: "800",
            color: "#B45309",
            backgroundColor: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: "999px",
            padding: "5px 12px",
        },
        subtitle: { color: "#64748B", fontSize: "14px", fontWeight: "600", marginBottom: "20px" },
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
    };

    return (
        <div style={styles.page}>
            <button style={styles.backBtn} onClick={() => navigate("/company")}>
                ← 파트너 센터
            </button>

            <section style={styles.header}>
                <div style={styles.titleRow}>
                    <h1 style={styles.title}>✉️ 쪽지함</h1>
                    <span style={styles.demoBadge}>데모용 로컬 데이터</span>
                </div>
                <div style={styles.subtitle}>
                    쪽지 기능은 아직 서버와 연동되지 않아, 이 브라우저에만 저장되는 미리보기 데이터입니다.
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

            <section style={styles.listSection}>
                {threads.length === 0 ? (
                    <div style={styles.empty}>쪽지가 없습니다.</div>
                ) : (
                    threads.map((t) => {
                        const last = t.messages[t.messages.length - 1];
                        return (
                            <div
                                key={t.id}
                                style={styles.row}
                                onClick={() => navigate(`/company/messages/${t.id}`)}
                            >
                                <div style={styles.avatar}>{t.counterpartName.slice(0, 1)}</div>
                                <div style={styles.rowMain}>
                                    <div style={styles.rowTop}>
                                        <span>
                                            <span style={styles.name}>{t.counterpartName}</span>
                                            <span style={styles.typeBadge}>
                                                {t.counterpartType === "USER" ? "사용자" : "업체"}
                                            </span>
                                        </span>
                                        <span style={styles.time}>{formatTime(last?.createdAt)}</span>
                                    </div>
                                    <div style={styles.preview}>{last?.text ?? "대화를 시작해보세요."}</div>
                                </div>
                            </div>
                        );
                    })
                )}
            </section>
        </div>
    );
}
