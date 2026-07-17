import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BOARD_TYPES, createPost, getPost, normalizeRegionCode, updatePost } from "../../api/community";

export default function CommunityPostFormPage() {
    const navigate = useNavigate();
    const { postId } = useParams();
    const isEdit = Boolean(postId);

    const [boardType, setBoardType] = useState("FREE");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [regionName, setRegionName] = useState("");
    const [productName, setProductName] = useState("");
    const [loading, setLoading] = useState(isEdit);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!isEdit) return;
        getPost(postId)
            .then((post) => {
                setBoardType(post.boardType);
                setTitle(post.title);
                setContent(post.content);
                setRegionName(post.regionName || post.regionCode || "");
                setProductName(post.productName || "");
            })
            .catch(() => setErrorMessage("게시글을 불러오지 못했습니다."))
            .finally(() => setLoading(false));
    }, [isEdit, postId]);

    const submit = async (e) => {
        e.preventDefault();
        setErrorMessage("");

        if (!title.trim() || !content.trim()) {
            setErrorMessage("제목과 내용을 입력해주세요.");
            return;
        }
        if (boardType === "LOCAL" && !regionName.trim()) {
            setErrorMessage("지역별 커뮤니티는 지역명을 입력해야 합니다.");
            return;
        }

        const payload = {
            boardType,
            title: title.trim(),
            content: content.trim(),
            regionCode: boardType === "LOCAL" ? normalizeRegionCode(regionName) : null,
            regionName: boardType === "LOCAL" ? regionName.trim() : null,
            productName: productName.trim() || null,
        };

        setSubmitting(true);
        try {
            const saved = isEdit ? await updatePost(postId, payload) : await createPost(payload);
            navigate(`/company/community/${saved.postId}`);
        } catch (err) {
            setErrorMessage(err.response?.data?.message || "저장에 실패했습니다.");
        } finally {
            setSubmitting(false);
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
            maxWidth: "760px",
            margin: "0 auto",
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            padding: "34px 38px",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
            border: "1px solid #E2E8F0",
        },
        title: {
            margin: "0 0 24px",
            fontSize: "26px",
            fontWeight: "900",
        },
        label: {
            display: "block",
            fontSize: "13px",
            fontWeight: "800",
            color: "#475569",
            marginBottom: "8px",
            marginTop: "18px",
        },
        select: {
            width: "100%",
            height: "46px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            padding: "0 14px",
            fontWeight: "700",
            boxSizing: "border-box",
        },
        input: {
            width: "100%",
            height: "46px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            padding: "0 14px",
            fontWeight: "600",
            boxSizing: "border-box",
        },
        textarea: {
            width: "100%",
            minHeight: "260px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            padding: "14px",
            fontFamily: "inherit",
            fontSize: "15px",
            resize: "vertical",
            boxSizing: "border-box",
        },
        errorBox: {
            backgroundColor: "#FEF2F2",
            color: "#991B1B",
            border: "1px solid #FECACA",
            borderRadius: "12px",
            padding: "14px",
            fontWeight: "800",
            marginTop: "18px",
        },
        actions: {
            display: "flex",
            gap: "10px",
            marginTop: "26px",
        },
        cancelBtn: {
            flex: 1,
            padding: "14px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            backgroundColor: "#FFFFFF",
            fontWeight: "800",
            cursor: "pointer",
        },
        submitBtn: {
            flex: 2,
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "#0066FF",
            color: "#FFFFFF",
            fontWeight: "800",
            cursor: "pointer",
        },
    };

    if (loading) {
        return <div style={styles.page}>불러오는 중...</div>;
    }

    return (
        <div style={styles.page}>
            <button style={styles.backBtn} onClick={() => navigate(-1)}>
                ← 뒤로
            </button>

            <div style={styles.card}>
                <h1 style={styles.title}>{isEdit ? "✏️ 글 수정" : "✏️ 글쓰기"}</h1>

                <form onSubmit={submit}>
                    <label style={styles.label}>게시판</label>
                    <select
                        style={styles.select}
                        value={boardType}
                        onChange={(e) => setBoardType(e.target.value)}
                    >
                        {BOARD_TYPES.map((b) => (
                            <option key={b.value} value={b.value}>
                                {b.label}
                            </option>
                        ))}
                    </select>

                    {boardType === "LOCAL" ? (
                        <>
                            <label style={styles.label}>지역 (예: 장안구 1동)</label>
                            <input
                                style={styles.input}
                                value={regionName}
                                onChange={(e) => setRegionName(e.target.value)}
                                placeholder="지역명을 입력하세요"
                            />
                        </>
                    ) : null}

                    <label style={styles.label}>제목</label>
                    <input
                        style={styles.input}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={100}
                        placeholder="제목을 입력하세요"
                    />

                    <label style={styles.label}>제품명 (선택)</label>
                    <input
                        style={styles.input}
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        maxLength={120}
                        placeholder="관련 제품명이 있다면 입력하세요"
                    />

                    <label style={styles.label}>내용</label>
                    <textarea
                        style={styles.textarea}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={3000}
                        placeholder="내용을 입력하세요"
                    />

                    {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}

                    <div style={styles.actions}>
                        <button type="button" style={styles.cancelBtn} onClick={() => navigate(-1)}>
                            취소
                        </button>
                        <button type="submit" style={styles.submitBtn} disabled={submitting}>
                            {submitting ? "저장 중..." : isEdit ? "수정 완료" : "등록"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
