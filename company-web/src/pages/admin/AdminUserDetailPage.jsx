import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../../api/axios";

const STATUS_LABELS = {
    PENDING: "대기",
    ACCEPTED: "수락",
    REJECTED: "거절",
    DONE: "완료",
    COMPLETED: "완료",
    CANCELLED: "취소",
    NOSHOW: "노쇼",
};

const STATUS_COLORS = {
    PENDING: { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
    ACCEPTED: { bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
    REJECTED: { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
    DONE: { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
    COMPLETED: { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
    CANCELLED: { bg: "#F8FAFC", color: "#64748B", border: "#CBD5E1" },
    NOSHOW: { bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE" },
};

function getValue(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && value !== "") return value;
    }
    return undefined;
}

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

const KST_DATE_TIME = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});

function normalizeDateTime(value) {
    if (value === null || value === undefined || value === "") return "-";

    let date;

    if (Array.isArray(value)) {
        // 백엔드가 시간 배열([year, month, day, hour, minute, second])로 내려주는 경우,
        // 서버에 저장된 값 자체가 UTC 순간을 나타내므로 UTC로 해석한 뒤 한국시간으로 변환한다.
        const [year, month, day, hour = 0, minute = 0, second = 0] = value;
        if (!year || !month || !day) return "-";
        date = new Date(Date.UTC(year, Number(month) - 1, day, hour, minute, second));
    } else if (typeof value === "number") {
        const millis = value < 100000000000 ? value * 1000 : value;
        date = new Date(millis);
    } else {
        const text = String(value).trim();
        if (!text || text === "0" || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") return "-";

        // 타임존 정보(Z 또는 +09:00 등)가 없는 문자열은 UTC로 간주해 보정한다.
        const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
        date = new Date(hasTimeZone ? text : `${text}Z`);
    }

    if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1970) return "-";

    const parts = KST_DATE_TIME.formatToParts(date).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});

    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function normalizeRole(role) {
    const raw = String(role || "").toUpperCase();
    if (raw === "ROLE_USER") return "USER";
    if (raw === "ROLE_ADMIN") return "ADMIN";
    if (raw === "ROLE_COMPANY") return "COMPANY";
    return raw || "USER";
}

function normalizeReservation(raw) {
    const status = String(raw.status || raw.reservationStatus || "PENDING").toUpperCase();

    return {
        id: raw.id ?? raw.reservationId ?? raw.historyId,
        status,
        companyName: raw.companyName || raw.expertVendorName || raw.vendorName || raw.kakaoPlaceName || "-",
        issueSummary: raw.issueSummary || raw.issueType || raw.description || "-",
        visitDate: raw.visitDate || raw.reservationDate || raw.date || "",
        visitTime: raw.visitTime || raw.reservationTime || raw.time || "",
        createdAt: raw.createdAt || raw.createdDate || raw.requestedAt || "",
        reviewWritten: Boolean(raw.reviewWritten ?? raw.hasReview ?? raw.reviewed),
    };
}

function AdminUserDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const normalizeDetail = (responseData) => {
        console.log("사용자 상세 원본 응답:", responseData);

        const raw = responseData?.data ?? responseData;
        const user = raw?.user ?? raw?.member ?? raw?.account ?? raw;
        const stats = raw?.stats ?? raw?.userStats ?? raw?.summary ?? {};
        const reviewSummary = raw?.reviewSummary ?? raw?.reviewsSummary ?? stats ?? {};

        const reservationsRaw =
            Array.isArray(raw?.reservations) ? raw.reservations :
                Array.isArray(raw?.reservationHistory) ? raw.reservationHistory :
                    Array.isArray(raw?.recentReservations) ? raw.recentReservations :
                        Array.isArray(raw?.histories) ? raw.histories : [];

        const reservations = reservationsRaw.map(normalizeReservation);

        return {
            user: {
                id: user?.id ?? id,
                username: user?.username ?? user?.name ?? "-",
                email: user?.email ?? "-",
                phoneNumber: user?.phoneNumber ?? user?.phone ?? "-",
                address: user?.address ?? "-",
                residenceType: user?.residenceType ?? "-",
                rentType: user?.rentType ?? "-",
                createdAt: user?.createdAt ?? user?.createdDate ?? null,
                blocked: Boolean(user?.blocked ?? user?.isBlocked ?? user?.status === "BLOCKED"),
                status: user?.status ?? "ACTIVE",
                role: normalizeRole(user?.role),
            },
            stats,
            reviewSummary,
            reservations,
        };
    };

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/admin/users/${id}`);
            setData(normalizeDetail(res.data));
        } catch (e) {
            console.error("상세 조회 실패:", e);

            if (e.response?.status === 401 || e.response?.status === 403) {
                alert("관리자 인증이 만료되었거나 토큰이 없습니다. 다시 로그인하세요.");
                localStorage.clear();
                navigate("/");
                return;
            }

            alert("상세 조회 실패");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const block = async () => {
        if (!window.confirm("이 사용자를 차단하시겠습니까?")) return;

        try {
            await axios.patch(`/api/admin/users/${id}/block`, { reason: "문제 사용자" });
            fetchDetail();
        } catch (e) {
            console.error("차단 실패:", e);
            if (e.response?.status === 401 || e.response?.status === 403) {
                alert("관리자 인증이 만료되었습니다. 다시 로그인하세요.");
                localStorage.clear();
                navigate("/");
                return;
            }
            alert("차단 실패");
        }
    };

    const unblock = async () => {
        try {
            await axios.patch(`/api/admin/users/${id}/unblock`);
            fetchDetail();
        } catch (e) {
            console.error("해제 실패:", e);
            if (e.response?.status === 401 || e.response?.status === 403) {
                alert("관리자 인증이 만료되었습니다. 다시 로그인하세요.");
                localStorage.clear();
                navigate("/");
                return;
            }
            alert("해제 실패");
        }
    };

    const styles = {
        container: { padding: "40px", backgroundColor: "#F8FAFC", minHeight: "100%", fontFamily: "'Pretendard', sans-serif" },
        backBtn: { background: "white", border: "1px solid #e2e8f0", color: "#64748b", cursor: "pointer", fontSize: "14px", fontWeight: "700", padding: "10px 18px", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
        card: { backgroundColor: "white", borderRadius: "24px", padding: "32px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)", border: "1px solid rgba(255,255,255,0.8)", marginBottom: "30px" },
        profileHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "24px", marginBottom: "24px" },
        username: { fontSize: "28px", fontWeight: "800", color: "#1e293b", margin: 0 },
        meta: { color: "#94a3b8", fontSize: "14px", marginTop: "4px", fontWeight: "700" },
        statsContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" },
        statItem: (color) => ({ padding: "18px", borderRadius: "16px", backgroundColor: color + "0A", border: `1px solid ${color}30`, textAlign: "center" }),
        statLabel: { fontSize: "13px", color: "#64748b", marginBottom: "8px", fontWeight: "800" },
        statValue: (color) => ({ fontSize: "24px", fontWeight: "900", color }),
        actionArea: { display: "flex", gap: "12px", marginTop: "24px" },
        blockBtn: (isBlock) => ({ flex: 1, padding: "14px", borderRadius: "12px", border: "none", fontWeight: "800", cursor: "pointer", backgroundColor: isBlock ? "#FEE2E2" : "#F1F5F9", color: isBlock ? "#B91C1C" : "#475569" }),
        infoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginTop: "24px" },
        infoBox: { padding: "16px", backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "14px" },
        infoLabel: { fontSize: "12px", color: "#94A3B8", fontWeight: "900", marginBottom: "6px" },
        infoValue: { fontSize: "15px", color: "#0F172A", fontWeight: "800" },
        sectionTitle: { fontSize: "20px", fontWeight: "900", color: "#1e293b", marginBottom: "18px" },
        table: { width: "100%", borderCollapse: "collapse" },
        th: { textAlign: "left", padding: "14px", backgroundColor: "#F1F5F9", color: "#334155", fontSize: "13px", fontWeight: "900", borderBottom: "1px solid #E2E8F0" },
        td: { padding: "14px", borderBottom: "1px solid #E2E8F0", color: "#334155", fontSize: "14px", verticalAlign: "top" },
        badge: (status) => {
            const c = STATUS_COLORS[status] || { bg: "#F8FAFC", color: "#64748B", border: "#CBD5E1" };
            return { display: "inline-flex", padding: "5px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "900", backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}` };
        },
        reviewBadge: { display: "inline-flex", padding: "5px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "900", backgroundColor: "#EEF2FF", color: "#4F46E5", border: "1px solid #C7D2FE" },
        empty: { textAlign: "center", padding: "40px", color: "#94A3B8", fontWeight: "800" },
    };

    const user = data?.user ?? {};
    const stats = data?.stats ?? {};
    const reviewSummary = data?.reviewSummary ?? {};
    const reservations = data?.reservations ?? [];

    const counts = useMemo(() => {
        const result = { PENDING: 0, ACCEPTED: 0, REJECTED: 0, DONE: 0, CANCELLED: 0, NOSHOW: 0, review: 0 };

        reservations.forEach((r) => {
            const status = r.status === "COMPLETED" ? "DONE" : r.status;
            if (result[status] !== undefined) result[status] += 1;
            if (r.reviewWritten) result.review += 1;
        });

        return result;
    }, [reservations]);

    const writtenReviewCount = toNumber(getValue(reviewSummary.writtenReviewCount, reviewSummary.reviewCount, stats.writtenReviewCount, stats.reviewCount, counts.review));

    const calculatedReservationTotal = counts.PENDING + counts.ACCEPTED + counts.REJECTED + counts.DONE + counts.CANCELLED + counts.NOSHOW;
    const rawTotal = toNumber(getValue(stats.totalReservations, stats.reservationCount, stats.totalReservationCount));
    const totalReservationCount = calculatedReservationTotal > 0 ? calculatedReservationTotal : Math.max(0, rawTotal - writtenReviewCount);

    const sortedReservations = useMemo(() => {
        return [...reservations].sort((a, b) => {
            const aKey = `${a.visitDate || ""} ${a.visitTime || ""} ${a.createdAt || ""}`;
            const bKey = `${b.visitDate || ""} ${b.visitTime || ""} ${b.createdAt || ""}`;
            return bKey.localeCompare(aKey);
        });
    }, [reservations]);

    if (loading || !data) {
        return <div style={{ padding: "40px", color: "#64748b" }}>사용자 정보를 불러오는 중입니다...</div>;
    }

    return (
        <div style={styles.container}>
            <button onClick={() => navigate("/admin/users")} style={styles.backBtn}>← 사용자 목록으로 돌아가기</button>

            <div style={styles.card}>
                <div style={styles.profileHeader}>
                    <div>
                        <h2 style={styles.username}>{user.username}</h2>
                        <p style={styles.meta}>UID: {user.id || id} · 역할: {user.role || "USER"} · 가입일: {normalizeDateTime(user.createdAt)}</p>
                    </div>

                    {user.blocked && (
                        <span style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", padding: "6px 12px", borderRadius: "8px", fontWeight: "800", fontSize: "14px" }}>차단된 계정</span>
                    )}
                </div>

                <div style={styles.statsContainer}>
                    <div style={styles.statItem("#0EA5E9")}><div style={styles.statLabel}>총 예약 횟수</div><div style={styles.statValue("#0EA5E9")}>{totalReservationCount}회</div></div>
                    <div style={styles.statItem("#059669")}><div style={styles.statLabel}>수락</div><div style={styles.statValue("#059669")}>{counts.ACCEPTED}회</div></div>
                    <div style={styles.statItem("#D97706")}><div style={styles.statLabel}>대기</div><div style={styles.statValue("#D97706")}>{counts.PENDING}회</div></div>
                    <div style={styles.statItem("#DC2626")}><div style={styles.statLabel}>거절</div><div style={styles.statValue("#DC2626")}>{counts.REJECTED}회</div></div>
                    <div style={styles.statItem("#2563EB")}><div style={styles.statLabel}>완료</div><div style={styles.statValue("#2563EB")}>{counts.DONE}회</div></div>
                    <div style={styles.statItem("#7C3AED")}><div style={styles.statLabel}>작성 리뷰 수</div><div style={styles.statValue("#7C3AED")}>{writtenReviewCount}개</div></div>
                </div>

                <div style={styles.infoGrid}>
                    <div style={styles.infoBox}><div style={styles.infoLabel}>이메일</div><div style={styles.infoValue}>{user.email || "-"}</div></div>
                    <div style={styles.infoBox}><div style={styles.infoLabel}>연락처</div><div style={styles.infoValue}>{user.phoneNumber || "-"}</div></div>
                    <div style={styles.infoBox}><div style={styles.infoLabel}>주소</div><div style={styles.infoValue}>{user.address || "-"}</div></div>
                    <div style={styles.infoBox}><div style={styles.infoLabel}>계정 상태</div><div style={styles.infoValue}>{user.status || "ACTIVE"}</div></div>
                </div>

                <div style={styles.actionArea}>
                    <button onClick={block} style={styles.blockBtn(true)}>🚫 사용자 차단하기</button>
                    <button onClick={unblock} style={styles.blockBtn(false)}>✅ 차단 해제</button>
                </div>
            </div>

            <div style={styles.card}>
                <h3 style={styles.sectionTitle}>📋 예약 현황</h3>

                {sortedReservations.length === 0 ? (
                    <div style={styles.empty}>예약 기록이 존재하지 않습니다.</div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                        <tr>
                            <th style={styles.th}>예약</th>
                            <th style={styles.th}>업체</th>
                            <th style={styles.th}>요청 내용</th>
                            <th style={styles.th}>방문 예정</th>
                            <th style={styles.th}>상태</th>
                            <th style={styles.th}>리뷰</th>
                        </tr>
                        </thead>
                        <tbody>
                        {sortedReservations.map((r) => {
                            const status = r.status === "COMPLETED" ? "DONE" : r.status;
                            return (
                                <tr key={`${r.id}-${r.visitDate}-${r.visitTime}`}>
                                    <td style={styles.td}>ID: {r.id ?? "-"}</td>
                                    <td style={styles.td}>{r.companyName || "-"}</td>
                                    <td style={styles.td}>{r.issueSummary || "-"}</td>
                                    <td style={styles.td}>{r.visitDate || "-"} {r.visitTime || ""}</td>
                                    <td style={styles.td}><span style={styles.badge(status)}>{STATUS_LABELS[status] || status || "UNKNOWN"}</span></td>
                                    <td style={styles.td}>{r.reviewWritten ? <span style={styles.reviewBadge}>작성 완료</span> : <span style={{ color: "#94A3B8", fontWeight: "800" }}>미작성</span>}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default AdminUserDetailPage;
