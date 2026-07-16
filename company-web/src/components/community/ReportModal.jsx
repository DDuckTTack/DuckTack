import { useState } from "react";
import { REPORT_REASONS } from "../../api/community";

export default function ReportModal({ title = "신고하기", onSubmit, onClose, submitting }) {
    const [reason, setReason] = useState("SPAM");
    const [detail, setDetail] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        setError("");
        try {
            await onSubmit({ reason, detail: detail.trim() });
        } catch (err) {
            setError(err?.response?.data?.message || "신고 접수에 실패했습니다.");
        }
    };

    const styles = {
        overlay: {
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
        },
        modal: {
            width: "420px",
            maxWidth: "90vw",
            backgroundColor: "#FFFFFF",
            borderRadius: "20px",
            padding: "28px",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
        },
        title: {
            fontSize: "20px",
            fontWeight: "900",
            color: "#0F172A",
            marginBottom: "18px",
        },
        label: {
            fontSize: "13px",
            fontWeight: "800",
            color: "#475569",
            marginBottom: "8px",
            display: "block",
        },
        select: {
            width: "100%",
            height: "44px",
            borderRadius: "10px",
            border: "1px solid #CBD5E1",
            padding: "0 12px",
            fontWeight: "700",
            marginBottom: "16px",
            boxSizing: "border-box",
        },
        textarea: {
            width: "100%",
            minHeight: "90px",
            borderRadius: "10px",
            border: "1px solid #CBD5E1",
            padding: "10px 12px",
            fontFamily: "inherit",
            fontSize: "14px",
            resize: "vertical",
            boxSizing: "border-box",
            marginBottom: "8px",
        },
        error: {
            color: "#DC2626",
            fontSize: "13px",
            fontWeight: "700",
            marginBottom: "10px",
        },
        actions: {
            display: "flex",
            gap: "10px",
            marginTop: "12px",
        },
        cancelBtn: {
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #CBD5E1",
            backgroundColor: "#FFFFFF",
            fontWeight: "800",
            cursor: "pointer",
        },
        submitBtn: {
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#DC2626",
            color: "#FFFFFF",
            fontWeight: "800",
            cursor: "pointer",
        },
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.title}>🚨 {title}</div>

                <label style={styles.label}>신고 유형</label>
                <select
                    style={styles.select}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                >
                    {REPORT_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                            {r.label}
                        </option>
                    ))}
                </select>

                <label style={styles.label}>상세 내용 (선택)</label>
                <textarea
                    style={styles.textarea}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="신고 사유를 자세히 적어주세요."
                    maxLength={500}
                />

                {error ? <div style={styles.error}>{error}</div> : null}

                <div style={styles.actions}>
                    <button type="button" style={styles.cancelBtn} onClick={onClose}>
                        취소
                    </button>
                    <button
                        type="button"
                        style={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? "접수 중..." : "신고 접수"}
                    </button>
                </div>
            </div>
        </div>
    );
}
