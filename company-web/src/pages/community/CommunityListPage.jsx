import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BOARD_TYPES, boardTypeLabel, listPosts } from "../../api/community";

function formatDate(value) {
    if (!value) return "-";
    const date = Array.isArray(value)
        ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0)
        : new Date(typeof value === "number" ? value * (value < 100000000000 ? 1000 : 1) : value);
    if (Number.isNaN(date.getTime())) return "-";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export default function CommunityListPage() {
    const navigate = useNavigate();

    const [boardType, setBoardType] = useState("");
    const [keyword, setKeyword] = useState("");
    const [keywordInput, setKeywordInput] = useState("");
    const [regionCode, setRegionCode] = useState("");
    const [regionInput, setRegionInput] = useState("");
    const [sort, setSort] = useState("latest");
    const [page, setPage] = useState(0);

    const [data, setData] = useState({ content: [], totalPages: 0, number: 0 });
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const load = async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const res = await listPosts({
                boardType: boardType || undefined,
                keyword,
                regionCode: regionCode || undefined,
                page,
                size: 12,
                sort,
            });
            setData(res);
        } catch (err) {
            if (err.response?.status === 401) {
                localStorage.clear();
                navigate("/");
                return;
            }
            setErrorMessage(err.response?.data?.message || "게시글을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boardType, keyword, regionCode, sort, page]);

    const submitSearch = (e) => {
        e.preventDefault();
        setPage(0);
        setKeyword(keywordInput.trim());
        setRegionCode(regionInput.trim());
    };

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
            justifyContent: "space-between",
            marginBottom: "18px",
            flexWrap: "wrap",
            gap: "12px",
        },
        title: {
            margin: 0,
            fontSize: "34px",
            fontWeight: "900",
            letterSpacing: "-0.8px",
        },
        headerActions: {
            display: "flex",
            gap: "10px",
        },
        actionBtn: {
            padding: "12px 18px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            backgroundColor: "#FFFFFF",
            fontWeight: "800",
            cursor: "pointer",
        },
        primaryBtn: {
            padding: "12px 18px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "#0066FF",
            color: "#FFFFFF",
            fontWeight: "800",
            cursor: "pointer",
        },
        tabs: {
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "18px",
        },
        tab: (active) => ({
            padding: "10px 16px",
            borderRadius: "999px",
            border: active ? "1px solid #0066FF" : "1px solid #E2E8F0",
            backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
            color: active ? "#0066FF" : "#475569",
            fontWeight: "800",
            fontSize: "14px",
            cursor: "pointer",
        }),
        searchForm: {
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
        },
        input: {
            flex: 1,
            minWidth: "200px",
            height: "44px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            padding: "0 14px",
            fontWeight: "600",
            boxSizing: "border-box",
        },
        regionInput: {
            width: "180px",
            height: "44px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            padding: "0 14px",
            fontWeight: "600",
            boxSizing: "border-box",
        },
        select: {
            height: "44px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            padding: "0 12px",
            fontWeight: "800",
            backgroundColor: "#FFFFFF",
        },
        searchBtn: {
            height: "44px",
            padding: "0 20px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "#0F172A",
            color: "#FFFFFF",
            fontWeight: "800",
            cursor: "pointer",
        },
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
        badge: {
            flexShrink: 0,
            fontSize: "12px",
            fontWeight: "900",
            color: "#0066FF",
            backgroundColor: "#EFF6FF",
            borderRadius: "8px",
            padding: "6px 10px",
        },
        rowMain: { flex: 1, minWidth: 0 },
        rowTitle: {
            fontWeight: "800",
            fontSize: "16px",
            color: "#0F172A",
            marginBottom: "4px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
        },
        rowMeta: {
            fontSize: "13px",
            color: "#64748B",
            fontWeight: "600",
        },
        rowStats: {
            flexShrink: 0,
            display: "flex",
            gap: "14px",
            fontSize: "13px",
            color: "#94A3B8",
            fontWeight: "800",
        },
        empty: {
            padding: "70px",
            textAlign: "center",
            color: "#94A3B8",
            fontWeight: "900",
        },
        pagination: {
            display: "flex",
            justifyContent: "center",
            gap: "8px",
            marginTop: "20px",
        },
        pageBtn: (active) => ({
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            border: active ? "1px solid #0066FF" : "1px solid #E2E8F0",
            backgroundColor: active ? "#0066FF" : "#FFFFFF",
            color: active ? "#FFFFFF" : "#334155",
            fontWeight: "800",
            cursor: "pointer",
        }),
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

    const totalPages = data.totalPages ?? 0;

    return (
        <div style={styles.page}>
            <button style={styles.backBtn} onClick={() => navigate("/company")}>
                ← 파트너 센터
            </button>

            <section style={styles.header}>
                <div style={styles.titleRow}>
                    <h1 style={styles.title}>💬 커뮤니티</h1>
                    <div style={styles.headerActions}>
                        <button
                            type="button"
                            style={styles.actionBtn}
                            onClick={() => navigate("/company/community/mine")}
                        >
                            내 글/댓글
                        </button>
                        <button
                            type="button"
                            style={styles.primaryBtn}
                            onClick={() => navigate("/company/community/new")}
                        >
                            ✏️ 글쓰기
                        </button>
                    </div>
                </div>

                <div style={styles.tabs}>
                    <button style={styles.tab(boardType === "")} onClick={() => { setBoardType(""); setPage(0); }}>
                        전체
                    </button>
                    {BOARD_TYPES.map((b) => (
                        <button
                            key={b.value}
                            style={styles.tab(boardType === b.value)}
                            onClick={() => { setBoardType(b.value); setPage(0); }}
                        >
                            {b.label}
                        </button>
                    ))}
                </div>

                <form style={styles.searchForm} onSubmit={submitSearch}>
                    <input
                        style={styles.input}
                        placeholder="검색어를 입력하세요"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                    />
                    <input
                        style={styles.regionInput}
                        placeholder="지역 (예: 장안구 1동)"
                        value={regionInput}
                        onChange={(e) => setRegionInput(e.target.value)}
                    />
                    <select
                        style={styles.select}
                        value={sort}
                        onChange={(e) => { setSort(e.target.value); setPage(0); }}
                    >
                        <option value="latest">최신순</option>
                        <option value="views">조회순</option>
                        <option value="likes">인기순</option>
                    </select>
                    <button type="submit" style={styles.searchBtn}>
                        검색
                    </button>
                </form>
            </section>

            {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}

            <section style={styles.listSection}>
                {loading ? (
                    <div style={styles.empty}>불러오는 중...</div>
                ) : (data.content ?? []).length === 0 ? (
                    <div style={styles.empty}>게시글이 없습니다.</div>
                ) : (
                    data.content.map((post) => (
                        <div
                            key={post.postId}
                            style={styles.row}
                            onClick={() => navigate(`/company/community/${post.postId}`)}
                        >
                            <span style={styles.badge}>{boardTypeLabel(post.boardType)}</span>
                            <div style={styles.rowMain}>
                                <div style={styles.rowTitle}>{post.title}</div>
                                <div style={styles.rowMeta}>
                                    {post.authorName}
                                    {post.regionName ? ` · ${post.regionName}` : ""} · {formatDate(post.createdAt)}
                                </div>
                            </div>
                            <div style={styles.rowStats}>
                                <span>👁 {post.viewCount}</span>
                                <span>❤️ {post.likeCount}</span>
                                <span>💬 {post.commentCount}</span>
                            </div>
                        </div>
                    ))
                )}
            </section>

            {totalPages > 1 ? (
                <div style={styles.pagination}>
                    {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                            key={idx}
                            style={styles.pageBtn(idx === page)}
                            onClick={() => setPage(idx)}
                        >
                            {idx + 1}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
