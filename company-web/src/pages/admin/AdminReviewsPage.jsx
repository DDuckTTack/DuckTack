import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";

function normalizeText(value) {
    return String(value ?? "").trim().toLowerCase();
}

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState([]);
    const [companyName, setCompanyName] = useState("");
    const [loading, setLoading] = useState(false);

    const extractData = (responseData) => responseData?.data ?? responseData;

    const loadReviews = async () => {
        setLoading(true);

        try {
            const res = await axios.get("/api/reviews/admin");
            const data = extractData(res.data);
            setReviews(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("관리자 리뷰 조회 실패:", err);
            alert("리뷰 조회 실패");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReviews();
    }, []);

    const deleteReview = async (reviewId) => {
        if (!window.confirm("해당 리뷰를 삭제하시겠습니까?")) return;

        try {
            await axios.delete(`/api/reviews/admin/${reviewId}`);
            setReviews((prev) => prev.filter((r) => r.id !== reviewId));
            alert("삭제되었습니다.");
        } catch (err) {
            console.error("리뷰 삭제 실패:", err);
            alert("리뷰 삭제 실패");
        }
    };

    const filteredReviews = useMemo(() => {
        const q = normalizeText(companyName);
        if (!q) return reviews;

        return reviews.filter((r) => {
            const name = normalizeText(r.companyName || r.kakaoPlaceName || `업체 #${r.companyId}`);
            return name.includes(q);
        });
    }, [reviews, companyName]);

    const groupedStats = useMemo(() => {
        const map = new Map();

        filteredReviews.forEach((r) => {
            const key = r.companyName || r.kakaoPlaceName || `업체 #${r.companyId ?? "미상"}`;

            if (!map.has(key)) {
                map.set(key, {
                    companyId: r.companyId,
                    companyName: key,
                    count: 0,
                    total: 0,
                });
            }

            const item = map.get(key);
            item.count += 1;
            item.total += Number(r.rating) || 0;
        });

        return Array.from(map.values())
            .map((item) => ({
                ...item,
                avg: item.count > 0 ? Math.round((item.total / item.count) * 10) / 10 : 0,
            }))
            .sort((a, b) => String(a.companyName).localeCompare(String(b.companyName), "ko"));
    }, [filteredReviews]);

    const renderStars = (rating) => {
        const n = Math.max(0, Math.min(5, Number(rating) || 0));
        return "★".repeat(n) + "☆".repeat(5 - n);
    };

    const formatDate = (value) => {
        if (!value) return "-";
        if (typeof value === "number") {
            const millis = value < 100000000000 ? value * 1000 : value;
            const date = new Date(millis);
            if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1970) return "-";
            return date.toISOString().slice(0, 10);
        }
        return String(value).slice(0, 10);
    };

    const styles = {
        page: { padding: "28px", backgroundColor: "#F8FAFC", minHeight: "100vh" },
        title: { fontSize: "26px", fontWeight: "900", color: "#0F172A", marginBottom: "8px" },
        desc: { color: "#64748B", marginBottom: "24px" },
        filterBox: { backgroundColor: "white", padding: "20px", borderRadius: "16px", border: "1px solid #E2E8F0", display: "flex", gap: "10px", marginBottom: "20px", alignItems: "center" },
        input: { padding: "12px", borderRadius: "10px", border: "1px solid #CBD5E1", fontSize: "14px", width: "320px" },
        button: { padding: "12px 18px", borderRadius: "10px", border: "none", backgroundColor: "#0066FF", color: "white", fontWeight: "800", cursor: "pointer" },
        statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px", marginBottom: "24px" },
        statCard: { backgroundColor: "white", borderRadius: "16px", border: "1px solid #E2E8F0", padding: "18px" },
        statName: { fontWeight: "900", color: "#1E293B", marginBottom: "8px" },
        statText: { color: "#64748B", fontSize: "14px", lineHeight: 1.6 },
        table: { width: "100%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 12px rgba(15,23,42,0.05)" },
        th: { textAlign: "left", padding: "14px", backgroundColor: "#F1F5F9", color: "#334155", fontSize: "13px", fontWeight: "900", borderBottom: "1px solid #E2E8F0" },
        td: { padding: "14px", borderBottom: "1px solid #E2E8F0", color: "#334155", fontSize: "14px", verticalAlign: "top" },
        deleteBtn: { padding: "8px 10px", borderRadius: "8px", border: "1px solid #FCA5A5", backgroundColor: "#FEE2E2", color: "#B91C1C", fontWeight: "800", cursor: "pointer" },
        empty: { padding: "50px", textAlign: "center", color: "#94A3B8", backgroundColor: "white", borderRadius: "16px", fontWeight: "800" },
        countText: { color: "#64748B", fontWeight: "800", fontSize: "13px" },
    };

    return (
        <div style={styles.page}>
            <h1 style={styles.title}>⭐ 리뷰 관리</h1>
            <div style={styles.desc}>전체 업체 리뷰를 조회하고, 부적절한 리뷰를 삭제할 수 있습니다.</div>

            <div style={styles.filterBox}>
                <input
                    style={styles.input}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="업체명으로 검색"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") loadReviews();
                    }}
                />

                <button style={styles.button} onClick={loadReviews}>새로고침</button>

                <button
                    style={{ ...styles.button, backgroundColor: "#64748B" }}
                    onClick={() => setCompanyName("")}
                >
                    검색 초기화
                </button>

                <span style={styles.countText}>표시 {filteredReviews.length}개 / 전체 {reviews.length}개</span>
            </div>

            <div style={styles.statGrid}>
                {groupedStats.map((s) => (
                    <div key={`${s.companyName}-${s.companyId ?? "unknown"}`} style={styles.statCard}>
                        <div style={styles.statName}>{s.companyName}</div>
                        <div style={styles.statText}>
                            업체 ID: {s.companyId ?? "-"}<br />
                            리뷰 수: {s.count}<br />
                            평균 별점: {s.avg}
                        </div>
                    </div>
                ))}
            </div>

            {loading ? (
                <div style={styles.empty}>리뷰를 불러오는 중...</div>
            ) : filteredReviews.length === 0 ? (
                <div style={styles.empty}>조건에 맞는 리뷰가 없습니다.</div>
            ) : (
                <table style={styles.table}>
                    <thead>
                    <tr>
                        <th style={styles.th}>업체</th>
                        <th style={styles.th}>작성자</th>
                        <th style={styles.th}>별점</th>
                        <th style={styles.th}>내용</th>
                        <th style={styles.th}>작성일</th>
                        <th style={styles.th}>관리</th>
                    </tr>
                    </thead>

                    <tbody>
                    {filteredReviews.map((r) => (
                        <tr key={r.id}>
                            <td style={styles.td}>
                                <b>{r.companyName || r.kakaoPlaceName || `업체 #${r.companyId}`}</b><br />
                                ID: {r.companyId ?? "-"}
                            </td>
                            <td style={styles.td}>{r.authorUsername || "-"}</td>
                            <td style={styles.td}>
                                <span style={{ color: "#F59E0B", fontWeight: "900" }}>{renderStars(r.rating)}</span><br />
                                {r.rating}/5
                            </td>
                            <td style={styles.td}>{r.content || "내용 없음"}</td>
                            <td style={styles.td}>{formatDate(r.createdAt)}</td>
                            <td style={styles.td}>
                                <button style={styles.deleteBtn} onClick={() => deleteReview(r.id)}>삭제</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
