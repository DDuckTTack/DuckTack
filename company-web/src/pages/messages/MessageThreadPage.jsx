import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getConversation, listMessages, reportMessage, sendMessage } from "../../api/messages";
import ReportModal from "../../components/community/ReportModal";

const POLL_INTERVAL_MS = 1000;

function formatTime(value) {
    // backend sends OffsetDateTime as epoch seconds (with fractional nanos) instead of
    // an ISO string in practice, despite the documented contract — normalize both.
    const date = new Date(typeof value === "number" ? value * 1000 : value);
    if (Number.isNaN(date.getTime())) return "";
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mi}`;
}

export default function MessageThreadPage() {
    const navigate = useNavigate();
    const { threadId } = useParams();
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [reporting, setReporting] = useState(false);
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

        Promise.all([getConversation(threadId), listMessages(threadId)])
            .then(([conv, msgs]) => {
                if (cancelled) return;
                setConversation(conv);
                setMessages(msgs);
                if (msgs.length > 0) lastIdRef.current = msgs[msgs.length - 1].id;
            })
            .catch((err) => {
                if (!cancelled) {
                    setErrorMessage(err.response?.data?.message || "대화를 불러오지 못했습니다.");
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
        } catch (err) {
            setErrorMessage(err.response?.data?.message || "메시지 전송에 실패했습니다.");
        }
    };

    const submitReport = async ({ reason, detail }) => {
        await reportMessage({ conversationId: Number(threadId), reason, detail });
        setReporting(false);
        window.alert("신고가 접수되었습니다.");
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
        reportBtn: {
            backgroundColor: "#FFFFFF",
            border: "1px solid #FCA5A5",
            color: "#DC2626",
            borderRadius: "12px",
            padding: "11px 16px",
            fontWeight: "900",
            cursor: "pointer",
        },
        card: {
            flex: 1,
            maxWidth: "760px",
            width: "100%",
            margin: "0 auto",
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
        },
        header: {
            padding: "20px 24px",
            borderBottom: "1px solid #F1F5F9",
            fontWeight: "900",
            fontSize: "18px",
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
            maxWidth: "760px",
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

    if (!conversation) {
        return (
            <div style={styles.page}>
                <button style={styles.backBtn} onClick={() => navigate("/company/messages")}>
                    ← 쪽지함
                </button>
                <div style={{ marginTop: 24 }}>{errorMessage || "대화를 찾을 수 없습니다."}</div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.topBar}>
                <button style={styles.backBtn} onClick={() => navigate("/company/messages")}>
                    ← 쪽지함
                </button>
                <button style={styles.reportBtn} onClick={() => setReporting(true)}>
                    🚨 신고
                </button>
            </div>

            {errorMessage ? <div style={styles.errorBox}>{errorMessage}</div> : null}

            <div style={styles.card}>
                <div style={styles.header}>
                    {conversation.otherDisplayName}
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#94A3B8", marginLeft: 8 }}>
                        {conversation.otherIsCompany ? "업체" : "사용자"}
                    </span>
                </div>

                <div style={styles.messages}>
                    {messages.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#94A3B8", fontWeight: 700 }}>
                            대화를 시작해보세요.
                        </div>
                    ) : (
                        messages.map((m) => (
                            <div key={m.id}>
                                <div style={styles.bubbleRow(m.mine)}>
                                    <div style={styles.bubble(m.mine)}>{m.content}</div>
                                </div>
                                <div style={styles.time}>{formatTime(m.createdAt)}</div>
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>

                <form style={styles.form} onSubmit={submit}>
                    <input
                        style={styles.input}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="메시지를 입력하세요"
                        maxLength={2000}
                    />
                    <button type="submit" style={styles.sendBtn}>
                        전송
                    </button>
                </form>
            </div>

            {reporting ? (
                <ReportModal
                    title="쪽지 신고"
                    onSubmit={submitReport}
                    onClose={() => setReporting(false)}
                />
            ) : null}
        </div>
    );
}
