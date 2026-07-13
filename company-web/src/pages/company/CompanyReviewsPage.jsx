import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import { useNavigate } from "react-router-dom";

function formatCreatedAt(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    let date;

    if (Array.isArray(value)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = value;
        date = new Date(year, month - 1, day, hour, minute, second);
    } else if (typeof value === "number" || /^\d+(\.\d+)?$/.test(String(value))) {
        const timestamp = Number(value);
        date = new Date(timestamp < 100000000000 ? timestamp * 1000 : timestamp);
    } else {
        date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function getInitial(username) {
    const text = String(username || "U").trim();
    return text.slice(0, 1).toUpperCase();
}

export default function CompanyReviewsPage() {
    const navigate = useNavigate();

    const [summary, setSummary] = useState({
        avgRating: 0,
        reviewCount: 0,
        reviews: [],
    });

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [sortType, setSortType] = useState("latest");

    const extractData = (responseData) => {
        return responseData?.data ?? responseData;
    };

    const loadReviews = async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            const res = await axios.get("/api/reviews/company/me");
            const data = extractData(res.data);

            setSummary({
                avgRating: Number(data?.avgRating ?? 0),
                reviewCount: Number(data?.reviewCount ?? 0),
                reviews: Array.isArray(data?.reviews) ? data.reviews : [],
            });
        } catch (err) {
            console.error("업체 리뷰 조회 실패:", err);

            if (err.response?.status === 401) {
                localStorage.clear();
                navigate("/");
                return;
            }

            setErrorMessage(
                err.response?.data?.message ||
                "리뷰 정보를 불러오지 못했습니다."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sortedReviews = useMemo(() => {
        const list = [...summary.reviews];

        if (sortType === "ratingHigh") {
            return list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        }

        if (sortType === "ratingLow") {
            return list.sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0));
        }

        return list.sort((a, b) => {
            const aTime = getTime(a.createdAt);
            const bTime = getTime(b.createdAt);
            return bTime - aTime;
        });
    }, [summary.reviews, sortType]);

    function getTime(value) {
        if (!value) return 0;

        if (Array.isArray(value)) {
            const [year, month, day, hour = 0, minute = 0, second = 0] = value;
            return new Date(year, month - 1, day, hour, minute, second).getTime();
        }

        if (typeof value === "number" || /^\d+(\.\d+)?$/.test(String(value))) {
            const timestamp = Number(value);
            return timestamp < 100000000000 ? timestamp * 1000 : timestamp;
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }

    const renderStars = (rating) => {
        const n = Math.max(0, Math.min(5, Number(rating) || 0));
        return "★".repeat(n) + "☆".repeat(5 - n);
    };

    const avgRatingText =
        Number(summary.avgRating) > 0
            ? Number(summary.avgRating).toFixed(1)
            : "-";

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
            color: "#0F172A",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)",
        },

        header: {
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            padding: "34px 38px",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
            border: "1px solid #E2E8F0",
            marginBottom: "24px",
        },

        titleRow: {
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "10px",
        },

        titleIcon: {
            fontSize: "34px",
            lineHeight: 1,
        },

        title: {
            margin: 0,
            fontSize: "34px",
            fontWeight: "900",
            letterSpacing: "-0.8px",
            color: "#0F172A",
        },

        subtitle: {
            color: "#64748B",
            fontSize: "15px",
            fontWeight: "600",
            lineHeight: 1.6,
        },

        summaryGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "18px",
            marginTop: "28px",
        },

        summaryCard: {
            position: "relative",
            backgroundColor: "#EFF6FF",
            borderRadius: "18px",
            padding: "24px",
            border: "1px solid #BFDBFE",
            minHeight: "116px",
            overflow: "hidden",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        },

        summaryLabel: {
            fontSize: "14px",
            color: "#475569",
            fontWeight: "900",
            marginBottom: "10px",
        },

        summaryValue: {
            fontSize: "34px",
            color: "#2563EB",
            fontWeight: "900",
            lineHeight: 1,
        },

        summaryIconCircle: {
            width: "70px",
            height: "70px",
            borderRadius: "50%",
            backgroundColor: "rgba(59, 130, 246, 0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
        },

        listSection: {
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            padding: "28px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
        },

        listHeader: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
        },

        listTitle: {
            margin: 0,
            fontSize: "22px",
            fontWeight: "900",
            color: "#0F172A",
        },

        select: {
            minWidth: "118px",
            height: "42px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            backgroundColor: "#FFFFFF",
            color: "#334155",
            fontWeight: "800",
            padding: "0 12px",
            cursor: "pointer",
            outline: "none",
        },

        reviewGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
            gap: "18px",
        },

        reviewCard: {
            backgroundColor: "#FFFFFF",
            borderRadius: "20px",
            padding: "22px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 8px 22px rgba(15, 23, 42, 0.045)",
            minHeight: "150px",
            display: "flex",
            gap: "16px",
            transition: "0.15s ease",
        },

        avatar: {
            width: "54px",
            height: "54px",
            borderRadius: "18px",
            backgroundColor: "#DBEAFE",
            color: "#2563EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            fontWeight: "900",
            flexShrink: 0,
        },

        reviewMain: {
            flex: 1,
            minWidth: 0,
        },

        reviewTop: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            marginBottom: "8px",
        },

        author: {
            fontWeight: "900",
            color: "#0F172A",
            fontSize: "17px",
            lineHeight: 1.2,
        },

        date: {
            color: "#64748B",
            fontSize: "13px",
            fontWeight: "800",
            whiteSpace: "nowrap",
        },

        stars: {
            color: "#F59E0B",
            fontWeight: "900",
            fontSize: "16px",
            marginBottom: "10px",
        },

        content: {
            color: "#334155",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            fontSize: "15px",
            fontWeight: "600",
        },

        empty: {
            backgroundColor: "#FFFFFF",
            borderRadius: "20px",
            padding: "70px",
            textAlign: "center",
            color: "#94A3B8",
            fontWeight: "900",
            border: "1px solid #E2E8F0",
            boxShadow: "0 8px 22px rgba(15, 23, 42, 0.04)",
        },

        emptyIcon: {
            fontSize: "42px",
            marginBottom: "12px",
        },

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
                    <span style={styles.titleIcon}>⭐</span>
                    <h1 style={styles.title}>리뷰 관리</h1>
                </div>

                <div style={styles.subtitle}>
                    고객이 작성한 내 업체 리뷰를 확인할 수 있습니다. 업체는 리뷰를 삭제하거나 수정할 수 없습니다.
                </div>

                <div style={styles.summaryGrid}>
                    <div style={styles.summaryCard}>
                        <div>
                            <div style={styles.summaryLabel}>평균 별점</div>
                            <div style={styles.summaryValue}>{avgRatingText}</div>
                        </div>

                        <div style={styles.summaryIconCircle}>⭐</div>
                    </div>

                    <div style={styles.summaryCard}>
                        <div>
                            <div style={styles.summaryLabel}>리뷰 수</div>
                            <div style={styles.summaryValue}>{summary.reviewCount}</div>
                        </div>

                        <div style={styles.summaryIconCircle}>💬</div>
                    </div>
                </div>
            </section>

            {errorMessage ? (
                <div style={styles.errorBox}>{errorMessage}</div>
            ) : null}

            {loading ? (
                <div style={styles.empty}>리뷰를 불러오는 중...</div>
            ) : sortedReviews.length === 0 ? (
                <div style={styles.empty}>
                    <div style={styles.emptyIcon}>💬</div>
                    아직 작성된 리뷰가 없습니다.
                </div>
            ) : (
                <section style={styles.listSection}>
                    <div style={styles.listHeader}>
                        <h2 style={styles.listTitle}>리뷰 목록</h2>

                        <select
                            style={styles.select}
                            value={sortType}
                            onChange={(e) => setSortType(e.target.value)}
                        >
                            <option value="latest">최신순</option>
                            <option value="ratingHigh">별점 높은순</option>
                            <option value="ratingLow">별점 낮은순</option>
                        </select>
                    </div>

                    <div style={styles.reviewGrid}>
                        {sortedReviews.map((review) => (
                            <div key={review.id} style={styles.reviewCard}>
                                <div style={styles.avatar}>
                                    {getInitial(review.authorUsername)}
                                </div>

                                <div style={styles.reviewMain}>
                                    <div style={styles.reviewTop}>
                                        <div style={styles.author}>
                                            {review.authorUsername || "익명 사용자"}
                                        </div>

                                        <div style={styles.date}>
                                            {formatCreatedAt(review.createdAt)}
                                        </div>
                                    </div>

                                    <div style={styles.stars}>
                                        {renderStars(review.rating)} ({review.rating}/5)
                                    </div>

                                    <div style={styles.content}>
                                        {review.content || "내용 없음"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}