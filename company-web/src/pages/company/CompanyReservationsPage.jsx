import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";

function extractData(responseData) {
    return responseData?.data ?? responseData;
}

function todayString() {
    return new Date().toISOString().slice(0, 10);
}

function formatWon(value) {
    if (value === null || value === undefined || value === "") return "-";
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return `${n.toLocaleString()}원`;
}

function CompanyReservationsPage() {
    const navigate = useNavigate();
    const [list, setList] = useState([]);
    const [selectedDate, setSelectedDate] = useState(todayString());
    const [loading, setLoading] = useState(false);
    const [submittingId, setSubmittingId] = useState(null);
    const [completeForm, setCompleteForm] = useState({
        open: false,
        reservationId: null,
        repairCompletedDate: todayString(),
        totalCost: "",
        repairSummary: ""
    });

    const fetchReservations = async (date = selectedDate) => {
        try {
            setLoading(true);

            const res = await axios.get("/api/company/reservations", {
                params: { date }
            });

            const body = extractData(res.data);
            setList(Array.isArray(body) ? body : []);
        } catch (e) {
            console.log("예약 조회 실패:", e);
            if (e.response) {
                console.log("서버 응답:", e.response.data);
            }
            alert("예약 조회 실패");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        if (submittingId) return;

        try {
            setSubmittingId(id);

            await axios.post(`/api/company/reservations/${id}/status`, null, {
                params: { status }
            });

            await fetchReservations(selectedDate);
            alert(`상태 변경 완료: ${status}`);
        } catch (e) {
            console.log("상태 변경 실패:", e);
            if (e.response) {
                console.log("서버 응답:", e.response.data);
                alert(e.response.data?.message || "상태 변경 실패");
            } else {
                alert("상태 변경 실패");
            }
        } finally {
            setSubmittingId(null);
        }
    };

    const rejectReservation = async (id) => {
        if (submittingId) return;

        const reason = window.prompt("거절 사유를 입력하세요.");
        if (reason === null) return;
        if (!reason.trim()) {
            alert("거절 사유를 입력해야 합니다.");
            return;
        }

        try {
            setSubmittingId(id);

            await axios.post(`/api/company/reservations/${id}/reject`, {
                reason: reason.trim()
            });

            await fetchReservations(selectedDate);
            alert("예약이 거절되었습니다.");
        } catch (e) {
            console.log("예약 거절 실패:", e);
            if (e.response) {
                console.log("서버 응답:", e.response.data);
                alert(e.response.data?.message || "예약 거절 실패");
            } else {
                alert("예약 거절 실패");
            }
        } finally {
            setSubmittingId(null);
        }
    };

    const markNoShow = async (id) => {
        if (submittingId) return;
        if (!window.confirm("이 예약을 노쇼 처리할까요?")) return;

        try {
            setSubmittingId(id);

            await axios.post(`/api/company/reservations/${id}/noshow`);
            await fetchReservations(selectedDate);
            alert("노쇼 처리 완료");
        } catch (e) {
            console.log("노쇼 처리 실패:", e);
            if (e.response) {
                console.log("서버 응답:", e.response.data);
                alert(e.response.data?.message || "노쇼 처리 실패");
            } else {
                alert("노쇼 처리 실패");
            }
        } finally {
            setSubmittingId(null);
        }
    };

    const openCompleteModal = (reservation) => {
        setCompleteForm({
            open: true,
            reservationId: reservation.id,
            repairCompletedDate: reservation.repairCompletedDate || todayString(),
            totalCost:
                reservation.repairTotalCost !== null &&
                reservation.repairTotalCost !== undefined
                    ? String(reservation.repairTotalCost)
                    : "",
            repairSummary: reservation.repairSummary || ""
        });
    };

    const closeCompleteModal = () => {
        if (submittingId) return;

        setCompleteForm({
            open: false,
            reservationId: null,
            repairCompletedDate: todayString(),
            totalCost: "",
            repairSummary: ""
        });
    };

    const completeReservation = async () => {
        if (submittingId || !completeForm.reservationId) return;

        const repairCompletedDate = completeForm.repairCompletedDate.trim();
        const totalCostText = String(completeForm.totalCost).replaceAll(",", "").trim();
        const repairSummary = completeForm.repairSummary.trim();
        const totalCost = Number(totalCostText);

        if (!repairCompletedDate) {
            alert("수리 완료일을 입력하세요.");
            return;
        }

        if (!totalCostText || !Number.isFinite(totalCost) || totalCost < 0) {
            alert("총비용은 0 이상의 숫자로 입력하세요.");
            return;
        }

        if (!repairSummary) {
            alert("실제 작업 요약을 입력하세요.");
            return;
        }

        try {
            setSubmittingId(completeForm.reservationId);

            await axios.post(
                `/api/company/reservations/${completeForm.reservationId}/complete`,
                {
                    repairCompletedDate,
                    totalCost,
                    repairSummary
                }
            );

            closeCompleteModal();
            await fetchReservations(selectedDate);
            alert("수리 완료 정보가 저장되었습니다.");
        } catch (e) {
            console.log("완료 처리 실패:", e);
            if (e.response) {
                console.log("서버 응답:", e.response.data);
                alert(e.response.data?.message || "완료 처리 실패");
            } else {
                alert("완료 처리 실패");
            }
        } finally {
            setSubmittingId(null);
        }
    };

    useEffect(() => {
        fetchReservations(selectedDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case "ACCEPTED":
                return "#10B981";
            case "REJECTED":
                return "#EF4444";
            case "PENDING":
                return "#0066FF";
            case "NOSHOW":
                return "#7C3AED";
            case "CANCELLED":
                return "#64748B";
            case "DONE":
                return "#059669";
            default:
                return "#64748B";
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case "ACCEPTED":
                return "수락";
            case "REJECTED":
                return "거절";
            case "PENDING":
                return "대기";
            case "NOSHOW":
                return "노쇼";
            case "CANCELLED":
                return "취소";
            case "DONE":
                return "수리 완료";
            default:
                return status || "UNKNOWN";
        }
    };

    const styles = {
        page: {
            padding: "30px",
            backgroundColor: "#F8FAFC",
            minHeight: "100vh"
        },
        header: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px"
        },
        title: {
            fontSize: "24px",
            fontWeight: "800",
            color: "#1E293B",
            margin: 0
        },
        controls: {
            display: "flex",
            gap: "10px",
            alignItems: "center"
        },
        dateInput: {
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid #CBD5E1",
            fontSize: "14px"
        },
        refreshBtn: {
            padding: "10px 14px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#0066FF",
            color: "white",
            fontWeight: "800",
            cursor: "pointer"
        },
        summary: {
            marginBottom: "16px",
            color: "#64748B",
            fontSize: "14px",
            fontWeight: "700"
        },
        emptyBox: {
            backgroundColor: "white",
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            padding: "40px",
            textAlign: "center",
            color: "#94A3B8"
        },
        list: {
            display: "grid",
            gap: "14px"
        },
        card: {
            backgroundColor: "white",
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            padding: "18px",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)"
        },
        topRow: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            marginBottom: "12px"
        },
        name: {
            fontSize: "18px",
            fontWeight: "800",
            color: "#1E293B",
            marginBottom: "4px"
        },
        subText: {
            fontSize: "13px",
            color: "#64748B"
        },
        statusBadge: (status) => ({
            padding: "6px 10px",
            borderRadius: "999px",
            border: `1px solid ${getStatusColor(status)}`,
            color: getStatusColor(status),
            fontWeight: "800",
            fontSize: "12px",
            whiteSpace: "nowrap"
        }),
        infoGrid: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginTop: "10px",
            marginBottom: "16px"
        },
        label: {
            fontSize: "12px",
            color: "#94A3B8",
            fontWeight: "700",
            marginBottom: "3px"
        },
        value: {
            fontSize: "14px",
            color: "#334155",
            fontWeight: "700"
        },
        repairBox: {
            marginTop: "12px",
            padding: "12px",
            borderRadius: "12px",
            backgroundColor: "#ECFDF5",
            border: "1px solid #A7F3D0",
            color: "#065F46"
        },
        actions: {
            display: "flex",
            gap: "8px"
        },
        btn: (type, disabled = false) => {
            const base = {
                flex: 1,
                padding: "11px",
                borderRadius: "10px",
                fontWeight: "800",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.55 : 1
            };

            if (type === "accept") {
                return {
                    ...base,
                    border: "none",
                    backgroundColor: "#0066FF",
                    color: "white"
                };
            }

            if (type === "reject") {
                return {
                    ...base,
                    border: "1px solid #FCA5A5",
                    backgroundColor: "#FEE2E2",
                    color: "#B91C1C"
                };
            }

            if (type === "done") {
                return {
                    ...base,
                    border: "none",
                    backgroundColor: "#16A34A",
                    color: "white"
                };
            }

            return {
                ...base,
                border: "1px solid #DDD6FE",
                backgroundColor: "#F5F3FF",
                color: "#6D28D9"
            };
        },
        modalOverlay: {
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "24px"
        },
        modalBox: {
            width: "100%",
            maxWidth: "520px",
            backgroundColor: "#FFFFFF",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 24px 70px rgba(15, 23, 42, 0.24)"
        },
        modalTitle: {
            fontSize: "20px",
            fontWeight: "900",
            color: "#0F172A",
            marginBottom: "8px"
        },
        modalDesc: {
            fontSize: "14px",
            color: "#64748B",
            fontWeight: "700",
            lineHeight: "20px",
            marginBottom: "18px"
        },
        modalField: {
            display: "flex",
            flexDirection: "column",
            gap: "7px",
            marginBottom: "14px"
        },
        modalLabel: {
            fontSize: "13px",
            color: "#475569",
            fontWeight: "900"
        },
        modalInput: {
            height: "44px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            padding: "0 12px",
            fontSize: "14px",
            fontWeight: "700",
            outline: "none"
        },
        modalTextarea: {
            minHeight: "110px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            padding: "12px",
            fontSize: "14px",
            fontWeight: "700",
            resize: "vertical",
            outline: "none"
        },
        modalActions: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginTop: "18px"
        },
        modalCancelBtn: {
            height: "46px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            backgroundColor: "#FFFFFF",
            color: "#475569",
            fontWeight: "900",
            cursor: "pointer"
        },
        modalSubmitBtn: {
            height: "46px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "#16A34A",
            color: "#FFFFFF",
            fontWeight: "900",
            cursor: "pointer"
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h2 style={styles.title}>예약 목록</h2>

                <div style={styles.controls}>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            fetchReservations(e.target.value);
                        }}
                        style={styles.dateInput}
                    />

                    <button
                        type="button"
                        onClick={() => fetchReservations(selectedDate)}
                        style={styles.refreshBtn}
                    >
                        새로고침
                    </button>
                </div>
            </div>

            <div style={styles.summary}>
                {selectedDate} 예약 {list.length}건
            </div>

            {loading ? (
                <div style={styles.emptyBox}>예약을 불러오는 중...</div>
            ) : list.length === 0 ? (
                <div style={styles.emptyBox}>선택한 날짜에 예약이 없습니다.</div>
            ) : (
                <div style={styles.list}>
                    {list.map((r) => (
                        <div key={r.id} style={styles.card}>
                            <div style={styles.topRow}>
                                <div>
                                    <div style={styles.name}>{r.customerName || "-"}</div>
                                    <div style={styles.subText}>
                                        {r.visitDate || selectedDate} {r.visitTime || ""}
                                    </div>
                                </div>

                                <div style={styles.statusBadge(r.status)}>
                                    {getStatusText(r.status)}
                                </div>
                            </div>

                            <div style={styles.infoGrid}>
                                <div>
                                    <div style={styles.label}>연락처</div>
                                    <div style={styles.value}>{r.phoneNumber || "-"}</div>
                                </div>

                                <div>
                                    <div style={styles.label}>주소</div>
                                    <div style={styles.value}>{r.address || "-"}</div>
                                </div>

                                <div>
                                    <div style={styles.label}>문제</div>
                                    <div style={styles.value}>{r.issueSummary || "-"}</div>
                                </div>

                                <div>
                                    <div style={styles.label}>요청사항</div>
                                    <div style={styles.value}>{r.requestNote || "-"}</div>
                                </div>
                            </div>

                            {r.status === "DONE" && (
                                <div style={styles.repairBox}>
                                    <div style={styles.value}>
                                        수리 완료일: {r.repairCompletedDate || "-"}
                                    </div>
                                    <div style={styles.value}>
                                        총비용: {formatWon(r.repairTotalCost)}
                                    </div>
                                    <div style={styles.value}>
                                        실제 작업요약: {r.repairSummary || "-"}
                                    </div>
                                </div>
                            )}

                            <div style={styles.actions}>
                                {r.status === "PENDING" && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={submittingId === r.id}
                                            onClick={() => updateStatus(r.id, "ACCEPTED")}
                                            style={styles.btn("accept", submittingId === r.id)}
                                        >
                                            수락
                                        </button>

                                        <button
                                            type="button"
                                            disabled={submittingId === r.id}
                                            onClick={() => rejectReservation(r.id)}
                                            style={styles.btn("reject", submittingId === r.id)}
                                        >
                                            거절
                                        </button>
                                    </>
                                )}

                                {r.status === "ACCEPTED" && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={submittingId === r.id}
                                            onClick={() => openCompleteModal(r)}
                                            style={styles.btn("done", submittingId === r.id)}
                                        >
                                            수리 완료
                                        </button>

                                        <button
                                            type="button"
                                            disabled={submittingId === r.id}
                                            onClick={() => updateStatus(r.id, "PENDING")}
                                            style={styles.btn("pending", submittingId === r.id)}
                                        >
                                            대기
                                        </button>
                                    </>
                                )}

                                {r.status !== "PENDING" && r.status !== "ACCEPTED" && r.status !== "DONE" && (
                                    <button
                                        type="button"
                                        disabled={submittingId === r.id}
                                        onClick={() => updateStatus(r.id, "PENDING")}
                                        style={styles.btn("pending", submittingId === r.id)}
                                    >
                                        대기
                                    </button>
                                )}

                                {r.status !== "DONE" && (
                                    <button
                                        type="button"
                                        disabled={submittingId === r.id}
                                        onClick={() => markNoShow(r.id)}
                                        style={styles.btn("noshow", submittingId === r.id)}
                                    >
                                        노쇼
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/company/messages?with=${encodeURIComponent(r.customerName || "고객")}&type=USER`
                                        )
                                    }
                                    style={{
                                        flex: 1,
                                        padding: "11px",
                                        borderRadius: "10px",
                                        fontWeight: "800",
                                        cursor: "pointer",
                                        border: "1px solid #93C5FD",
                                        backgroundColor: "#EFF6FF",
                                        color: "#1D4ED8"
                                    }}
                                >
                                    ✉️ 쪽지
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {completeForm.open && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalBox}>
                        <div style={styles.modalTitle}>수리 완료 정보 입력</div>
                        <div style={styles.modalDesc}>
                            업체가 입력한 수리 완료 정보는 사용자 앱의 PDF 리포트에 자동으로 반영됩니다.
                        </div>

                        <div style={styles.modalField}>
                            <label style={styles.modalLabel}>수리 완료일</label>
                            <input
                                type="date"
                                value={completeForm.repairCompletedDate}
                                onChange={(e) =>
                                    setCompleteForm((prev) => ({
                                        ...prev,
                                        repairCompletedDate: e.target.value
                                    }))
                                }
                                style={styles.modalInput}
                            />
                        </div>

                        <div style={styles.modalField}>
                            <label style={styles.modalLabel}>총비용</label>
                            <input
                                type="number"
                                min="0"
                                value={completeForm.totalCost}
                                onChange={(e) =>
                                    setCompleteForm((prev) => ({
                                        ...prev,
                                        totalCost: e.target.value
                                    }))
                                }
                                placeholder="예: 120000"
                                style={styles.modalInput}
                            />
                        </div>

                        <div style={styles.modalField}>
                            <label style={styles.modalLabel}>실제 작업요약</label>
                            <textarea
                                value={completeForm.repairSummary}
                                onChange={(e) =>
                                    setCompleteForm((prev) => ({
                                        ...prev,
                                        repairSummary: e.target.value
                                    }))
                                }
                                placeholder="예: 곰팡이 제거, 방습 처리 및 실리콘 마감 작업 완료"
                                style={styles.modalTextarea}
                            />
                        </div>

                        <div style={styles.modalActions}>
                            <button
                                type="button"
                                disabled={Boolean(submittingId)}
                                onClick={closeCompleteModal}
                                style={styles.modalCancelBtn}
                            >
                                취소
                            </button>

                            <button
                                type="button"
                                disabled={Boolean(submittingId)}
                                onClick={completeReservation}
                                style={styles.modalSubmitBtn}
                            >
                                {submittingId ? "저장 중..." : "수리 완료 저장"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CompanyReservationsPage;
