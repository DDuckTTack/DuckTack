// 관리자 페이지 공통 스타일 토큰 (예약 관리 페이지 기준)
export const colors = {
    bg: "#F8FAFC",
    cardBorder: "rgba(255,255,255,0.8)",
    border: "#e2e8f0",
    borderLight: "#f1f5f9",
    textTitle: "#1e293b",
    textBody: "#334155",
    textMuted: "#64748b",
    textFaint: "#94a3b8",
    primary: "#0066ff",
    primaryDark: "#0052cc",
};

export const layout = {
    container: {
        padding: "40px",
        backgroundColor: colors.bg,
        minHeight: "100%",
        fontFamily: "'Pretendard', sans-serif",
    },
    headerRow: {
        marginBottom: "32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "20px",
        flexWrap: "wrap",
    },
    headerSection: {
        marginBottom: "32px",
    },
    title: {
        fontSize: "28px",
        fontWeight: "800",
        color: colors.textTitle,
        margin: 0,
        letterSpacing: "-0.5px",
    },
    subTitle: {
        color: colors.textFaint,
        fontSize: "14px",
        marginTop: "8px",
        fontWeight: "500",
    },
    filterCard: {
        backgroundColor: "white",
        padding: "20px 24px",
        borderRadius: "16px",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        border: `1px solid ${colors.cardBorder}`,
        flexWrap: "wrap",
    },
    selectGroup: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    selectLabel: {
        fontSize: "14px",
        fontWeight: "700",
        color: "#475569",
        whiteSpace: "nowrap",
    },
    selectBox: {
        padding: "10px 16px",
        borderRadius: "10px",
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bg,
        fontSize: "14px",
        fontWeight: "600",
        color: colors.textTitle,
        outline: "none",
        cursor: "pointer",
    },
    inputBox: {
        padding: "10px 16px",
        borderRadius: "10px",
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bg,
        fontSize: "14px",
        fontWeight: "600",
        color: colors.textTitle,
        outline: "none",
    },
    resetBtn: {
        padding: "10px 16px",
        borderRadius: "10px",
        border: "none",
        backgroundColor: "#64748B",
        color: "white",
        fontWeight: "700",
        fontSize: "14px",
        cursor: "pointer",
    },
    tableCard: {
        backgroundColor: "white",
        borderRadius: "24px",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)",
        border: `1px solid ${colors.cardBorder}`,
        overflow: "hidden",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        textAlign: "left",
    },
    thead: {
        backgroundColor: colors.bg,
        borderBottom: `1px solid ${colors.borderLight}`,
    },
    th: {
        padding: "16px 24px",
        fontSize: "13px",
        fontWeight: "700",
        color: colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        whiteSpace: "nowrap",
    },
    tr: {
        borderBottom: `1px solid ${colors.borderLight}`,
        transition: "background-color 0.2s",
    },
    td: {
        padding: "20px 24px",
        fontSize: "15px",
        color: colors.textBody,
        verticalAlign: "middle",
    },
    smallText: {
        fontSize: "12px",
        color: colors.textFaint,
        marginTop: "3px",
    },
    emptyBox: {
        padding: "80px",
        textAlign: "center",
        color: colors.textFaint,
    },
    card: {
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        border: `1px solid ${colors.cardBorder}`,
        padding: "20px 24px",
    },
};

export const badgeColors = {
    success: { bg: "#DCFCE7", text: "#15803D" },
    danger: { bg: "#FEE2E2", text: "#B91C1C" },
    warning: { bg: "#FEF3C7", text: "#B45309" },
    neutral: { bg: "#F1F5F9", text: "#64748B" },
    info: { bg: "#EFF6FF", text: "#2563EB" },
};

export function badge(bg, text) {
    return {
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: "700",
        backgroundColor: bg,
        color: text,
    };
}

export function actionBtn(type = "primary") {
    const base = {
        padding: "8px 16px",
        borderRadius: "10px",
        fontSize: "13px",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.2s",
        marginRight: "8px",
    };

    if (type === "primary") {
        return { ...base, border: "none", backgroundColor: colors.primary, color: "white" };
    }
    if (type === "outline") {
        return { ...base, border: `1px solid ${colors.border}`, backgroundColor: "white", color: colors.textMuted };
    }
    if (type === "danger") {
        return { ...base, border: "1px solid #FCA5A5", backgroundColor: "#FEF2F2", color: "#B91C1C" };
    }
    if (type === "warning") {
        return { ...base, border: "1px solid #FDE68A", backgroundColor: "#FFFBEB", color: "#B45309" };
    }
    if (type === "success") {
        return { ...base, border: "1px solid #BBF7D0", backgroundColor: "#F0FDF4", color: "#15803D" };
    }

    return base;
}
