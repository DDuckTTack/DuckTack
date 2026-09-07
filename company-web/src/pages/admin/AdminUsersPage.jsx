import { useEffect, useState } from "react";
import axios from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { layout, badge, badgeColors, actionBtn } from "./adminTheme";

const styles = {
    ...layout,
    tr: {
        ...layout.tr,
        cursor: "pointer",
    },
    username: {
        fontWeight: "800",
        color: "#1e293b",
    },
    roleBadge: badge(badgeColors.info.bg, badgeColors.info.text),
    statusBadge: (status) => {
        const ok = status === "ACTIVE" || status === "정상";
        const c = ok ? badgeColors.success : badgeColors.danger;
        return badge(c.bg, c.text);
    },
    detailBtn: actionBtn("outline"),
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
                <h2 style={styles.title}>👤 사용자 관리</h2>
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