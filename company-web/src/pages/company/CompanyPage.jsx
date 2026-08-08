import { useNavigate } from "react-router-dom";

function CompanyPage() {
    const navigate = useNavigate();

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("companyId");

        navigate("/");
    };

    const styles = {
        page: {
            minHeight: "100vh",
            backgroundColor: "#F0F7FF",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
        },
        card: {
            width: "520px",
            backgroundColor: "white",
            borderRadius: "24px",
            padding: "60px 48px",
            textAlign: "center",
            boxSizing: "border-box"
        },
        title: {
            fontSize: "30px",
            fontWeight: "900",
            color: "#111827",
            marginBottom: "34px"
        },
        button: {
            width: "100%",
            padding: "20px",
            backgroundColor: "#0066FF",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "17px",
            fontWeight: "800",
            cursor: "pointer",
            marginBottom: "22px"
        },
        logoutBtn: {
            padding: "8px 16px",
            backgroundColor: "white",
            border: "1px solid #94A3B8",
            borderRadius: "4px",
            fontSize: "15px",
            cursor: "pointer"
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h1 style={styles.title}>파트너 센터</h1>

                <button
                    type="button"
                    style={styles.button}
                    onClick={() => navigate("/calendar")}
                >
                    🗓️ 예약 관리
                </button>
                <button
                    type="button"
                    style={styles.button}
                    onClick={() => navigate("/company/reviews")}
                >
                    ⭐ 리뷰 관리
                </button>
                <button
                    type="button"
                    style={styles.button}
                    onClick={() => navigate("/company/bids")}
                >
                    💰 입찰 관리
                </button>
                <button
                    type="button"
                    style={styles.button}
                    onClick={() => navigate("/company/community")}
                >
                    💬 커뮤니티
                </button>
                <button
                    type="button"
                    style={styles.button}
                    onClick={() => navigate("/company/messages")}
                >
                    ✉️ 쪽지함
                </button>
                <button
                    type="button"
                    style={styles.logoutBtn}
                    onClick={logout}
                >
                    로그아웃
                </button>
            </div>
        </div>
    );
}

export default CompanyPage;
