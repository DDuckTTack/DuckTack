import { useEffect, useState } from "react";
import { listCommunityReports, reportReasonLabel } from "../../api/community";

const KOREA_DATE_TIME = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
});

function formatKoreaDateTime(value) {
    if (value === null || value === undefined || value === "") return "-";

    let date;
    if (Array.isArray(value)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = value;
        date = new Date(Date.UTC(year, Number(month) - 1, day, hour, minute, second));
    } else if (typeof value === "number") {
        date = new Date(value < 100000000000 ? value * 1000 : value);
    } else {
        const text = String(value).trim();
        const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
        date = new Date(hasTimeZone ? text : `${text}Z`);
    }

    return Number.isNaN(date.getTime()) ? "-" : `${KOREA_DATE_TIME.format(date)} KST`;
}

export default function AdminCommunityReportsPage() {
    const [reports, setReports] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await listCommunityReports({ size: 100 });
            setReports(response.content ?? []);
        } catch {
            setReports([]);
            setError("신고 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const styles = {
        page: { fontFamily: "'Pretendard', sans-serif", color: "#0F172A" },
        title: { fontSize: 28, fontWeight: 900, marginBottom: 6 },
        subtitle: { color: "#64748B", fontSize: 14, fontWeight: 600, marginBottom: 20 },
        toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
        count: { fontSize: 14, fontWeight: 900, color: "#DC2626" },
        refresh: { padding: "9px 14px", borderRadius: 10, border: "1px solid #CBD5E1", background: "white", cursor: "pointer", fontWeight: 800 },
        layout: { display: "grid", gridTemplateColumns: "minmax(320px, 0.9fr) minmax(420px, 1.1fr)", gap: 18, alignItems: "start" },
        list: { display: "grid", gap: 10 },
        card: (active) => ({ padding: 18, borderRadius: 16, border: active ? "2px solid #DC2626" : "1px solid #FECACA", background: active ? "#FFF7F7" : "white", textAlign: "left", cursor: "pointer" }),
        reason: { color: "#B91C1C", fontSize: 15, fontWeight: 900, marginBottom: 7 },
        meta: { color: "#64748B", fontSize: 12, fontWeight: 700, lineHeight: 1.6 },
        content: { marginTop: 12, padding: 12, borderRadius: 10, background: "#F8FAFC", color: "#334155", fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" },
        detail: { marginTop: 8, color: "#7F1D1D", fontSize: 12, fontWeight: 700 },
        empty: { padding: 70, textAlign: "center", borderRadius: 18, background: "white", border: "1px solid #E2E8F0", color: "#94A3B8", fontWeight: 800 },
        panel: { position: "sticky", top: 20, padding: 24, borderRadius: 18, background: "white", border: "1px solid #E2E8F0", boxShadow: "0 10px 26px rgba(15,23,42,.06)" },
        panelTitle: { fontSize: 19, fontWeight: 900, marginBottom: 16 },
        section: { marginTop: 18, paddingTop: 16, borderTop: "1px solid #E2E8F0" },
        sectionTitle: { fontSize: 13, fontWeight: 900, color: "#475569", marginBottom: 9 },
        infoGrid: { display: "grid", gridTemplateColumns: "100px 1fr", gap: "7px 12px", fontSize: 13 },
        label: { color: "#94A3B8", fontWeight: 800 },
        value: { color: "#1E293B", fontWeight: 700, overflowWrap: "anywhere" },
    };

    return (
        <div style={styles.page}>
            <h1 style={styles.title}>🚨 커뮤니티 신고함</h1>
            <div style={styles.subtitle}>접수된 게시글·댓글 신고의 사유와 대상을 확인합니다.</div>
            <div style={styles.toolbar}>
                <span style={styles.count}>총 {reports.length}건</span>
                <button type="button" style={styles.refresh} onClick={load}>새로고침</button>
            </div>
            {loading ? (
                <div style={styles.empty}>신고 목록을 불러오는 중...</div>
            ) : error ? (
                <div style={styles.empty}>{error}</div>
            ) : reports.length === 0 ? (
                <div style={styles.empty}>접수된 신고가 없습니다.</div>
            ) : (
                <div style={styles.layout}>
                    <div style={styles.list}>
                        {reports.map((report) => (
                            <button type="button" key={report.reportId} style={styles.card(selected?.reportId === report.reportId)} onClick={() => setSelected(report)}>
                                <div style={styles.reason}>{report.targetType === "POST" ? "게시글" : "댓글"} · {reportReasonLabel(report.reason)}</div>
                                <div style={styles.meta}>신고자 {report.reporterName} · 작성자 {report.targetAuthorName}</div>
                                <div style={styles.meta}>{formatKoreaDateTime(report.createdAt)}</div>
                            </button>
                        ))}
                    </div>
                    {!selected ? (
                        <div style={styles.empty}>왼쪽에서 신고 항목을 선택하세요.</div>
                    ) : (
                        <aside style={styles.panel}>
                            <div style={styles.panelTitle}>신고 상세 #{selected.reportId}</div>
                            <div style={styles.reason}>{selected.targetType === "POST" ? "게시글" : "댓글"} · {reportReasonLabel(selected.reason)}</div>
                            <div style={styles.content}>{selected.targetContent}</div>
                            <div style={styles.detail}>상세 사유: {selected.detail || "입력 없음"}</div>

                            <div style={styles.section}>
                                <div style={styles.sectionTitle}>신고한 사용자</div>
                                <UserInfo styles={styles} prefix="reporter" data={selected} />
                            </div>
                            <div style={styles.section}>
                                <div style={styles.sectionTitle}>콘텐츠 작성자</div>
                                <UserInfo styles={styles} prefix="targetAuthor" data={selected} />
                            </div>
                            <div style={styles.section}>
                                <div style={styles.infoGrid}>
                                    <span style={styles.label}>대상 ID</span><span style={styles.value}>{selected.targetId}</span>
                                    <span style={styles.label}>접수 시각</span><span style={styles.value}>{formatKoreaDateTime(selected.createdAt)}</span>
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            )}
        </div>
    );
}

function UserInfo({ styles, prefix, data }) {
    const field = (name) => data[`${prefix}${name}`] || "-";
    return (
        <div style={styles.infoGrid}>
            <span style={styles.label}>사용자 ID</span><span style={styles.value}>{field("Id")}</span>
            <span style={styles.label}>아이디</span><span style={styles.value}>{field("Name")}</span>
            <span style={styles.label}>이메일</span><span style={styles.value}>{field("Email")}</span>
            <span style={styles.label}>전화번호</span><span style={styles.value}>{field("Phone")}</span>
            <span style={styles.label}>주소</span><span style={styles.value}>{field("Address")}</span>
            <span style={styles.label}>권한</span><span style={styles.value}>{field("Role")}</span>
        </div>
    );
}
