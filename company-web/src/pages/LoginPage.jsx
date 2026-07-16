import { useState } from "react";
import { useNavigate } from "react-router-dom";

import axios from "../api/axios";

function LoginPage() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const extractLoginPayload = (responseData) => {
        console.log("🔥 원본 로그인 응답:", JSON.stringify(responseData, null, 2));

        const data = responseData?.data ?? responseData;

        const token =
            data?.token ||
            data?.accessToken ||
            data?.access_token ||
            data?.jwt ||
            data?.accessJwt ||
            data?.data?.token ||
            data?.data?.accessToken;

        const role =
            data?.role ||
            data?.userRole ||
            data?.authority ||
            data?.data?.role ||
            data?.user?.role;

        const companyId =
            data?.companyId ||
            data?.data?.companyId ||
            data?.company?.id;

        return {
            token,
            role,
            companyId,
            raw: responseData
        };
    };

    const saveLogin = (responseData) => {
        const payload = extractLoginPayload(responseData);

        if (!payload.token) {
            console.error("❌ token 없음. 실제 응답:", payload.raw);
            throw new Error("LOGIN_RESPONSE_TOKEN_MISSING");
        }

        if (!payload.role) {
            console.error("❌ role 없음. 실제 응답:", payload.raw);
            throw new Error("LOGIN_RESPONSE_ROLE_MISSING");
        }

        const safeRole = payload.role.toUpperCase();

        localStorage.setItem("token", payload.token);
        localStorage.setItem("role", safeRole);

        if (payload.companyId !== undefined && payload.companyId !== null) {
            localStorage.setItem("companyId", payload.companyId);
        } else {
            localStorage.removeItem("companyId");
        }

        return safeRole;
    };

    const login = async (e) => {
        if (e) e.preventDefault();

        console.log("🔥 로그인 클릭됨");

        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("companyId");

        // 1차: 관리자 로그인 시도
        try {
            const adminRes = await axios.post("/api/auth/login", {
                username,
                password
            });

            console.log("🔥 관리자 로그인 응답:", adminRes.data);

            const safeRole = saveLogin(adminRes.data);

            if (safeRole.includes("ADMIN")) {
                navigate("/admin");
                return;
            }

            if (safeRole.includes("USER")) {
                localStorage.clear();
                alert("관리자 또는 업체 계정만 접근할 수 있습니다.");
                return;
            }

            localStorage.clear();

        } catch (adminErr) {
            if (
                adminErr.message === "LOGIN_RESPONSE_TOKEN_MISSING" ||
                adminErr.message === "LOGIN_RESPONSE_ROLE_MISSING"
            ) {
                alert("관리자 로그인 응답 구조가 프론트와 맞지 않습니다. 콘솔의 원본 로그인 응답을 확인하세요.");
                return;
            }

            console.log("관리자 로그인 실패. 업체 로그인 시도");
        }

        // 2차: 업체 로그인 시도
        try {
            const companyRes = await axios.post("/api/company/auth/login", {
                username,
                password
            });

            console.log("🔥 업체 로그인 응답:", companyRes.data);

            const safeRole = saveLogin(companyRes.data);

            if (safeRole.includes("COMPANY")) {
                navigate("/company");
                return;
            }

            localStorage.clear();
            alert("업체 계정이 아닙니다.");

        } catch (companyErr) {
            console.error("❌ 로그인 에러:", companyErr);

            if (companyErr.response) {
                console.log("서버 응답:", companyErr.response.data);
                alert(companyErr.response.data?.message || "로그인 실패");
            } else {
                alert("서버 연결 실패");
            }
        }
    };

    return (
        <div
            style={{
                backgroundColor: "#F0F7FF",
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
            }}
        >
            <div
                style={{
                    backgroundColor: "white",
                    padding: "40px",
                    borderRadius: "16px",
                    boxShadow: "0 4px 20px rgba(0, 102, 255, 0.1)",
                    width: "100%",
                    maxWidth: "400px",
                    textAlign: "center"
                }}
            >
                <h2
                    style={{
                        color: "#0066FF",
                        marginBottom: "30px",
                        fontWeight: "bold",
                        fontSize: "24px"
                    }}
                >
                    DDuckTTack 로그인
                </h2>

                <input
                    style={{
                        width: "100%",
                        padding: "12px",
                        marginBottom: "15px",
                        border: "1px solid #D1E4FF",
                        borderRadius: "8px",
                        boxSizing: "border-box"
                    }}
                    placeholder="아이디"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <input
                    style={{
                        width: "100%",
                        padding: "12px",
                        marginBottom: "25px",
                        border: "1px solid #D1E4FF",
                        borderRadius: "8px",
                        boxSizing: "border-box"
                    }}
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            login(e);
                        }
                    }}
                />

                <button
                    type="button"
                    onClick={(e) => login(e)}
                    style={{
                        width: "100%",
                        padding: "12px",
                        backgroundColor: "#0066FF",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        marginBottom: "10px"
                    }}
                >
                    로그인
                </button>

                <button
                    type="button"
                    onClick={() => navigate("/signup")}
                    style={{
                        width: "100%",
                        padding: "12px",
                        backgroundColor: "transparent",
                        color: "#0066FF",
                        border: "1px solid #0066FF",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer"
                    }}
                >
                    업체 회원가입
                </button>
            </div>
        </div>
    );
}

export default LoginPage;