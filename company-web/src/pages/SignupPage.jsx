import { useState } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";

function SignupPage() {   // 🔥 setPage 제거
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        password: "",
        phone: "",
        companyName: "",
        businessNumber: "",
        ownerName: "",
        companyPhone: "",
        email: "",
        address: "",
        zipCode: "",
        serviceArea: "",
        specialties: []
    });

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSpecialties = (e) => {
        const value = e.target.value.split(",").map(v => v.trim());
        setForm({
            ...form,
            specialties: value
        });
    };

    const signup = async () => {
        try {
            await axios.post(
                "/api/company/auth/signup/company",
                form
            );
            alert("회원가입 완료 (관리자 승인 필요)");

            // 🔥 핵심 수정
            navigate("/");   // 로그인 페이지로 이동

        } catch (err) {
            console.error(err);
            alert("회원가입 실패");
        }
    };

    const styles = {
        container: {
            backgroundColor: "#F0F7FF",
            minHeight: "100vh",
            padding: "40px 20px",
            display: "flex",
            justifyContent: "center"
        },
        card: {
            backgroundColor: "white",
            padding: "40px",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0, 102, 255, 0.08)",
            width: "100%",
            maxWidth: "600px"
        },
        title: {
            color: "#0066FF",
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "30px",
            textAlign: "center"
        },
        sectionTitle: {
            fontSize: "16px",
            color: "#64748B",
            marginBottom: "15px",
            marginTop: "20px",
            borderLeft: "4px solid #0066FF",
            paddingLeft: "10px"
        },
        inputGroup: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px"
        },
        input: {
            width: "100%",
            padding: "12px",
            border: "1px solid #D1E4FF",
            borderRadius: "8px"
        },
        fullInput: {
            width: "100%",
            padding: "12px",
            border: "1px solid #D1E4FF",
            borderRadius: "8px",
            marginTop: "10px"
        },
        btnSignup: {
            width: "100%",
            padding: "14px",
            backgroundColor: "#0066FF",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            marginTop: "30px"
        },
        btnBack: {
            width: "100%",
            padding: "12px",
            backgroundColor: "transparent",
            color: "#64748B",
            border: "none",
            cursor: "pointer",
            marginTop: "10px",
            textDecoration: "underline"
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>업체 파트너십 가입</h2>

                <p style={styles.sectionTitle}>계정 정보</p>
                <div style={styles.inputGroup}>
                    <input name="username" placeholder="아이디" onChange={handleChange} style={styles.input} />
                    <input name="password" type="password" placeholder="비밀번호" onChange={handleChange} style={styles.input} />
                </div>
                <input name="phone" placeholder="계정 연락처" onChange={handleChange} style={styles.fullInput} />

                <p style={styles.sectionTitle}>업체 정보</p>
                <div style={styles.inputGroup}>
                    <input name="companyName" placeholder="업체명" onChange={handleChange} style={styles.input} />
                    <input name="businessNumber" placeholder="사업자번호" onChange={handleChange} style={styles.input} />
                </div>

                <input name="ownerName" placeholder="대표자명" onChange={handleChange} style={styles.fullInput} />
                <input name="companyPhone" placeholder="업체 전화번호" onChange={handleChange} style={styles.fullInput} />
                <input name="email" placeholder="이메일" onChange={handleChange} style={styles.fullInput} />

                <p style={styles.sectionTitle}>서비스 정보</p>
                <input name="address" placeholder="주소" onChange={handleChange} style={styles.fullInput} />
                <input name="serviceArea" placeholder="서비스 지역" onChange={handleChange} style={styles.fullInput} />
                <input placeholder="전문분야 (쉼표)" onChange={handleSpecialties} style={styles.fullInput} />

                <button onClick={signup} style={styles.btnSignup}>
                    가입 신청
                </button>

                {/* 🔥 핵심 수정 */}
                <button onClick={() => navigate("/")} style={styles.btnBack}>
                    로그인으로 돌아가기
                </button>
            </div>
        </div>
    );
}

export default SignupPage;