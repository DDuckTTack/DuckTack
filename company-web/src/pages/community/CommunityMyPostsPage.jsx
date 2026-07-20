import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { boardTypeLabel, listComments, listPosts } from "../../api/community";

const COMMENT_SCAN_SIZE = 40;

function decodeUsername() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return null;
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.sub || null;
    } catch {
        return null;
    }
}

export default function CommunityMyPostsPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState("posts"); // posts | comments
    const [myPosts, setMyPosts] = useState([]);
    const [myCommentedPosts, setMyCommentedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [scannedCount, setScannedCount] = useState(0);

    const username = decodeUsername();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await listPosts({ size: 100, sort: "latest" });
                const mine = (res.content ?? []).filter((p) => p.authorName === username);
                setMyPosts(mine);
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const scanMyComments = async () => {
        setScanning(true);
        setScannedCount(0);
        try {
            const res = await listPosts({ size: COMMENT_SCAN_SIZE, sort: "latest" });
            const posts = res.content ?? [];
            const results = [];

            for (const post of posts) {
                const comments = await listComments(post.postId);
                setScannedCount((n) => n + 1);
                if (comments.some((c) => c.mine)) {
                    results.push(post);
                }
            }

            setMyCommentedPosts(results);
        } finally {
            setScanning(false);
        }
    };

    useEffect(() => {
        if (tab === "comments" && myCommentedPosts.length === 0) {
            scanMyComments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

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
            padding: "28px 34px",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
            border: "1px solid #E2E8F0",
        },
        title: { margin: "0 0 18px", fontSize: "26px", fontWeight: "900" },
        tabs: { display: "flex", gap: "8px", marginBottom: "18px" },
        tab: (active) => ({
            padding: "10px 18px",
            borderRadius: "999px",
            border: active ? "1px solid #0066FF" : "1px solid #E2E8F0",
            backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
            color: active ? "#0066FF" : "#475569",
            fontWeight: "800",
            cursor: "pointer",
        }),
        note: {
            fontSize: "13px",
            color: "#94A3B8",
            fontWeight: "700",
            marginBottom: "14px",
        },
        row: {
            padding: "16px",
            borderRadius: "14px",
            border: "1px solid #F1F5F9",
            marginBottom: "10px",
            cursor: "pointer",
        },
        rowTitle: { fontWeight: "800", marginBottom: "4px" },
        rowMeta: { fontSize: "12px", color: "#94A3B8", fontWeight: "700" },
        empty: { padding: "40px", textAlign: "center", color: "#94A3B8", fontWeight: "800" },
    };

    const list = tab === "posts" ? myPosts : myCommentedPosts;
    const isLoadingCurrent = tab === "posts" ? loading : scanning;

    return (
        <div style={styles.page}>
            <button style={styles.backBtn} onClick={() => navigate("/company/community")}>
                ← 커뮤니티
            </button>

            <div style={styles.card}>
                <h1 style={styles.title}>내 활동</h1>

                <div style={styles.tabs}>
                    <button style={styles.tab(tab === "posts")} onClick={() => setTab("posts")}>
                        내가 쓴 글
                    </button>
                    <button style={styles.tab(tab === "comments")} onClick={() => setTab("comments")}>
                        내가 댓글 단 글
                    </button>
                </div>

                {tab === "posts" ? (
                    <div style={styles.note}>최근 게시글 100개 범위 내에서 표시됩니다.</div>
                ) : (
                    <div style={styles.note}>
                        최근 게시글 {COMMENT_SCAN_SIZE}개를 기준으로 훑어본 결과입니다
                        {scanning ? ` (${scannedCount}/${COMMENT_SCAN_SIZE} 확인 중...)` : ""}.
                    </div>
                )}

                {isLoadingCurrent ? (
                    <div style={styles.empty}>불러오는 중...</div>
                ) : list.length === 0 ? (
                    <div style={styles.empty}>해당하는 글이 없습니다.</div>
                ) : (
                    list.map((post) => (
                        <div
                            key={post.postId}
                            style={styles.row}
                            onClick={() => navigate(`/company/community/${post.postId}`)}
                        >
                            <div style={styles.rowTitle}>{post.title}</div>
                            <div style={styles.rowMeta}>
                                {boardTypeLabel(post.boardType)} · 👁 {post.viewCount} · 💬 {post.commentCount}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
