import { useEffect, useState } from "react";
import {
    BOARD_TYPES,
    boardTypeLabel,
    deleteComment,
    deletePost,
    getPost,
    listComments,
    listPosts,
} from "../../api/community";

export default function AdminCommunityPage() {
    const [boardType, setBoardType] = useState("");
    const [sort, setSort] = useState("latest");
    const [page, setPage] = useState(0);
    const [data, setData] = useState({ content: [], totalPages: 0 });
    const [loading, setLoading] = useState(false);

    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [comments, setComments] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadList = async () => {
        setLoading(true);
        try {
            const res = await listPosts({ boardType: boardType || undefined, sort, page, size: 15 });
            setData(res);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boardType, sort, page]);

    const openDetail = async (postId) => {
        setSelectedId(postId);
        setDetailLoading(true);
        try {
            const [postRes, commentsRes] = await Promise.all([getPost(postId), listComments(postId)]);
            setDetail(postRes);
            setComments(commentsRes);
        } finally {
            setDetailLoading(false);
        }
    };

    const removePost = async () => {
        if (!window.confirm("이 게시글을 삭제하시겠습니까?")) return;
        await deletePost(selectedId);
        setSelectedId(null);
        setDetail(null);
        loadList();
    };

    const removeComment = async (commentId) => {
        if (!window.confirm("이 댓글을 삭제하시겠습니까?")) return;
        await deleteComment(commentId);
        setComments((prev) => prev.filter((c) => c.commentId !== commentId));
    };

    const styles = {
        page: { fontFamily: "'Pretendard', sans-serif", color: "#0F172A" },
        title: { fontSize: "28px", fontWeight: "900", marginBottom: "6px" },
        subtitle: { color: "#64748B", fontSize: "14px", fontWeight: "600", marginBottom: "20px" },
        toolbar: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" },
        tab: (active) => ({
            padding: "9px 14px",
            borderRadius: "999px",
            border: active ? "1px solid #0066FF" : "1px solid #E2E8F0",
            backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
            color: active ? "#0066FF" : "#475569",
            fontWeight: "800",
            fontSize: "13px",
            cursor: "pointer",
        }),
        select: {
            height: "38px",
            borderRadius: "10px",
            border: "1px solid #CBD5E1",
            padding: "0 10px",
            fontWeight: "700",
            marginLeft: "auto",
        },
        layout: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" },
        listCard: {
            backgroundColor: "#FFFFFF",
            borderRadius: "20px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
            padding: "8px",
        },
        row: (active) => ({
            padding: "14px 16px",
            borderRadius: "12px",
            cursor: "pointer",
            backgroundColor: active ? "#EFF6FF" : "transparent",
            marginBottom: "4px",
        }),
        rowTitle: { fontWeight: "800", fontSize: "14px", marginBottom: "4px" },
        rowMeta: { fontSize: "12px", color: "#94A3B8", fontWeight: "700" },
        pagination: { display: "flex", justifyContent: "center", gap: "6px", marginTop: "12px" },
        pageBtn: (active) => ({
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            border: active ? "1px solid #0066FF" : "1px solid #E2E8F0",
            backgroundColor: active ? "#0066FF" : "#FFFFFF",
            color: active ? "#FFFFFF" : "#334155",
            fontWeight: "800",
            fontSize: "12px",
            cursor: "pointer",
        }),
        detailCard: {
            backgroundColor: "#FFFFFF",
            borderRadius: "20px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
            padding: "24px",
            position: "sticky",
            top: "20px",
        },
        emptyDetail: { padding: "60px 20px", textAlign: "center", color: "#94A3B8", fontWeight: "800" },
        detailTitle: { fontSize: "18px", fontWeight: "900", marginBottom: "8px" },
        reportBadge: {
            display: "inline-block",
            fontSize: "12px",
            fontWeight: "900",
            color: "#DC2626",
            backgroundColor: "#FEF2F2",
            borderRadius: "8px",
            padding: "4px 10px",
            marginBottom: "10px",
        },
        detailMeta: { fontSize: "13px", color: "#64748B", fontWeight: "700", marginBottom: "14px" },
        detailContent: {
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#1E293B",
            whiteSpace: "pre-wrap",
            marginBottom: "16px",
            paddingBottom: "16px",
            borderBottom: "1px solid #F1F5F9",
        },
        dangerBtn: {
            padding: "10px 16px",
            borderRadius: "10px",
            border: "1px solid #FCA5A5",
            backgroundColor: "#FFFFFF",
            color: "#DC2626",
            fontWeight: "800",
            cursor: "pointer",
            marginBottom: "16px",
        },
        commentTitle: { fontWeight: "900", fontSize: "14px", marginBottom: "8px" },
        comment: {
            padding: "10px 0",
            borderBottom: "1px solid #F8FAFC",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "10px",
        },
        commentAuthor: { fontWeight: "800", fontSize: "12px", marginBottom: "2px" },
        commentContent: { fontSize: "13px", color: "#334155" },
        commentReport: { fontSize: "11px", color: "#DC2626", fontWeight: "800" },
        smallDanger: {
            fontSize: "11px",
            color: "#DC2626",
            background: "none",
            border: "1px solid #FCA5A5",
            borderRadius: "6px",
            padding: "4px 8px",
            cursor: "pointer",
            flexShrink: 0,
        },
    };

    return (
        <div style={styles.page}>
            <h1 style={styles.title}>💬 커뮤니티 관리</h1>
            <div style={styles.subtitle}>
                게시글을 선택해 상세 내용과 댓글을 확인하고 관리할 수 있습니다.
            </div>

            <div style={styles.toolbar}>
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
                <select style={styles.select} value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="latest">최신순</option>
                    <option value="views">조회순</option>
                    <option value="likes">인기순</option>
                </select>
            </div>

            <div style={styles.layout}>
                <div style={styles.listCard}>
                    {loading ? (
                        <div style={styles.emptyDetail}>불러오는 중...</div>
                    ) : (data.content ?? []).length === 0 ? (
                        <div style={styles.emptyDetail}>게시글이 없습니다.</div>
                    ) : (
                        data.content.map((post) => (
                            <div
                                key={post.postId}
                                style={styles.row(post.postId === selectedId)}
                                onClick={() => openDetail(post.postId)}
                            >
                                <div style={styles.rowTitle}>{post.title}</div>
                                <div style={styles.rowMeta}>
                                    {boardTypeLabel(post.boardType)} · {post.authorName} · 👁 {post.viewCount} · 💬{" "}
                                    {post.commentCount}
                                </div>
                            </div>
                        ))
                    )}

                    {(data.totalPages ?? 0) > 1 ? (
                        <div style={styles.pagination}>
                            {Array.from({ length: data.totalPages }).map((_, idx) => (
                                <button key={idx} style={styles.pageBtn(idx === page)} onClick={() => setPage(idx)}>
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div style={styles.detailCard}>
                    {!selectedId ? (
                        <div style={styles.emptyDetail}>왼쪽에서 게시글을 선택하세요.</div>
                    ) : detailLoading || !detail ? (
                        <div style={styles.emptyDetail}>불러오는 중...</div>
                    ) : (
                        <>
                            {detail.reportCount > 0 ? (
                                <div style={styles.reportBadge}>🚨 신고 {detail.reportCount}건</div>
                            ) : null}
                            <div style={styles.detailTitle}>{detail.title}</div>
                            <div style={styles.detailMeta}>
                                {boardTypeLabel(detail.boardType)} · {detail.authorName}
                                {detail.regionName ? ` · ${detail.regionName}` : ""}
                            </div>
                            <div style={styles.detailContent}>{detail.content}</div>

                            <button style={styles.dangerBtn} onClick={removePost}>
                                게시글 삭제
                            </button>

                            <div style={styles.commentTitle}>댓글 {comments.length}</div>
                            {comments.length === 0 ? (
                                <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 700 }}>댓글 없음</div>
                            ) : (
                                comments.map((c) => (
                                    <div key={c.commentId} style={styles.comment}>
                                        <div>
                                            <div style={styles.commentAuthor}>
                                                {c.authorName}
                                                {c.reportCount > 0 ? (
                                                    <span style={styles.commentReport}> · 신고 {c.reportCount}건</span>
                                                ) : null}
                                            </div>
                                            <div style={styles.commentContent}>{c.content}</div>
                                        </div>
                                        <button
                                            style={styles.smallDanger}
                                            onClick={() => removeComment(c.commentId)}
                                        >
                                            삭제
                                        </button>
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
