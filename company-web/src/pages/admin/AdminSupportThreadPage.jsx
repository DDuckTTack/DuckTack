import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getThread, listMessages, sendMessage } from "../../api/support";

const POLL_INTERVAL_MS = 1000;

function formatTime(value) {
    const date = new Date(typeof value === "number" ? value * 1000 : value);
    if (Number.isNaN(date.getTime())) return "";
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mi}`;
}

const STATUS_LABEL = { PENDING: "대기중", ANSWERED: "답변완료" };

export default function AdminSupportThreadPage() {
    const navigate = useNavigate();
    const { threadId } = useParams();
    const [thread, setThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const bottomRef = useRef(null);
    const lastIdRef = useRef(null);
    const pollTimerRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setErrorMessage("");
        lastIdRef.current = null;

        Promise.all([getThread(threadId), listMessages(threadId)])
            .then(([t, msgs]) => {
                if (cancelled) return;
                setThread(t);
                setMessages(msgs);
                if (msgs.length > 0) lastIdRef.current = msgs[msgs.length - 1].id;
            })
            .catch((err) => {
                if (!cancelled) {
                    setErrorMessage(err.response?.data?.message || "문의를 불러오지 못했습니다.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [threadId]);

    useEffect(() => {
        const poll = async () => {
            if (document.hidden || lastIdRef.current === null) return;
            try {
                const fresh = await listMessages(threadId, { afterId: lastIdRef.current });
                if (fresh.length > 0) {
                    setMessages((prev) => [...prev, ...fresh]);
                    lastIdRef.current = fresh[fresh.length - 1].id;
                }
            } catch {
                // transient polling failure — retry on next tick
            }
        };

        pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
        return () => clearInterval(pollTimerRef.current);
    }, [threadId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const submit = async (e) => {
        e.preventDefault();
        const content = input.trim();
        if (!content) return;
        try {
            const saved = await sendMessage(threadId, content);
            setInput("");
            setMessages((prev) => [...prev, saved]);
            lastIdRef.current = saved.id;
            setThread((prev) => (prev ? { ...prev, status: "ANSWERED" } : prev));
        } catch (err) {
            setErrorMessage(err.response?.data?.message || "메시지 전송에 실패했습니다.");
        }
    };

    const styles = {
        page: {
            minHeight: "100vh",
            backgroundColor: "#F8FAFC",
            padding: "32px 48px",
            fontFamily: "'Pretendard', sans-serif",
            color: "#0F172A",
            display: "flex",
            flexDirection: "column",
        },
        topBar: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
        },
        backBtn: {
            backgroundColor: "#FFFFFF",
            border: "1px solid #CBD5E1",
            borderRadius: "12px",
            padding: "11px 16px",
            fontWeight: "900",
            cursor: "pointer",
        },
        layout: {
            display: "flex",
            gap: "20px",
            maxWidth: "980px",
            width: "100%",
            margin: "0 auto",
            flex: 1,
        },
        userCard: {
            width: "260px",
            flexShrink: 0,
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
            padding: "24px",
            height: "fit-content",
        },
        userName: { fontSize: "18px", fontWeight: "900", marginBottom: "10px" },
        userStatus: (status) => ({
            display: "inline-block",
            fontSize: "12px",
            fontWeight: "800",
            color: status === "PENDING" ? "#B91C1C" : "#15803D",
            backgroundColor: status === "PENDING" ? "#FEE2E2" : "#DCFCE7",
            borderRadius: "8px",
            padding: "4px 10px",
            marginBottom: "18px",
        }),
        userInfoRow: { fontSize: "13px", color: "#475569", marginBottom: "8px" },
        userInfoLabel: { color: "#94A3B8", fontWeight: "700", marginRight: "6px" },
        card: {
            flex: 1,
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
        },
        messages: {
            flex: 1,
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: "360px",
            maxHeight: "520px",
        },
        bubbleRow: (mine) => ({
            display: "flex",
            justifyContent: mine ? "flex-end" : "flex-start",
        }),
        bubble: (mine) => ({
            maxWidth: "70%",
            padding: "12px 16px",
            borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            backgroundColor: mine ? "#0066FF" : "#F1F5F9",
            color: mine ? "#FFFFFF" : "#0F172A",
            fontSize: "14px",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
        }),
        time: {
            fontSize: "11px",
            color: "#94A3B8",
            fontWeight: "700",
            marginTop: "4px",
            textAlign: "center",
        },
        form: {
            display: "flex",
            gap: "10px",
            padding: "16px 20px",
            borderTop: "1px solid #F1F5F9",
        },
        input: {
            flex: 1,
            height: "46px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            padding: "0 14px",
            boxSizing: "border-box",
        },
        sendBtn: {
            padding: "0 22px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "#0066FF",
            color: "#FFFFFF",
            fontWeight: "800",
            cursor: "pointer",
        },
        errorBox: {
            maxWidth: "980px",
            margin: "0 auto 18px",
            backgroundColor: "#FEF2F2",
            color: "#991B1B",
            border: "1px solid #FECACA",
            borderRadius: "16px",
            padding: "18px",
            fontWeight: "800",
            width: "100%",
            boxSizing: "border-box",
        },
    };

    if (loading) return <div style={styles.page}>불러오는 중...</div>;

    if (!thread) {
        return (
            <div style={styles.page}>
                <button style={styles.backBtn} onClick={() => navigate("/admin/support")}>
                    ← 고객센터
                </button>
                <div style={{ marginTop: 24 }}>{errorMessage || "문의를 찾을 수 없습니다."}</div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.topBar}>
                <button style={styles.backBtn} onClick={() => navigate("/admin/support")}>
                    ← 고객센터
                </button>
            </div>

            {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}

            <div style={styles.layout}>
                <div style={styles.userCard}>
                    <div style={styles.userName}>{thread.username}</div>
                    <div style={styles.userStatus(thread.status)}>{STATUS_LABEL[thread.status] || thread.status}</div>
                    <div style={styles.userInfoRow}>
                        <span style={styles.userInfoLabel}>연락처</span>{thread.phoneNumber || "-"}
                    </div>
                    <div style={styles.userInfoRow}>
                        <span style={styles.userInfoLabel}>이메일</span>{thread.email || "-"}
                    </div>
                    <div style={styles.userInfoRow}>
                        <span style={styles.userInfoLabel}>주소</span>{thread.address || "-"}
                    </div>
                </div>

                <div style={styles.card}>
                    <div style={styles.messages}>
                        {messages.length === 0 ? (
                            <div style={{ textAlign: "center", color: "#94A3B8", fontWeight: 700 }}>
                                아직 문의 내용이 없습니다.
                            </div>
                        ) : (
                            messages.map((m) => {
                                const mine = m.senderRole === "ADMIN";
                                return (
                                    <div key={m.id}>
                                        <div style={styles.bubbleRow(mine)}>
                                            <div style={styles.bubble(mine)}>{m.content}</div>
                                        </div>
                                        <div style={styles.time}>{formatTime(m.createdAt)}</div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <form style={styles.form} onSubmit={submit}>
                        <input
                            style={styles.input}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="답변을 입력하세요"
                            maxLength={2000}
                        />
                        <button type="submit" style={styles.sendBtn}>
                            전송
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
