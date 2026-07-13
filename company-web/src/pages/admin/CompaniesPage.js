import { useEffect, useState } from "react";
import axios from "../../api/axios";
import { useNavigate } from "react-router-dom";

function CompaniesPage() {
    const navigate = useNavigate();

    const [companies, setCompanies] = useState([]);
    const [loadingId, setLoadingId] = useState(null);
    const [loading, setLoading] = useState(false);

    const extractCompanyList = (responseData) => {
        console.log("업체 목록 원본 응답:", responseData);

        if (Array.isArray(responseData)) {
            return responseData;
        }

        if (Array.isArray(responseData?.data)) {
            return responseData.data;
        }

        if (Array.isArray(responseData?.data?.content)) {
            return responseData.data.content;
        }

        if (Array.isArray(responseData?.content)) {
            return responseData.content;
        }

        if (Array.isArray(responseData?.companies)) {
            return responseData.companies;
        }

        console.error("업체 목록 응답이 배열이 아님:", responseData);
        return [];
    };

    const normalizeCompany = (company) => {
        const status =
            company.status ||
            company.companyStatus ||
            (company.active ? "APPROVED" : "PENDING");

        return {
            ...company,
            status,
            active: Boolean(company.active),
            partner: Boolean(company.partner ?? company.isPartner),
            partnerPriority: company.partnerPriority ?? 0,
            username: company.username ?? "",
            serviceRegionLabel: company.serviceRegionLabel ?? company.region ?? "",
            address: company.address ?? company.addressLine ?? "",
        };
    };

    const fetchCompanies = async () => {
        try {
            setLoading(true);

            const res = await axios.get("/api/admin/companies", {
                params: {
                    activeOnly: false,
                    page: 0,
                    size: 100,
                    sort: "id,desc",
                },
            });

            const list = extractCompanyList(res.data)
                .map(normalizeCompany)
                .sort((a, b) => Number(b.id) - Number(a.id));

            setCompanies(list);
        } catch (err) {
            console.error("업체 조회 실패:", err);

            if (err.response?.status === 401 || err.response?.status === 403) {
                alert("관리자 인증이 만료되었거나 권한이 없습니다. 다시 로그인하세요.");
                localStorage.clear();
                navigate("/");
                return;
            }

            setCompanies([]);
            alert("업체 조회 실패");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateStatus = async (id, status) => {
        if (loadingId) return;

        setLoadingId(id);

        try {
            await axios.patch(`/api/admin/companies/${id}/status`, {
                status,
            });

            await fetchCompanies();

            if (status === "APPROVED") {
                alert("업체가 승인되었습니다.");
            } else if (status === "REJECTED") {
                alert("업체가 거절되었습니다.");
            } else if (status === "PENDING") {
                alert("업체가 승인 대기 상태로 변경되었습니다.");
            } else {
                alert("상태가 변경되었습니다.");
            }
        } catch (err) {
            console.error("상태 변경 실패:", err);

            if (err.response?.status === 401 || err.response?.status === 403) {
                alert("관리자 인증이 만료되었거나 권한이 없습니다. 다시 로그인하세요.");
                localStorage.clear();
                navigate("/");
                return;
            }

            console.log("서버 응답:", err.response?.data);
            alert(err.response?.data?.message || "상태 변경 실패");
        } finally {
            setLoadingId(null);
        }
    };

    const toggleActiveFallback = async (company) => {
        if (loadingId) return;

        setLoadingId(company.id);

        try {
            await axios.patch(`/api/admin/companies/${company.id}/active`, {
                active: !company.active,
            });

            await fetchCompanies();
            alert("활성 상태가 변경되었습니다.");
        } catch (err) {
            console.error("활성 상태 변경 실패:", err);

            if (err.response?.status === 401 || err.response?.status === 403) {
                alert("관리자 인증이 만료되었거나 권한이 없습니다. 다시 로그인하세요.");
                localStorage.clear();
                navigate("/");
                return;
            }

            console.log("서버 응답:", err.response?.data);
            alert(err.response?.data?.message || "활성 상태 변경 실패");
        } finally {
            setLoadingId(null);
        }
    };

    const renderStatus = (company) => {
        switch (company.status) {
            case "APPROVED":
                return (
                    <span style={{ color: "#10B981", fontWeight: "800" }}>
                        🟢 승인 / 활성
                    </span>
                );
            case "PENDING":
                return (
                    <span style={{ color: "#64748B", fontWeight: "800" }}>
                        ⚪ 승인 대기 / 비활성
                    </span>
                );
            case "REJECTED":
                return (
                    <span style={{ color: "#EF4444", fontWeight: "800" }}>
                        🔴 거절
                    </span>
                );
            case "RETURNED":
                return (
                    <span style={{ color: "#F59E0B", fontWeight: "800" }}>
                        🟠 반려
                    </span>
                );
            default:
                return (
                    <span style={{ color: "#64748B", fontWeight: "800" }}>
                        ⚪ {company.status || "UNKNOWN"}
                    </span>
                );
        }
    };

    const styles = {
        container: {
            padding: "40px",
            backgroundColor: "#F4F7FA",
            minHeight: "100vh",
        },
        card: {
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
        },
        header: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
        },
        title: {
            margin: 0,
            color: "#1E293B",
            fontSize: "24px",
            fontWeight: "900",
        },
        refreshBtn: {
            padding: "10px 14px",
            border: "none",
            borderRadius: "10px",
            backgroundColor: "#0066FF",
            color: "white",
            fontWeight: "800",
            cursor: "pointer",
        },
        summary: {
            marginBottom: "14px",
            color: "#64748B",
            fontSize: "14px",
            fontWeight: "700",
        },
        table: {
            width: "100%",
            borderCollapse: "collapse",
        },
        th: {
            padding: "14px",
            borderBottom: "2px solid #EDF2F7",
            textAlign: "left",
            color: "#334155",
            fontSize: "14px",
        },
        td: {
            padding: "14px",
            borderBottom: "1px solid #F1F5F9",
            color: "#334155",
            fontSize: "14px",
            verticalAlign: "middle",
        },
        smallText: {
            fontSize: "12px",
            color: "#94A3B8",
            marginTop: "4px",
        },
        btnGroup: {
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
        },
        btn: (type, disabled) => {
            const base = {
                padding: "7px 11px",
                borderRadius: "8px",
                border: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                color: "white",
                fontWeight: "800",
                opacity: disabled ? 0.55 : 1,
                fontSize: "12px",
            };

            if (type === "approve") {
                return {
                    ...base,
                    backgroundColor: "#0066FF",
                };
            }

            if (type === "reject") {
                return {
                    ...base,
                    backgroundColor: "#EF4444",
                };
            }

            if (type === "pending") {
                return {
                    ...base,
                    backgroundColor: "#64748B",
                };
            }

            return {
                ...base,
                backgroundColor: "#0F172A",
            };
        },
        empty: {
            padding: "30px",
            textAlign: "center",
            color: "#64748B",
        },
    };

    const pendingCount = companies.filter((c) => c.status === "PENDING").length;
    const approvedCount = companies.filter((c) => c.status === "APPROVED").length;

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h2 style={styles.title}>업체 관리</h2>

                    <button
                        type="button"
                        onClick={fetchCompanies}
                        style={styles.refreshBtn}
                        disabled={loading}
                    >
                        {loading ? "불러오는 중..." : "새로고침"}
                    </button>
                </div>

                <div style={styles.summary}>
                    전체 {companies.length}개 · 승인 대기 {pendingCount}개 · 승인 {approvedCount}개
                </div>

                <table style={styles.table}>
                    <thead>
                    <tr>
                        <th style={styles.th}>ID</th>
                        <th style={styles.th}>업체 정보</th>
                        <th style={styles.th}>지역</th>
                        <th style={styles.th}>상태</th>
                        <th style={styles.th}>제휴</th>
                        <th style={styles.th}>관리</th>
                    </tr>
                    </thead>

                    <tbody>
                    {companies.length === 0 ? (
                        <tr>
                            <td colSpan="6" style={styles.empty}>
                                표시할 업체가 없습니다.
                            </td>
                        </tr>
                    ) : (
                        companies.map((company) => {
                            const disabled = loadingId === company.id;

                            return (
                                <tr key={company.id}>
                                    <td style={styles.td}>{company.id}</td>

                                    <td style={styles.td}>
                                        <div style={{ fontWeight: "900", color: "#1E293B" }}>
                                            {company.name || "-"}
                                        </div>

                                        <div style={styles.smallText}>
                                            계정: {company.username || "-"}
                                        </div>

                                        {company.address ? (
                                            <div style={styles.smallText}>
                                                주소: {company.address}
                                            </div>
                                        ) : null}
                                    </td>

                                    <td style={styles.td}>
                                        {company.serviceRegionLabel || "-"}
                                    </td>

                                    <td style={styles.td}>
                                        {renderStatus(company)}
                                    </td>

                                    <td style={styles.td}>
                                        {company.partner ? (
                                            <span style={{ color: "#0066FF", fontWeight: "800" }}>
                                                제휴
                                            </span>
                                        ) : (
                                            <span style={{ color: "#94A3B8", fontWeight: "800" }}>
                                                비제휴
                                            </span>
                                        )}
                                    </td>

                                    <td style={styles.td}>
                                        <div style={styles.btnGroup}>
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                style={styles.btn("approve", disabled)}
                                                onClick={() => updateStatus(company.id, "APPROVED")}
                                            >
                                                승인
                                            </button>

                                            <button
                                                type="button"
                                                disabled={disabled}
                                                style={styles.btn("reject", disabled)}
                                                onClick={() => updateStatus(company.id, "REJECTED")}
                                            >
                                                거절
                                            </button>

                                            <button
                                                type="button"
                                                disabled={disabled}
                                                style={styles.btn("pending", disabled)}
                                                onClick={() => updateStatus(company.id, "PENDING")}
                                            >
                                                대기
                                            </button>

                                            <button
                                                type="button"
                                                disabled={disabled}
                                                style={styles.btn("toggle", disabled)}
                                                onClick={() => toggleActiveFallback(company)}
                                            >
                                                활성 토글
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CompaniesPage;