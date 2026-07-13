import { Navigate } from "react-router-dom";

function AdminRoute({ children }) {

    const role = localStorage.getItem("role");

    // 🔥 로그인 안했거나 ADMIN 아니면 차단
    if (!role || role !== "ADMIN") {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default AdminRoute;