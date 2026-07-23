import { Outlet, useLocation, useNavigate } from "react-router-dom";

function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        {
            label: "업체 관리",
            icon: "🏢",
            path: "/admin/companies"
        },
        {
            label: "예약 관리",
            icon: "📋",
            path: "/admin/reservations"
        },
        {
            label: "사용자 관리",
            icon: "👤",
            path: "/admin/users"
        },
        {
            label: "물품 관리",
            icon: "📦",
            path: "/admin/products"
        },
        {
            label: "리뷰 관리",
            icon: "⭐",
            path: "/admin/reviews"
        },
        {
            label: "커뮤니티 관리",
            icon: "💬",
            path: "/admin/community"
        },
        {
            label: "고객센터",
            icon: "🎧",
            path: "/admin/support"
        }
    ];

    const styles = {
        container: {
            display: "flex",
            minHeight: "100vh",
            backgroundColor: "#F8FAFC"
        },

        sidebar: {
            width: "260px",
            height: "100vh",
            position: "sticky",
            top: 0,
            backgroundColor: "#0066FF",
            color: "white",
            padding: "30px 20px",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            flexShrink: 0
        },

        logo: {
            fontSize: "22px",
            fontWeight: "bold",
            marginBottom: "40px",
            textAlign: "center",
            lineHeight: "1.3"
        },

        nav: {
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            flex: 1
        },

        navButton: (active) => ({
            padding: "14px 20px",
            backgroundColor: active ? "rgba(255, 255, 255, 0.22)" : "transparent",
            color: "white",
            border: "none",
            borderRadius: "12px",
            textAlign: "left",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "15px",
            transition: "0.15s",
            width: "100%"
        }),

        logoutArea: {
            paddingTop: "20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.2)"
        },

        logoutBtn: {
            width: "100%",
            padding: "14px",
            backgroundColor: "#1E3A8A",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "15px"
        },

        content: {
            flex: 1,
            minHeight: "100vh",
            padding: "20px",
            boxSizing: "border-box",
            overflowX: "hidden"
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/");
    };

    return (
        <div style={styles.container}>
            <aside style={styles.sidebar}>
                <div style={styles.logo}>
                    DDuckTTack<br />
                    Admin
                </div>

                <nav style={styles.nav}>
                    {menuItems.map((item) => {
                        const active =
                            location.pathname === item.path ||
                            location.pathname.startsWith(item.path + "/");

                        return (
                            <button
                                key={item.path}
                                style={styles.navButton(active)}
                                onClick={() => navigate(item.path)}
                            >
                                {item.icon} {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div style={styles.logoutArea}>
                    <button
                        style={styles.logoutBtn}
                        onClick={handleLogout}
                    >
                        로그아웃
                    </button>
                </div>
            </aside>

            <main style={styles.content}>
                <Outlet />
            </main>
        </div>
    );
}

export default AdminLayout;