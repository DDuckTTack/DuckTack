import { useState } from "react";
import axios from "../../api/axios";

function todayString() {
    return new Date().toISOString().slice(0, 10);
}

function formatWon(value) {
    if (value === null || value === undefined || value === "") return "-";
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return `${n.toLocaleString()}원`;
}

export default function ReservationDetail({
                                              detail,
                                              setReservations,
                                              refreshCalendar,
                                              setDetail
                                          }) {
    const [loading, setLoading] = useState(false);
    const [completeForm, setCompleteForm] = useState({
        open: false,
        repairCompletedDate: detail?.repairCompletedDate || todayString(),
        totalCost:
            detail?.repairTotalCost !== null && detail?.repairTotalCost !== undefined
                ? String(detail.repairTotalCost)
                : "",
        repairSummary: detail?.repairSummary || ""
    });

    const patchReservation = (patch) => {
        setReservations((prev) =>
            Array.isArray(prev)
                ? prev.map((r) =>
                    r.id === detail.id
                        ? { ...r, ...patch }
                        : r
                )
                : []
        );

        setDetail((prev) => ({
            ...prev,
            ...patch
        }));

        if (typeof refreshCalendar === "function") {
            refreshCalendar();
        }
    };

    const updateStatus = (status) => {
        if (loading) return;

        setLoading(true);

        axios.post(`/api/company/reservations/${detail.id}/status`, null, {
            params: { status }
        })
            .then(() => {
                patchReservation({ status });
                alert(`상태 변경 완료: ${status}`);
            })
            .catch((err) => {
                console.error("상태 변경 실패:", err);
                alert(err.response?.data?.message || "상태 변경 실패");
            })
            .finally(() => setLoading(false));
    };

    const openCompleteModal = () => {
        setCompleteForm({
            open: true,
            repairCompletedDate: detail?.repairCompletedDate || todayString(),
            totalCost:
                detail?.repairTotalCost !== null && detail?.repairTotalCost !== undefined
                    ? String(detail.repairTotalCost)
                    : "",
            repairSummary: detail?.repairSummary || ""
        });
    };
    function formatVisitDate(value) {
        if (!value) return "-";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

        const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} (${weekdays[date.getDay()]})`;
    }

    function formatVisitTime(value) {
        if (!value) return "-";
        return String(value).slice(0, 5);
    }
    const closeCompleteModal = () => {
        if (loading) return;

        setCompleteForm({
            open: false,
            repairCompletedDate: todayString(),
            totalCost: "",
            repairSummary: ""
        });
    };

    const completeReservation = async () => {
        if (loading) return;

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
            alert("실제 작업요약을 입력하세요.");
            return;
        }

        try {
            setLoading(true);

            await axios.post(`/api/company/reservations/${detail.id}/complete`, {
                repairCompletedDate,
                totalCost,
                repairSummary
            });

            patchReservation({
                status: "DONE",
                repairCompletedDate,
                repairTotalCost: totalCost,
                repairSummary
            });

            closeCompleteModal();
            alert("수리 완료 정보가 저장되었습니다.");
        } catch (err) {
            console.error("완료 처리 실패:", err);
            alert(err.response?.data?.message || "완료 처리 실패");
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            marginTop: "20px",
            padding: "20px",
            backgroundColor: "#F8FAFC",
            borderRadius: "12px",
            border: "1px solid #E2E8F0"
        },
        sectionTitle: {
            fontSize: "14px",
            color: "#64748B",
            fontWeight: "bold",
            marginBottom: "10px"
        },
        infoItem: {
            marginBottom: "10px"
        },
        label: {
            fontSize: "12px",
            color: "#94A3B8",
            fontWeight: "700",
            marginBottom: "4px"
        },
        value: {
            fontSize: "15px",
            color: "#1E293B",
            fontWeight: "500"
        },
        divider: {
            height: "1px",
            backgroundColor: "#E2E8F0",
            margin: "15px 0"
        },
        btnGroup: {
            display: "flex",
            gap: "10px",
            marginTop: "20px"
        },
        acceptBtn: {
            flex: 1,
            padding: "12px",
            backgroundColor: "#0066FF",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
        },
        rejectBtn: {
            flex: 1,
            padding: "12px",
            backgroundColor: "white",
            color: "#EF4444",
            border: "1px solid #FEE2E2",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
        },
        doneBtn: {
            flex: 1,
            padding: "12px",
            backgroundColor: "#16A34A",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
        },
        pendingBtn: {
            flex: 1,
            padding: "12px",
            backgroundColor: "#E2E8F0",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
        },
        repairBox: {
            marginTop: "12px",
            padding: "12px",
            borderRadius: "10px",
            backgroundColor: "#ECFDF5",
            border: "1px solid #A7F3D0"
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

        visitTimeCard: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "14px 16px",
            borderRadius: "14px",
            backgroundColor: "#EFF6FF",
            border: "1px solid #BFDBFE"
        },
        visitDateText: {
            fontSize: "15px",
            color: "#1E293B",
            fontWeight: "800"
        },
        visitTimeSubText: {
            marginTop: "3px",
            fontSize: "12px",
            color: "#64748B",
            fontWeight: "700"
        },
        visitTimeBadge: {
            minWidth: "76px",
            padding: "8px 12px",
            borderRadius: "999px",
            backgroundColor: "#2563EB",
            color: "#FFFFFF",
            fontSize: "15px",
            fontWeight: "900",
            textAlign: "center"
        },
    };

    return (
        <div style={styles.container}>
            <div style={styles.sectionTitle}>📋 예약 상세 정보</div>

            <div style={styles.infoItem}>
                <div style={styles.label}>고객</div>
                <div style={styles.value}>
                    {detail.customerName} ({detail.phoneNumber})
                </div>
            </div>

            <div style={styles.infoItem}>
                <div style={styles.label}>주소</div>
                <div style={styles.value}>{detail.address}</div>
            </div>

            <div style={styles.divider} />

            <div style={styles.infoItem}>
                <div style={styles.label}>문제</div>
                <div style={styles.value}>{detail.issueSummary}</div>
            </div>

            <div style={styles.infoItem}>
                <div style={styles.label}>요청사항</div>
                <div style={styles.value}>{detail.requestNote || "없음"}</div>
            </div>

            <div style={styles.divider} />

            <div style={styles.infoItem}>
                <div style={styles.label}>방문 시간</div>

                <div style={styles.visitTimeCard}>
                    <div>
                        <div style={styles.visitDateText}>
                            {formatVisitDate(detail.visitDate)}
                        </div>
                        <div style={styles.visitTimeSubText}>방문 예정 시간</div>
                    </div>

                    <div style={styles.visitTimeBadge}>
                        {formatVisitTime(detail.visitTime)}
                    </div>
                </div>
            </div>

            <div style={{
                marginTop: "10px",
                padding: "10px",
                borderRadius: "8px",
                fontWeight: "bold",
                textAlign: "center",
                backgroundColor:
                    detail.status === "DONE" ? "#DCFCE7" :
                    detail.status === "ACCEPTED" ? "#DCFCE7" :
                    detail.status === "REJECTED" ? "#FEE2E2" :
                    "#F1F5F9",
                color:
                    detail.status === "DONE" ? "#166534" :
                    detail.status === "ACCEPTED" ? "#166534" :
                    detail.status === "REJECTED" ? "#991B1B" :
                    "#64748B"
            }}>
                현재 상태: {detail.status}
            </div>

            {detail.status === "DONE" && (
                <div style={styles.repairBox}>
                    <div style={styles.label}>수리 완료 정보</div>
                    <div style={styles.value}>완료일: {detail.repairCompletedDate || "-"}</div>
                    <div style={styles.value}>총비용: {formatWon(detail.repairTotalCost)}</div>
                    <div style={styles.value}>작업요약: {detail.repairSummary || "-"}</div>
                </div>
            )}

            <div style={styles.btnGroup}>
                {detail.status === "PENDING" && (
                    <>
                        <button style={styles.acceptBtn} onClick={() => updateStatus("ACCEPTED")}>수락</button>
                        <button style={styles.rejectBtn} onClick={() => updateStatus("REJECTED")}>거절</button>
                    </>
                )}

                {detail.status === "ACCEPTED" && (
                    <>
                        <button style={styles.doneBtn} onClick={openCompleteModal}>수리 완료</button>
                        <button style={styles.pendingBtn} onClick={() => updateStatus("PENDING")}>대기</button>
                    </>
                )}

                {detail.status !== "PENDING" && detail.status !== "ACCEPTED" && detail.status !== "DONE" && (
                    <button style={styles.pendingBtn} onClick={() => updateStatus("PENDING")}>대기</button>
                )}
            </div>


            {completeForm.open && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalBox}>
                        <div style={styles.modalTitle}>수리 완료 정보 입력</div>
                        <div style={styles.modalDesc}>
                            입력한 수리 완료 정보는 사용자 PDF 리포트에 자동 반영됩니다.
                        </div>

                        <div style={styles.modalField}>
                            <div style={styles.label}>수리 완료일</div>
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
                            <div style={styles.label}>총비용</div>
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
                                style={styles.modalInput}
                            />
                        </div>

                        <div style={styles.modalField}>
                            <div style={styles.label}>실제 작업요약</div>
                            <textarea
                                value={completeForm.repairSummary}
                                onChange={(e) =>
                                    setCompleteForm((prev) => ({
                                        ...prev,
                                        repairSummary: e.target.value
                                    }))
                                }
                                style={styles.modalTextarea}
                            />
                        </div>

                        <div style={styles.modalActions}>
                            <button type="button" onClick={closeCompleteModal} style={styles.pendingBtn}>
                                취소
                            </button>
                            <button type="button" onClick={completeReservation} style={styles.doneBtn}>
                                {loading ? "저장 중..." : "수리 완료 저장"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
