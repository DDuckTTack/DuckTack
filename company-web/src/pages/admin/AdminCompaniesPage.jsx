import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import { useNavigate } from "react-router-dom";

const REGION_ORDER = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "기타"];

function normalizeText(value) {
    return String(value ?? "").trim().toLowerCase();
}

function regionIndex(region) {
    const index = REGION_ORDER.indexOf(region || "기타");
    return index === -1 ? 999 : index;
}

function AdminCompaniesPage() {
    const navigate = useNavigate();

    const [companies, setCompanies] = useState([]);
    const [loadingId, setLoadingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState("ALL");
    const [searchText, setSearchText] = useState("");

    const extractCompanyList = (responseData) => {
        console.log("업체 목록 원본 응답:", responseData);

        const body = responseData?.data ?? responseData;

        if (Array.isArray(body?.content)) return body.content;
        if (Array.isArray(body)) return body;
        if (Array.isArray(responseData?.data?.content)) return responseData.data.content;
        if (Array.isArray(body?.companies)) return body.companies;
        if (Array.isArray(responseData?.companies)) return responseData.companies;

        return [];
    };

    const normalizeCompany = (company) => {
        const status =
            company.status ||
            company.companyStatus ||
            (company.active ? "APPROVED" : "PENDING");

        const active = Boolean(company.active);
        const partner =
            Boolean(company.partner ?? company.isPartner) ||
            (status === "APPROVED" && active);

        const serviceRegionLabel =
            company.serviceRegionLabel ||
            company.region ||
            company.serviceRegion ||
            "기타";

        return {
            ...company,
            id: Number(company.id),
            name: company.name || company.companyName || "-",
            status,
            active,
            partner,
            partnerPriority: company.partnerPriority ?? 0,
            username: company.username ?? "",
            serviceRegionLabel,
            address: company.address ?? company.addressLine ?? "",
            phone: company.phone ?? company.phoneNumber ?? "",
            email: company.email ?? "",
        };
    };

    const sortCompanies = (list) => {
        return [...list].sort((a, b) => {
            const regionDiff = regionIndex(a.serviceRegionLabel) - regionIndex(b.serviceRegionLabel);
            if (regionDiff !== 0) return regionDiff;

            const partnerDiff = Number(b.partner) - Number(a.partner);
            if (partnerDiff !== 0) return partnerDiff;

            const priorityDiff = Number(b.partnerPriority || 0) - Number(a.partnerPriority || 0);
            if (priorityDiff !== 0) return priorityDiff;

            return String(a.name || "").localeCompare(String(b.name || ""), "ko");
        });
    };

    const fetchCompanies = async () => {
        try {
            setLoading(true);

            const res = await axios.get("/api/admin/companies", {
                params: {
                    activeOnly: false,
                    page: 0,
                    size: 300,
                    sort: "id,desc",
                },
            });

            const list = sortCompanies(extractCompanyList(res.data).map(normalizeCompany));
            setCompanies(list);
        } catch (err) {
            console.error("업체 조회 실패:", err);
            console.log("서버 응답:", err.response?.data);

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
            await axios.patch(`/api/admin/companies/${id}/status`, { status });
            await fetchCompanies();

            if (status === "APPROVED") alert("업체가 승인되었습니다.");
            else if (status === "REJECTED") alert("업체가 거절되었습니다.");
            else if (status === "RETURNED") alert("업체가 반려되었습니다.");
            else alert("업체 상태가 변경되었습니다.");
        } catch (err) {
            console.error("상태 변경 실패:", err);
            console.log("서버 응답:", err.response?.data);

            if (err.response?.status === 401 || err.response?.status === 403) {
                alert("관리자 인증이 만료되었거나 권한이 없습니다. 다시 로그인하세요.");
                localStorage.clear();
                navigate("/");
                return;
            }

            alert(err.response?.data?.message || "상태 변경 실패");
        } finally {
            setLoadingId(null);
        }
    };

    const renderStatus = (company) => {
        switch (company.status) {
            case "APPROVED":
                return <span style={{ color: "#10B981", fontWeight: "800" }}>🟢 승인 / 활성</span>;
            case "PENDING":
                return <span style={{ color: "#64748B", fontWeight: "800" }}>⚪ 승인 대기 / 비활성</span>;
            case "REJECTED":
                return <span style={{ color: "#EF4444", fontWeight: "800" }}>🔴 거절</span>;
            case "RETURNED":
                return <span style={{ color: "#F59E0B", fontWeight: "800" }}>🟠 반려</span>;
            default:
                return <span style={{ color: "#64748B", fontWeight: "800" }}>⚪ {company.status || "UNKNOWN"}</span>;
        }
    };

    const regions = useMemo(() => {
        const set = new Set(companies.map((c) => c.serviceRegionLabel || "기타"));
        return Array.from(set).sort((a, b) => regionIndex(a) - regionIndex(b));
    }, [companies]);

    const filteredCompanies = useMemo(() => {
        const q = normalizeText(searchText);

        return sortCompanies(
            companies.filter((company) => {
                const regionMatched = selectedRegion === "ALL" || company.serviceRegionLabel === selectedRegion;

                const searchable = [
                    company.id,
                    company.name,
                    company.username,
                    company.serviceRegionLabel,
                    company.address,
                    company.phone,
                    company.email,
                ]
                    .map((v) => normalizeText(v))
                    .join(" ");

                const searchMatched = !q || searchable.includes(q);
                return regionMatched && searchMatched;
            })
        );
    }, [companies, selectedRegion, searchText]);

    const groupedCompanies = useMemo(() => {
        const map = new Map();

        filteredCompanies.forEach((company) => {
            const region = company.serviceRegionLabel || "기타";
            if (!map.has(region)) map.set(region, []);
            map.get(region).push(company);
        });

        return Array.from(map.entries()).sort((a, b) => regionIndex(a[0]) - regionIndex(b[0]));
    }, [filteredCompanies]);

    const pendingCount = companies.filter((c) => c.status === "PENDING").length;
    const approvedCount = companies.filter((c) => c.status === "APPROVED").length;
    const rejectedCount = companies.filter((c) => c.status === "REJECTED").length;
    const returnedCount = companies.filter((c) => c.status === "RETURNED").length;

    const styles = {
        container: { padding: "40px", backgroundColor: "#F4F7FA", minHeight: "100vh" },
        card: { backgroundColor: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)" },
        header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
        title: { margin: 0, color: "#1E293B", fontSize: "24px", fontWeight: "900" },
        refreshBtn: { padding: "10px 14px", border: "none", borderRadius: "10px", backgroundColor: "#0066FF", color: "white", fontWeight: "800", cursor: "pointer", opacity: loading ? 0.6 : 1 },
        summary: { marginBottom: "14px", color: "#64748B", fontSize: "14px", fontWeight: "700" },
        filterPanel: { display: "grid", gridTemplateColumns: "1fr 1.4fr auto", gap: "12px", alignItems: "center", padding: "16px", backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "14px", marginBottom: "18px" },
        select: { height: "44px", border: "1px solid #CBD5E1", borderRadius: "10px", padding: "0 12px", fontWeight: "800", color: "#334155", backgroundColor: "white" },
        input: { height: "44px", border: "1px solid #CBD5E1", borderRadius: "10px", padding: "0 14px", fontWeight: "700", color: "#334155", backgroundColor: "white" },
        resetBtn: { height: "44px", border: "none", borderRadius: "10px", padding: "0 16px", backgroundColor: "#64748B", color: "white", fontWeight: "900", cursor: "pointer" },
        table: { width: "100%", borderCollapse: "collapse" },
        th: { padding: "14px", borderBottom: "2px solid #EDF2F7", textAlign: "left", color: "#334155", fontSize: "14px" },
        td: { padding: "14px", borderBottom: "1px solid #F1F5F9", color: "#334155", fontSize: "14px", verticalAlign: "middle" },
        regionRow: { padding: "12px 14px", backgroundColor: "#EFF6FF", color: "#1D4ED8", fontWeight: "900", borderTop: "1px solid #DBEAFE", borderBottom: "1px solid #DBEAFE" },
        smallText: { fontSize: "12px", color: "#94A3B8", marginTop: "4px" },
        btnGroup: { display: "flex", gap: "8px", flexWrap: "wrap" },
        btn: (type, disabled) => {
            const base = { padding: "8px 13px", borderRadius: "8px", border: "none", cursor: disabled ? "not-allowed" : "pointer", color: "white", fontWeight: "800", opacity: disabled ? 0.55 : 1, fontSize: "13px" };
            if (type === "approve") return { ...base, backgroundColor: "#0066FF" };
            if (type === "reject") return { ...base, backgroundColor: "#EF4444" };
            if (type === "returned") return { ...base, backgroundColor: "#F59E0B" };
            return base;
        },
        empty: { padding: "30px", textAlign: "center", color: "#64748B" },
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h2 style={styles.title}>업체 관리</h2>
                    <button type="button" onClick={fetchCompanies} style={styles.refreshBtn} disabled={loading}>
                        {loading ? "불러오는 중..." : "새로고침"}
                    </button>
                </div>

                <div style={styles.summary}>
                    전체 {companies.length}개 · 승인 대기 {pendingCount}개 · 승인 {approvedCount}개 · 거절 {rejectedCount}개 · 반려 {returnedCount}개 · 현재 표시 {filteredCompanies.length}개
                </div>

                <div style={styles.filterPanel}>
                    <select style={styles.select} value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
                        <option value="ALL">전체 지역</option>
                        {regions.map((region) => (
                            <option key={region} value={region}>{region}</option>
                        ))}
                    </select>

                    <input
                        style={styles.input}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="업체명, 계정, 주소, 전화번호로 검색"
                    />

                    <button
                        type="button"
                        style={styles.resetBtn}
                        onClick={() => {
                            setSelectedRegion("ALL");
                            setSearchText("");
                        }}
                    >
                        필터 초기화
                    </button>
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
                    {filteredCompanies.length === 0 ? (
                        <tr>
                            <td colSpan="6" style={styles.empty}>조회된 업체가 없습니다.</td>
                        </tr>
                    ) : (
                        groupedCompanies.map(([region, list]) => (
                            <FragmentGroup
                                key={region}
                                region={region}
                                list={list}
                                styles={styles}
                                loadingId={loadingId}
                                renderStatus={renderStatus}
                                updateStatus={updateStatus}
                            />
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function FragmentGroup({ region, list, styles, loadingId, renderStatus, updateStatus }) {
    return (
        <>
            <tr>
                <td colSpan="6" style={styles.regionRow}>
                    {region} · {list.length}개 업체
                </td>
            </tr>

            {list.map((company) => {
                const disabled = loadingId === company.id;

                return (
                    <tr key={company.id}>
                        <td style={styles.td}>{company.id}</td>

                        <td style={styles.td}>
                            <div style={{ fontWeight: "900", color: "#1E293B" }}>{company.name || "-"}</div>
                            <div style={styles.smallText}>계정: {company.username || "-"}</div>
                            {company.address ? <div style={styles.smallText}>주소: {company.address}</div> : null}
                            {company.phone ? <div style={styles.smallText}>연락처: {company.phone}</div> : null}
                        </td>

                        <td style={styles.td}>{company.serviceRegionLabel || "-"}</td>
                        <td style={styles.td}>{renderStatus(company)}</td>

                        <td style={styles.td}>
                            {company.partner ? (
                                <span style={{ color: "#0066FF", fontWeight: "800" }}>제휴</span>
                            ) : (
                                <span style={{ color: "#94A3B8", fontWeight: "800" }}>비제휴</span>
                            )}
                        </td>

                        <td style={styles.td}>
                            <div style={styles.btnGroup}>
                                <button type="button" disabled={disabled} style={styles.btn("approve", disabled)} onClick={() => updateStatus(company.id, "APPROVED")}>승인</button>
                                <button type="button" disabled={disabled} style={styles.btn("reject", disabled)} onClick={() => updateStatus(company.id, "REJECTED")}>거절</button>
                                <button type="button" disabled={disabled} style={styles.btn("returned", disabled)} onClick={() => updateStatus(company.id, "RETURNED")}>반려</button>
                            </div>
                        </td>
                    </tr>
                );
            })}
        </>
    );
}

export default AdminCompaniesPage;
