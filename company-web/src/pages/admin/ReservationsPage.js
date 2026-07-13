import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "../../api/axios";

const REGION_ORDER = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산"];

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
        letterSpacing: "-0.5px"
    },
    subTitle: {
        color: "#94a3b8",
        fontSize: "14px",
        marginTop: "8px",
        fontWeight: "500"
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
        border: "1px solid rgba(255,255,255,0.8)",
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
        border: "1px solid #e2e8f0",
        backgroundColor: "#F8FAFC",
        fontSize: "14px",
        fontWeight: "600",
        color: "#1e293b",
        outline: "none",
        cursor: "pointer",
        minWidth: "200px"
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
        textAlign: "left"
    },
    thead: {
        backgroundColor: "#F8FAFC",
        borderBottom: "1px solid #f1f5f9"
    },
    th: {
        padding: "16px 24px",
        fontSize: "13px",
        fontWeight: "700",
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    tr: {
        borderBottom: "1px solid #f1f5f9",
        transition: "background-color 0.2s"
    },
    td: {
        padding: "20px 24px",
        fontSize: "15px",
        color: "#334155",
        verticalAlign: "middle"
    },
    statusBadge: (status) => {
        const colors = {
            ACCEPTED: { bg: "#DCFCE7", text: "#15803D" },
            REJECTED: { bg: "#FEE2E2", text: "#B91C1C" },
            PENDING: { bg: "#F1F5F9", text: "#64748B" }
        };

        const current = colors[status] || colors.PENDING;

        return {
            padding: "4px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "700",
            backgroundColor: current.bg,
            color: current.text,
        };
    },
    actionBtn: (type) => ({
        padding: "8px 16px",
        borderRadius: "10px",
        border: type === "accept" ? "none" : "1px solid #e2e8f0",
        backgroundColor: type === "accept" ? "#0066ff" : "white",
        color: type === "accept" ? "white" : "#64748b",
        fontSize: "13px",
        fontWeight: "700",
        cursor: "pointer",
        marginRight: "8px",
        transition: "all 0.2s",
    })
};

function ReservationsPage() {
    const location = useLocation();

    const initialCompanyId = location.state?.selectedCompanyId || null;
    const initialCompanyName = location.state?.selectedCompanyName || "";

    const [data, setData] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState("ALL");
    const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
    const [selectedCompanyName, setSelectedCompanyName] = useState(initialCompanyName);

    const extractList = (responseData) => {
        console.log("원본 응답:", responseData);

        const body = responseData?.data ?? responseData;

        if (Array.isArray(body)) return body;
        if (Array.isArray(body?.content)) return body.content;
        if (Array.isArray(body?.data)) return body.data;
        if (Array.isArray(responseData?.data?.content)) return responseData.data.content;
        if (Array.isArray(responseData?.content)) return responseData.content;
        if (Array.isArray(responseData?.companies)) return responseData.companies;
        if (Array.isArray(responseData?.reservations)) return responseData.reservations;

        console.error("배열 응답이 아님:", responseData);
        return [];
    };

    const normalizeRegion = (company) => {
        return company.serviceRegionLabel || company.region || "기타";
    };

    const regionIndex = (region) => {
        const index = REGION_ORDER.indexOf(region);
        return index === -1 ? 999 : index;
    };

    const normalizeCompany = (company) => {
        return {
            ...company,
            id: Number(company.id),
            name: company.name || "-",
            serviceRegionLabel: normalizeRegion(company),
            active: Boolean(company.active),
            status: company.status || (company.active ? "APPROVED" : "PENDING"),
            partner: Boolean(company.partner ?? company.isPartner),
        };
    };

    const fetchCompanies = async () => {
        try {
            const res = await axios.get("/api/admin/companies", {
                params: {
                    activeOnly: false,
                    page: 0,
                    size: 100,
                    sort: "id,desc",
                },
            });

            const list = extractList(res.data)
                .map(normalizeCompany)
                .sort((a, b) => {
                    const regionDiff = regionIndex(a.serviceRegionLabel) - regionIndex(b.serviceRegionLabel);
                    if (regionDiff !== 0) return regionDiff;
                    return String(a.name).localeCompare(String(b.name), "ko");
                });

            setCompanies(list);

            if (selectedCompanyId) {
                const selected = list.find((c) => Number(c.id) === Number(selectedCompanyId));

                if (selected) {
                    setSelectedCompanyName(selected.name || "");
                    setSelectedRegion(selected.serviceRegionLabel || "ALL");
                }
            }
        } catch (err) {
            console.error("업체 목록 조회 실패:", err);

            if (err.response?.status === 401 || err.response?.status === 403) {
                alert("관리자 인증이 만료되었거나 토큰이 없습니다. 다시 로그인하세요.");
                localStorage.clear();
                window.location.href = "/";
                return;
            }

            setCompanies([]);
            alert("업체 목록 조회 실패");
        }
    };

    const fetchData = async () => {
        if (!selectedCompanyId) {
            setData([]);
            return;
        }

        try {
            const res = await axios.get("/api/admin/reservations", {
                params: { companyId: selectedCompanyId }
            });

            const list = extractList(res.data);
            setData(list);
        } catch (err) {
            console.error("예약 조회 실패:", err);

            if (err.response?.status === 401 || err.response?.status === 403) {
                alert("관리자 인증이 만료되었거나 토큰이 없습니다. 다시 로그인하세요.");
                localStorage.clear();
                window.location.href = "/";
                return;
            }

            setData([]);
            alert("예약 조회 실패");
        }
    };

    useEffect(() => {
        fetchCompanies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCompanyId]);

    const availableRegions = useMemo(() => {
        const regions = Array.from(
            new Set(companies.map((c) => c.serviceRegionLabel || "기타"))
        );

        return regions.sort((a, b) => regionIndex(a) - regionIndex(b));
    }, [companies]);

    const filteredCompanies = useMemo(() => {
        if (selectedRegion === "ALL") {
            return companies;
        }

        return companies.filter((company) => company.serviceRegionLabel === selectedRegion);
    }, [companies, selectedRegion]);

    const update = async (id, status) => {
        const actionText = status === "ACCEPTED" ? "승인" : "거절";

        if (!window.confirm(`이 예약을 ${actionText}하시겠습니까?`)) {
            return;
        }

        try {
            await axios.patch(`/api/admin/reservations/${id}`, null, {
                params: { status }
            });

            await fetchData();
        } catch (err) {
            console.error("상태 업데이트 실패:", err);

            if (err.response?.status === 401 || err.response?.status === 403) {
                alert("관리자 인증이 만료되었습니다. 다시 로그인하세요.");
                localStorage.clear();
                window.location.href = "/";
                return;
            }

            alert("상태 업데이트 실패");
        }
    };

    const getStatusLabel = (status) => {
        if (status === "ACCEPTED") return "● 승인됨";
        if (status === "REJECTED") return "● 거절됨";
        return "● 대기중";
    };

    return (
        <div style={styles.container}>
            <div style={styles.headerSection}>
                <h2 style={styles.title}>
                    📋 예약 관리{" "}
                    {selectedCompanyName && (
                        <span style={{ color: "#0066ff" }}>
                            : {selectedCompanyName}
                        </span>
                    )}
                </h2>

                <p style={styles.subTitle}>
                    업체를 선택하여 실시간 예약 현황을 확인하고 승인/거절을 관리하세요.
                </p>
            </div>

            <div style={styles.filterCard}>
                <div style={styles.selectGroup}>
                    <span style={styles.selectLabel}>지역 선택</span>

                    <select
                        style={styles.selectBox}
                        value={selectedRegion}
                        onChange={(e) => {
                            setSelectedRegion(e.target.value);
                            setSelectedCompanyId(null);
                            setSelectedCompanyName("");
                            setData([]);
                        }}
                    >
                        <option value="ALL">전체 지역</option>

                        {availableRegions.map((region) => (
                            <option key={region} value={region}>
                                {region}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={styles.selectGroup}>
                    <span style={styles.selectLabel}>대상 업체 선택</span>

                    <select
                        style={styles.selectBox}
                        value={selectedCompanyId || ""}
                        onChange={(e) => {
                            const companyId = Number(e.target.value);

                            if (!companyId) {
                                setSelectedCompanyId(null);
                                setSelectedCompanyName("");
                                setData([]);
                                return;
                            }

                            const selected = companies.find((c) => Number(c.id) === companyId);

                            setSelectedCompanyId(selected?.id || null);
                            setSelectedCompanyName(selected?.name || "");
                            setSelectedRegion(selected?.serviceRegionLabel || "ALL");
                        }}
                    >
                        <option value="">
                            {selectedRegion === "ALL" ? "전체 업체 목록" : `${selectedRegion} 업체 목록`}
                        </option>

                        {filteredCompanies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={styles.tableCard}>
                <table style={styles.table}>
                    <thead style={styles.thead}>
                    <tr>
                        <th style={styles.th}>고객 정보</th>
                        <th style={styles.th}>서비스 요청 내용</th>
                        <th style={styles.th}>방문 예정일</th>
                        <th style={styles.th}>상태</th>
                        <th style={{ ...styles.th, textAlign: "right" }}>
                            관리 액션
                        </th>
                    </tr>
                    </thead>

                    <tbody>
                    {!selectedCompanyId ? (
                        <tr>
                            <td
                                colSpan="5"
                                style={{
                                    ...styles.td,
                                    textAlign: "center",
                                    padding: "80px",
                                    color: "#94A3B8"
                                }}
                            >
                                <div style={{ fontSize: "40px", marginBottom: "16px" }}>
                                    🏢
                                </div>
                                조회할 지역과 업체를 먼저 선택해 주세요.
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td
                                colSpan="5"
                                style={{
                                    ...styles.td,
                                    textAlign: "center",
                                    padding: "80px",
                                    color: "#94A3B8"
                                }}
                            >
                                해당 업체의 예약 데이터가 존재하지 않습니다.
                            </td>
                        </tr>
                    ) : (
                        data.map((r) => (
                            <tr key={r.id} style={styles.tr}>
                                <td style={styles.td}>
                                    <div style={{ fontWeight: "700", color: "#1e293b" }}>
                                        {r.customerName || "-"}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                                        ID: {r.id}
                                    </div>
                                </td>

                                <td
                                    style={{
                                        ...styles.td,
                                        maxWidth: "300px",
                                        lineHeight: "1.4"
                                    }}
                                >
                                    {r.issueSummary || "-"}
                                </td>

                                <td style={styles.td}>
                                    <div style={{ fontWeight: "600", color: "#475569" }}>
                                        {r.visitDate || "-"}
                                    </div>
                                </td>

                                <td style={styles.td}>
                                    <span style={styles.statusBadge(r.status)}>
                                        {getStatusLabel(r.status)}
                                    </span>
                                </td>

                                <td style={{ ...styles.td, textAlign: "right" }}>
                                    <button
                                        onClick={() => update(r.id, "ACCEPTED")}
                                        style={styles.actionBtn("accept")}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor = "#0052cc";
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor = "#0066ff";
                                        }}
                                    >
                                        승인
                                    </button>

                                    <button
                                        onClick={() => update(r.id, "REJECTED")}
                                        style={styles.actionBtn("reject")}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor = "#f8fafc";
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor = "white";
                                        }}
                                    >
                                        거절
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

export default ReservationsPage;