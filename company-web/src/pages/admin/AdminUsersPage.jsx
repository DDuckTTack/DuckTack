import { useEffect, useState } from "react";
import axios from "../../api/axios";
import { useNavigate } from "react-router-dom";

const styles = {
    container: {
        padding: "40px",
        backgroundColor: "#F8FAFC",
        minHeight: "100%",
        fontFamily: "'Pretendard', sans-serif",
    },
    headerSection: {
        marginBottom: "32px",
    },
    title: {
        fontSize: "28px",
        fontWeight: "800",
        color: "#1e293b",
        margin: 0,
        letterSpacing: "-0.5px",
    },
    subTitle: {
        color: "#94a3b8",
        fontSize: "14px",
        marginTop: "8px",
        fontWeight: "500",
    },
    tableCard: {
        backgroundColor: "white",
        borderRadius: "24px",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)",
        border: "1px solid rgba(255,255,255,0.8)",
        overflow: "hidden",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        textAlign: "left",
    },
    thead: {
        backgroundColor: "#F8FAFC",
        borderBottom: "1px solid #f1f5f9",
    },
    th: {
        padding: "16px 24px",
        fontSize: "13px",
        fontWeight: "700",
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        whiteSpace: "nowrap",
    },
    tr: {
        borderBottom: "1px solid #f1f5f9",
        transition: "background-color 0.2s",
        cursor: "pointer",
    },
    td: {
        padding: "20px 24px",
        fontSize: "15px",
        color: "#334155",
        verticalAlign: "middle",
    },
    username: {
        fontWeight: "800",
        color: "#1e293b",
    },
    smallText: {
        fontSize: "12px",
        color: "#94a3b8",
        marginTop: "3px",
    },
    roleBadge: {
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: "800",
        backgroundColor: "#EFF6FF",
        color: "#2563EB",
    },
    statusBadge: (status) => ({
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: "700",
        backgroundColor:
            status === "ACTIVE" || status === "정상" ? "#DCFCE7" : "#FEE2E2",
        color:
            status === "ACTIVE" || status === "정상" ? "#15803D" : "#B91C1C",
    }),
    detailBtn: {
        padding: "8px 14px",
        borderRadius: "10px",
        border: "1px solid #e2e8f0",
        backgroundColor: "white",
        color: "#64748b",
        fontSize: "13px",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.2s",
    },
    emptyBox: {
        padding: "60px",
        textAlign: "center",
        color: "#cbd5e1",
    },
};

function AdminUsersPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);

    const extractUserList = (responseData) => {
        const body = responseData?.data ?? responseData;

        if (Array.isArray(body)) return body;
        if (Array.isArray(body?.content)) return body.content;
        if (Array.isArray(body?.users)) return body.users;
        if (Array.isArray(body?.items)) return body.items;
        if (Array.isArray(body?.list)) return body.list;

        console.log("사용자 목록 원본 응답:", responseData);
        return [];
    };

    const normalizeRole = (role) => {
        const raw = String(role || "").toUpperCase();

        if (raw === "ROLE_USER") return "USER";
        if (raw === "ROLE_ADMIN") return "ADMIN";
        if (raw === "ROLE_COMPANY") return "COMPANY";

        return raw;
    };

    const normalizeUser = (user) => {
        const role = normalizeRole(user.role || user.userRole);

        return {
            ...user,
            id: user.id,
            username: user.username || user.name || "-",
            email: user.email || "-",
            role,
            status: user.status || "ACTIVE",
        };
    };

    const isVisibleNormalUser = (user) => {
        const role = normalizeRole(user.role);
        const username = String(user.username || "").toLowerCase();

        if (role === "ADMIN") return false;
        if (role === "COMPANY") return false;

        if (username === "admin") return false;
        if (username.startsWith("company_")) return false;

        return true;
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get("/api/admin/users", {
                params: {
                    page: 0,
                    size: 100,
                },
            });

            console.log("사용자 목록 원본 응답:", res.data);

            const rawList = extractUserList(res.data);
            const normalizedList = rawList.map(normalizeUser);
            const visibleUsers = normalizedList.filter(isVisibleNormalUser);

            console.log("표시할 사용자 결과:", visibleUsers);

            setUsers(visibleUsers);
        } catch (e) {
            console.error("사용자 조회 실패:", e);

            if (e.response?.status === 401 || e.response?.status === 403) {
                alert("관리자 인증이 만료되었거나 권한이 없습니다. 다시 로그인하세요.");
                localStorage.clear();
                navigate("/");
                return;
            }

            setUsers([]);
            alert("사용자 조회 실패");
        }
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={styles.container}>
            <div style={styles.headerSection}>
                <h2 style={styles.title}>사용자 관리</h2>
                <p style={styles.subTitle}>
                    일반 사용자 계정을 확인하고 상세 활동 정보를 조회할 수 있습니다.
                </p>
            </div>

            <div style={styles.tableCard}>
                <table style={styles.table}>
                    <thead style={styles.thead}>
                    <tr>
                        <th style={styles.th}>사용자 정보</th>
                        <th style={styles.th}>역할</th>
                        <th style={styles.th}>계정 상태</th>
                        <th style={{ ...styles.th, textAlign: "right" }}>액션</th>
                    </tr>
                    </thead>

                    <tbody>
                    {users.length === 0 ? (
                        <tr>
                            <td colSpan="4" style={styles.emptyBox}>
                                표시할 일반 사용자 데이터가 없습니다.
                            </td>
                        </tr>
                    ) : (
                        users.map((u) => (
                            <tr
                                key={u.id}
                                style={styles.tr}
                                onClick={() => navigate(`/admin/users/${u.id}`)}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = "#F8FAFC";
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                }}
                            >
                                <td style={styles.td}>
                                    <div style={styles.username}>{u.username}</div>
                                    <div style={styles.smallText}>ID: {u.id}</div>
                                    <div style={styles.smallText}>{u.email}</div>
                                </td>

                                <td style={styles.td}>
                                    <span style={styles.roleBadge}>
                                        {u.role || "USER"}
                                    </span>
                                </td>

                                <td style={styles.td}>
                                    <span style={styles.statusBadge(u.status)}>
                                        {u.status === "ACTIVE" || u.status === "정상"
                                            ? "● 정상"
                                            : "● 제한됨"}
                                    </span>
                                </td>

                                <td style={{ ...styles.td, textAlign: "right" }}>
                                    <button
                                        type="button"
                                        style={styles.detailBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/admin/users/${u.id}`);
                                        }}
                                    >
                                        상세 보기
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminUsersPage;