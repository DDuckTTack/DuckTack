import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getThread, reportThread, sendMessage } from "../../mock/messages";
import ReportModal from "../../components/community/ReportModal";

function formatTime(ts) {
    const date = new Date(ts);
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mi}`;
}

export default function MessageThreadPage() {
    const navigate = useNavigate();
    const { threadId } = useParams();
    const [thread, setThread] = useState(null);
    const [input, setInput] = useState("");
    const [reporting, setReporting] = useState(false);
    const bottomRef = useRef(null);

    const reload = () => setThread(getThread(threadId));

    useEffect(() => {
        reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threadId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [thread?.messages?.length]);

    const submit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage(threadId, input.trim());
        setInput("");
        reload();
    };

    const submitReport = async ({ reason, detail }) => {
        reportThread(threadId, reason, detail);
        setReporting(false);
        window.alert("신고가 접수되었습니다. (데모 데이터)");
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
    };

    if (!thread) {
        return (
            <div style={styles.page}>
                <button style={styles.backBtn} onClick={() => navigate("/company/messages")}>
                    ← 쪽지함
                </button>
                <div style={{ marginTop: 24 }}>대화를 찾을 수 없습니다.</div>
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

            <div style={styles.card}>
                <div style={styles.header}>
                    {thread.counterpartName}
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#94A3B8", marginLeft: 8 }}>
                        {thread.counterpartType === "USER" ? "사용자" : "업체"}
                    </span>
                </div>

                <div style={styles.messages}>
                    {thread.messages.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#94A3B8", fontWeight: 700 }}>
                            대화를 시작해보세요.
                        </div>
                    ) : (
                        thread.messages.map((m) => (
                            <div key={m.id}>
                                <div style={styles.bubbleRow(m.sender === "me")}>
                                    <div style={styles.bubble(m.sender === "me")}>{m.text}</div>
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
