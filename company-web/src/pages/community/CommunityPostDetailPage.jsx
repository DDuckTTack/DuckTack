import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    boardTypeLabel,
    createComment,
    deleteComment,
    deletePost,
    getPost,
    likePost,
    listComments,
    reportContent,
    unlikePost,
    updateComment,
} from "../../api/community";
import ReportModal from "../../components/community/ReportModal";

function formatDateTime(value) {
    if (!value) return "-";
    const date = Array.isArray(value)
        ? new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0)
        : new Date(typeof value === "number" ? value * (value < 100000000000 ? 1000 : 1) : value);
    if (Number.isNaN(date.getTime())) return "-";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function CommunityPostDetailPage() {
    const navigate = useNavigate();
    const { postId } = useParams();

    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [commentInput, setCommentInput] = useState("");
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState("");
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [reportTarget, setReportTarget] = useState(null); // { targetType, targetId }
    const [submittingReport, setSubmittingReport] = useState(false);

    const load = async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const [postRes, commentsRes] = await Promise.all([getPost(postId), listComments(postId)]);
            setPost(postRes);
            setComments(commentsRes);
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
    }, [postId]);

    const toggleLike = async () => {
        try {
            const res = post.likedByMe ? await unlikePost(postId) : await likePost(postId);
            setPost((prev) => ({ ...prev, likedByMe: res.likedByMe, likeCount: res.likeCount }));
        } catch {
            setErrorMessage("좋아요 처리에 실패했습니다.");
        }
    };

    const handleDeletePost = async () => {
        if (!window.confirm("게시글을 삭제하시겠습니까?")) return;
        try {
            await deletePost(postId);
            navigate("/company/community");
        } catch {
            setErrorMessage("삭제에 실패했습니다.");
        }
    };

    const submitComment = async (e) => {
        e.preventDefault();
        if (!commentInput.trim()) return;
        try {
            const saved = await createComment(postId, commentInput.trim());
            setComments((prev) => [...prev, saved]);
            setCommentInput("");
            setPost((prev) => ({ ...prev, commentCount: prev.commentCount + 1 }));
        } catch {
            setErrorMessage("댓글 작성에 실패했습니다.");
        }
    };

    const startEditComment = (comment) => {
        setEditingCommentId(comment.commentId);
        setEditingCommentText(comment.content);
    };

    const saveEditComment = async (commentId) => {
        if (!editingCommentText.trim()) return;
        try {
            const saved = await updateComment(commentId, editingCommentText.trim());
            setComments((prev) => prev.map((c) => (c.commentId === commentId ? saved : c)));
            setEditingCommentId(null);
        } catch {
            setErrorMessage("댓글 수정에 실패했습니다.");
        }
    };

    const removeComment = async (commentId) => {
        if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
        try {
            await deleteComment(commentId);
            setComments((prev) => prev.filter((c) => c.commentId !== commentId));
            setPost((prev) => ({ ...prev, commentCount: Math.max(0, prev.commentCount - 1) }));
        } catch {
            setErrorMessage("댓글 삭제에 실패했습니다.");
        }
    };

    const submitReport = async ({ reason, detail }) => {
        setSubmittingReport(true);
        try {
            await reportContent({
                targetType: reportTarget.targetType,
                targetId: reportTarget.targetId,
                reason,
                detail,
            });
            setReportTarget(null);
            window.alert("신고가 접수되었습니다.");
        } finally {
            setSubmittingReport(false);
        }
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
        },
        card: {
            maxWidth: "820px",
            margin: "0 auto",
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            padding: "34px 38px",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
            border: "1px solid #E2E8F0",
            marginBottom: "20px",
        },
        badge: {
            fontSize: "12px",
            fontWeight: "900",
            color: "#0066FF",
            backgroundColor: "#EFF6FF",
            borderRadius: "8px",
            padding: "6px 10px",
            display: "inline-block",
            marginBottom: "12px",
        },
        title: { margin: "0 0 12px", fontSize: "28px", fontWeight: "900" },
        meta: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#64748B",
            fontSize: "14px",
            fontWeight: "700",
            marginBottom: "20px",
            paddingBottom: "20px",
            borderBottom: "1px solid #F1F5F9",
        },
        content: {
            fontSize: "16px",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            color: "#1E293B",
            minHeight: "120px",
        },
        actionsRow: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid #F1F5F9",
        },
        likeBtn: (liked) => ({
            padding: "10px 18px",
            borderRadius: "999px",
            border: liked ? "1px solid #DC2626" : "1px solid #CBD5E1",
            backgroundColor: liked ? "#FEF2F2" : "#FFFFFF",
            color: liked ? "#DC2626" : "#334155",
            fontWeight: "800",
            cursor: "pointer",
        }),
        rightActions: { display: "flex", gap: "8px" },
        smallBtn: {
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid #CBD5E1",
            backgroundColor: "#FFFFFF",
            fontWeight: "800",
            cursor: "pointer",
            fontSize: "13px",
        },
        dangerBtn: {
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid #FCA5A5",
            backgroundColor: "#FFFFFF",
            color: "#DC2626",
            fontWeight: "800",
            cursor: "pointer",
            fontSize: "13px",
        },
        commentsCard: {
            maxWidth: "820px",
            margin: "0 auto",
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            padding: "28px 38px",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
            border: "1px solid #E2E8F0",
        },
        commentsTitle: { fontSize: "18px", fontWeight: "900", marginBottom: "16px" },
        comment: {
            padding: "14px 0",
            borderBottom: "1px solid #F1F5F9",
        },
        commentTop: {
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "6px",
        },
        commentAuthor: { fontWeight: "800", fontSize: "14px" },
        commentDate: { fontSize: "12px", color: "#94A3B8", fontWeight: "700" },
        commentContent: { fontSize: "14px", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" },
        commentActions: { display: "flex", gap: "8px", marginTop: "6px" },
        commentLink: {
            background: "none",
            border: "none",
            color: "#64748B",
            fontSize: "12px",
            fontWeight: "800",
            cursor: "pointer",
            padding: 0,
        },
        commentForm: { display: "flex", gap: "10px", marginTop: "18px" },
        commentInput: {
            flex: 1,
            height: "44px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            padding: "0 14px",
            boxSizing: "border-box",
        },
        commentSubmit: {
            padding: "0 20px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "#0066FF",
            color: "#FFFFFF",
            fontWeight: "800",
            cursor: "pointer",
        },
        errorBox: {
            maxWidth: "820px",
            margin: "0 auto 18px",
            backgroundColor: "#FEF2F2",
            color: "#991B1B",
            border: "1px solid #FECACA",
            borderRadius: "16px",
            padding: "18px",
            fontWeight: "800",
        },
        editRow: { display: "flex", gap: "8px", marginTop: "6px" },
        editInput: {
            flex: 1,
            height: "36px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            padding: "0 10px",
        },
    };

    if (loading) return <div style={styles.page}>불러오는 중...</div>;
    if (!post) return <div style={styles.page}>{errorMessage || "게시글을 찾을 수 없습니다."}</div>;

    return (
        <div style={styles.page}>
            <button style={styles.backBtn} onClick={() => navigate("/company/community")}>
                ← 커뮤니티
            </button>

            {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}

            <div style={styles.card}>
                <span style={styles.badge}>{boardTypeLabel(post.boardType)}</span>
                <h1 style={styles.title}>{post.title}</h1>
                <div style={styles.meta}>
                    <span>
                        {post.authorName}
                        {post.regionName ? ` · ${post.regionName}` : ""} · {formatDateTime(post.createdAt)}
                    </span>
                    <span>
                        👁 {post.viewCount} · 💬 {post.commentCount}
                    </span>
                </div>

                <div style={styles.content}>{post.content}</div>

                <div style={styles.actionsRow}>
                    <button style={styles.likeBtn(post.likedByMe)} onClick={toggleLike}>
                        {post.likedByMe ? "❤️" : "🤍"} 좋아요 {post.likeCount}
                    </button>

                    <div style={styles.rightActions}>
                        <button
                            style={styles.smallBtn}
                            onClick={() => setReportTarget({ targetType: "POST", targetId: post.postId })}
                        >
                            🚨 신고
                        </button>
                        {post.editable ? (
                            <button
                                style={styles.smallBtn}
                                onClick={() => navigate(`/company/community/${post.postId}/edit`)}
                            >
                                수정
                            </button>
                        ) : null}
                        {post.deletable ? (
                            <button style={styles.dangerBtn} onClick={handleDeletePost}>
                                삭제
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            <div style={styles.commentsCard}>
                <div style={styles.commentsTitle}>댓글 {comments.length}</div>

                {comments.map((c) => (
                    <div key={c.commentId} style={styles.comment}>
                        <div style={styles.commentTop}>
                            <span style={styles.commentAuthor}>{c.authorName}</span>
                            <span style={styles.commentDate}>{formatDateTime(c.createdAt)}</span>
                        </div>

                        {editingCommentId === c.commentId ? (
                            <div style={styles.editRow}>
                                <input
                                    style={styles.editInput}
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                />
                                <button
                                    style={styles.commentLink}
                                    onClick={() => saveEditComment(c.commentId)}
                                >
                                    저장
                                </button>
                                <button style={styles.commentLink} onClick={() => setEditingCommentId(null)}>
                                    취소
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={styles.commentContent}>{c.content}</div>
                                <div style={styles.commentActions}>
                                    <button
                                        style={styles.commentLink}
                                        onClick={() =>
                                            setReportTarget({ targetType: "COMMENT", targetId: c.commentId })
                                        }
                                    >
                                        🚨 신고
                                    </button>
                                    {c.mine ? (
                                        <>
                                            <button style={styles.commentLink} onClick={() => startEditComment(c)}>
                                                수정
                                            </button>
                                            <button
                                                style={styles.commentLink}
                                                onClick={() => removeComment(c.commentId)}
                                            >
                                                삭제
                                            </button>
                                        </>
                                    ) : null}
                                </div>
                            </>
                        )}
                    </div>
                ))}

                <form style={styles.commentForm} onSubmit={submitComment}>
                    <input
                        style={styles.commentInput}
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="댓글을 입력하세요"
                        maxLength={1000}
                    />
                    <button type="submit" style={styles.commentSubmit}>
                        등록
                    </button>
                </form>
            </div>

            {reportTarget ? (
                <ReportModal
                    title={reportTarget.targetType === "POST" ? "게시글 신고" : "댓글 신고"}
                    submitting={submittingReport}
                    onSubmit={submitReport}
                    onClose={() => setReportTarget(null)}
                />
            ) : null}
        </div>
    );
}
