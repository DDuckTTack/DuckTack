import {useState} from "react";
import {createPortal} from "react-dom";
import {useNavigate} from "react-router-dom";
import axios from "../../api/axios";
import {getOrCreateConversation} from "../../api/messages";

function formatVisitDate(value) {
    if (!value) return "-";

    if (Array.isArray(value)) {
        const [year, month, day] = value;

        if (!year || !month || !day) return "-";

        const date = new Date(Number(year), Number(month) - 1, Number(day));
        const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

        return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")} (${weekdays[date.getDay()]})`;
    }

    const text = String(value).slice(0, 10);
    const parts = text.split("-");

    if (parts.length !== 3) return text;

    const [year, month, day] = parts;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    return `${year}.${month}.${day} (${weekdays[date.getDay()]})`;
}

function formatVisitTime(value) {
    if (!value) return "-";

    if (Array.isArray(value)) {
        const [hour, minute] = value;

        if (hour === undefined || minute === undefined) return "-";

        return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }

    const text = String(value);

    if (text.includes(":")) {
        return text.slice(0, 5);
    }

    return text;
}

function toImageSrc(value) {
    if (!value) return "";

    const raw = String(value).trim();
    if (!raw) return "";

    if (raw.startsWith("data:")) {
        return raw;
    }

    const baseUrl = String(axios.defaults.baseURL || "")
        .replace(/\/api\/?$/, "")
        .replace(/\/$/, "");

    const storageIndex = raw.indexOf("/storage/");
    if (storageIndex >= 0) {
        const path = raw.slice(storageIndex);
        return `${baseUrl}${path}`;
    }

    if (raw.startsWith("http://") || raw.startsWith("https://")) {
        return raw;
    }

    if (raw.startsWith("/")) {
        return `${baseUrl}${raw}`;
    }

    return `${baseUrl}/${raw}`;
}

export default function ReservationList({
                                            reservations,
                                            setReservations,
                                            refreshCalendar
                                        }) {
    const navigate = useNavigate();
    const [detail, setDetail] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [loadingId, setLoadingId] = useState(null);
    const [completeForm, setCompleteForm] = useState(null);

    const extractData = (responseData) => {
        return responseData?.data ?? responseData;
    };

    const openMessageThread = async (customerId) => {
        if (!customerId) {
            alert("고객 계정 정보를 찾을 수 없어 쪽지를 보낼 수 없습니다.");
            return;
        }
        try {
            const conversation = await getOrCreateConversation({ targetUserId: customerId });
            navigate(`/company/messages/${conversation.conversationId}`);
        } catch (e) {
            alert(e.response?.data?.message || "쪽지방을 열지 못했습니다.");
        }
    };

    const list = Array.isArray(reservations) ? reservations : [];

    const todayString = () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const onlyNumber = (value) => {
        return String(value ?? "").replace(/[^0-9]/g, "");
    };

    const formatCost = (value) => {
        const numberText = onlyNumber(value);
        if (!numberText) return "";
        return Number(numberText).toLocaleString();
    };

    const canViewCustomerEmail = (reservation) => {
        return reservation?.status === "ACCEPTED" || reservation?.status === "DONE";
    };

    const openMailToCustomer = (reservation) => {
        const email = reservation?.customerEmail;

        if (!email) {
            alert("고객 이메일 없습니다.");
            return;
        }

        const customerName = reservation.customerName || "-";
        const phoneNumber = reservation.phoneNumber || "-";
        const address = reservation.address || "-";
        const visitDate = formatVisitDate(reservation.visitDate);
        const visitTime = formatVisitTime(reservation.visitTime);
        const issueSummary = reservation.issueSummary || "-";
        const requestNote = reservation.requestNote || "없음";

        const subject = encodeURIComponent("DDuckTTack 주거 하자 수리 예약 안내");

        const body = encodeURIComponent(`안녕하세요, ${customerName} 고객님.
DDuckTTack을 통해 예약하신 주거 하자 수리 건과 관련하여 안내드립니다.

고객님께서 신청하신 수리 예약 요청이 업체에 정상 접수되었습니다.
아래 예약 정보를 확인해 주세요.

[예약 정보]
- 예약자명: ${customerName}
- 연락처: ${phoneNumber}
- 방문 주소: ${address}
- 방문 예정일: ${visitDate}
- 방문 예정 시간: ${visitTime}
- 진단된 하자 내용: ${issueSummary}
- 요청사항: ${requestNote}

방문 당일 담당자가 현장에서 하자 상태를 직접 확인한 후,
수리 가능 여부와 필요한 작업 내용을 안내드릴 예정입니다.

AI 진단 결과는 참고 자료로 활용되며,
최종 수리 범위와 비용은 현장 확인 후 달라질 수 있습니다.

원활한 점검을 위해 하자 발생 위치 주변의 물건은 미리 정리해 주시기 바랍니다.
누수, 곰팡이, 균열 등 추가로 확인된 부분이 있다면 관련 사진이나 기록을 준비해 주시면 보다 정확한 확인에 도움이 됩니다.

예약 변경 또는 취소가 필요한 경우에는 방문 예정 시간 전까지 업체에 문의해 주세요.
현장 상황이나 이전 작업 지연으로 인해 방문 시간이 일부 변경될 수 있으며,
변경 사항이 발생할 경우 별도로 안내드리겠습니다.

감사합니다.
DDuckTTack 제휴업체 드림
`);

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;

        const opened = window.open(gmailUrl, "_blank", "noopener,noreferrer");

        if (!opened) {
            alert("팝업이 차단되었습니다. 브라우저에서 팝업 허용 후 다시 시도해주세요.");
        }
    };

    const refreshDetail = async (id, fallback = {}) => {
        try {
            const detailRes = await axios.get(`/api/company/reservations/${id}`);
            const detailData = extractData(detailRes.data);

            setDetail({
                ...detailData,
                ...fallback
            });
        } catch (err) {
            console.error("예약 상세 재조회 실패:", err);

            setDetail((prev) =>
                prev && prev.id === id
                    ? {
                        ...prev,
                        ...fallback
                    }
                    : prev
            );
        }
    };

    const refreshCalendarSafe = () => {
        if (typeof refreshCalendar === "function") {
            refreshCalendar();
        }
    };

    const updateLocalReservation = (id, patch) => {
        setReservations((prev) =>
            Array.isArray(prev)
                ? prev.map((r) =>
                    r.id === id
                        ? {
                            ...r,
                            ...patch
                        }
                        : r
                )
                : []
        );

        setDetail((prev) =>
            prev && prev.id === id
                ? {
                    ...prev,
                    ...patch
                }
                : prev
        );
    };

    const clickReservation = async (r) => {
        setSelectedId(r.id);

        try {
            const res = await axios.get(`/api/company/reservations/${r.id}`);
            const data = extractData(res.data);
            setDetail(data);
        } catch (err) {
            console.error("상세 조회 실패:", err);

            if (err.response) {
                console.log("서버 응답:", err.response.data);
            }

            alert("상세 조회 실패");
        }
    };

    const acceptReservation = async (id) => {
        if (loadingId) return;
        if (!window.confirm("이 예약을 수락할까요?")) return;

        setLoadingId(id);

        try {
            await axios.post(`/api/company/reservations/${id}/accept`);

            updateLocalReservation(id, {
                status: "ACCEPTED",
                rejectReason: null
            });

            await refreshDetail(id, {
                status: "ACCEPTED",
                rejectReason: null
            });

            refreshCalendarSafe();

            alert("예약을 수락했습니다. 고객 이메일을 확인할 수 있습니다.");
        } catch (err) {
            console.error("예약 수락 실패:", err);

            if (err.response) {
                console.log("서버 응답:", err.response.data);
                alert(err.response.data?.message || "예약 수락 실패");
            } else {
                alert("서버 연결 실패");
            }
        } finally {
            setLoadingId(null);
        }
    };

    const rejectReservation = async (id) => {
        if (loadingId) return;

        const reason = window.prompt("거절 사유를 입력하세요.");

        if (reason === null) return;

        if (!reason.trim()) {
            alert("거절 사유를 입력해야 합니다.");
            return;
        }

        setLoadingId(id);

        try {
            await axios.post(`/api/company/reservations/${id}/reject`, {
                reason: reason.trim()
            });

            updateLocalReservation(id, {
                status: "REJECTED",
                rejectReason: reason.trim()
            });

            await refreshDetail(id, {
                status: "REJECTED",
                rejectReason: reason.trim()
            });

            refreshCalendarSafe();

            alert("예약이 거절되었습니다.");
        } catch (err) {
            console.error("예약 거절 실패:", err);

            if (err.response) {
                console.log("서버 응답:", err.response.data);
                alert(err.response.data?.message || "예약 거절 실패");
            } else {
                alert("서버 연결 실패");
            }
        } finally {
            setLoadingId(null);
        }
    };

    const openCompleteModal = (reservation) => {
        if (loadingId) return;

        setCompleteForm({
            reservationId: reservation.id,
            repairCompletedDate: reservation.repairCompletedDate || todayString(),
            totalCost: reservation.repairTotalCost ? String(reservation.repairTotalCost) : "",
            repairSummary: reservation.repairSummary || ""
        });
    };

    const closeCompleteModal = () => {
        if (loadingId) return;
        setCompleteForm(null);
    };

    const completeReservation = async () => {
        if (loadingId || !completeForm) return;

        const reservationId = completeForm.reservationId;
        const repairCompletedDate = String(completeForm.repairCompletedDate || "").trim();
        const totalCostText = onlyNumber(completeForm.totalCost);
        const repairSummary = String(completeForm.repairSummary || "").trim();

        if (!repairCompletedDate) {
            alert("수리 완료일을 입력하세요.");
            return;
        }

        if (!totalCostText) {
            alert("총비용을 숫자로 입력하세요.");
            return;
        }

        if (!repairSummary) {
            alert("실제 작업 요약을 입력하세요.");
            return;
        }

        setLoadingId(reservationId);

        try {
            const payload = {
                repairCompletedDate,
                totalCost: Number(totalCostText),
                repairSummary
            };

            await axios.post(`/api/company/reservations/${reservationId}/complete`, payload);

            const patch = {
                status: "DONE",
                rejectReason: null,
                repairCompletedDate: payload.repairCompletedDate,
                repairTotalCost: payload.totalCost,
                repairSummary: payload.repairSummary
            };

            updateLocalReservation(reservationId, patch);
            await refreshDetail(reservationId, patch);
            refreshCalendarSafe();
            setCompleteForm(null);

            alert("수리 완료 정보가 저장되었습니다.");
        } catch (err) {
            console.error("완료 처리 실패:", err);

            if (err.response) {
                console.log("서버 응답:", err.response.data);
                alert(err.response.data?.message || "완료 처리 실패");
            } else {
                alert("서버 연결 실패");
            }
        } finally {
            setLoadingId(null);
        }
    };

    const pendingReservation = async (id) => {
        if (loadingId) return;
        if (!window.confirm("이 예약을 대기 상태로 되돌릴까요?")) return;

        setLoadingId(id);

        try {
            await axios.post(`/api/company/reservations/${id}/status`, null, {
                params: {status: "PENDING"}
            });

            updateLocalReservation(id, {
                status: "PENDING",
                rejectReason: null
            });

            await refreshDetail(id, {
                status: "PENDING",
                rejectReason: null
            });

            refreshCalendarSafe();

            alert("예약이 대기 상태로 변경되었습니다.");
        } catch (err) {
            console.error("대기 상태 변경 실패:", err);

            if (err.response) {
                console.log("서버 응답:", err.response.data);
                alert(err.response.data?.message || "대기 상태 변경 실패");
            } else {
                alert("서버 연결 실패");
            }
        } finally {
            setLoadingId(null);
        }
    };

    const getStatusColor = (status) => {
        const statusColors = {
            ACCEPTED: "#10B981",
            REJECTED: "#EF4444",
            PENDING: "#0066FF",
            NOSHOW: "#7C3AED",
            CANCELLED: "#64748B",
            DONE: "#059669"
        };

        return statusColors[status] || "#64748B";
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
        container: {
            display: "flex",
            flexDirection: "column",
            gap: "10px"
        },
        header: {
            fontSize: "18px",
            fontWeight: "bold",
            color: "#1E293B",
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
        },
        emptyBox: {
            textAlign: "center",
            padding: "40px 0",
            color: "#94A3B8",
            fontSize: "14px"
        },
        card: (isSelected, status) => ({
            padding: "15px",
            backgroundColor: isSelected ? "#F0F7FF" : "white",
            borderRadius: "12px",
            border: isSelected ? "1.5px solid #0066FF" : "1px solid #E2E8F0",
            cursor: "pointer",
            transition: "all 0.2s",
            position: "relative",
            paddingLeft: "20px",
            boxShadow: isSelected ? "0 4px 12px rgba(0, 102, 255, 0.1)" : "none"
        }),
        statusBar: (status) => ({
            position: "absolute",
            left: 0,
            top: "15%",
            height: "70%",
            width: "4px",
            borderRadius: "0 4px 4px 0",
            backgroundColor: getStatusColor(status)
        }),
        cardTopRow: {
            display: "flex",
            alignItems: "center",
            gap: "12px"
        },
        cardTextArea: {
            flex: 1,
            minWidth: 0
        },
        thumbnailBox: {
            width: "58px",
            height: "58px",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #E2E8F0",
            backgroundColor: "#F8FAFC",
            flexShrink: 0
        },
        thumbnailImage: {
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block"
        },
        customerName: {
            fontSize: "16px",
            fontWeight: "bold",
            color: "#1E293B",
            marginBottom: "4px",
            display: "block"
        },
        infoText: {
            fontSize: "13px",
            color: "#64748B"
        },
        detailBox: {
            marginTop: "20px",
            padding: "18px",
            borderRadius: "14px",
            border: "1px solid #E2E8F0",
            backgroundColor: "#F8FAFC"
        },
        detailTitle: {
            fontSize: "15px",
            fontWeight: "800",
            color: "#334155",
            marginBottom: "16px"
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
            fontWeight: "700",
            marginBottom: "14px",
            lineHeight: "22px"
        },
        emailBox: {
            padding: "12px",
            borderRadius: "10px",
            backgroundColor: "#EFF6FF",
            border: "1px solid #BFDBFE",
            marginBottom: "14px"
        },
        emailText: {
            fontSize: "14px",
            color: "#1E40AF",
            fontWeight: "800",
            marginBottom: "8px",
            wordBreak: "break-all"
        },
        mailBtn: {
            width: "100%",
            padding: "10px",
            borderRadius: "9px",
            border: "none",
            backgroundColor: "#2563EB",
            color: "white",
            fontWeight: "800",
            cursor: "pointer"
        },
        lockedEmailBox: {
            padding: "12px",
            borderRadius: "10px",
            backgroundColor: "#F8FAFC",
            border: "1px dashed #CBD5E1",
            color: "#64748B",
            fontSize: "13px",
            fontWeight: "700",
            marginBottom: "14px"
        },
        diagnosisImageBox: {
            marginBottom: "14px",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid #E2E8F0",
            backgroundColor: "#FFFFFF"
        },
        diagnosisImage: {
            width: "100%",
            maxHeight: "280px",
            objectFit: "cover",
            display: "block",
            backgroundColor: "#F1F5F9"
        },
        imageEmptyBox: {
            padding: "18px",
            borderRadius: "14px",
            backgroundColor: "#F8FAFC",
            border: "1px dashed #CBD5E1",
            color: "#94A3B8",
            fontSize: "13px",
            fontWeight: "700",
            marginBottom: "14px",
            textAlign: "center"
        },
        repairInfoBox: {
            padding: "12px",
            borderRadius: "10px",
            backgroundColor: "#ECFDF5",
            border: "1px solid #BBF7D0",
            color: "#065F46",
            fontSize: "13px",
            fontWeight: "700",
            lineHeight: "20px",
            marginBottom: "14px"
        },
        statusBox: (status) => ({
            padding: "12px",
            borderRadius: "10px",
            textAlign: "center",
            fontSize: "14px",
            fontWeight: "800",
            backgroundColor: "#FFFFFF",
            color: getStatusColor(status),
            border: `1px solid ${getStatusColor(status)}`,
            marginTop: "16px",
            marginBottom: "16px"
        }),
        rejectReasonBox: {
            padding: "12px",
            borderRadius: "10px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontSize: "14px",
            fontWeight: "700",
            lineHeight: "20px",
            marginBottom: "14px"
        },
        visitTimeCard: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "14px 16px",
            borderRadius: "14px",
            backgroundColor: "#EFF6FF",
            border: "1px solid #BFDBFE",
            marginBottom: "14px",
            flexWrap: "wrap"
        },
        visitDateText: {
            fontSize: "15px",
            color: "#1E293B",
            fontWeight: "900"
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
        actions: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px"
        },
        singleAction: {
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "10px"
        },
        doneActions: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px"
        },
        btn: (type, disabled) => {
            const base = {
                padding: "12px",
                borderRadius: "10px",
                fontWeight: "800",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1
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

            if (type === "pending") {
                return {
                    ...base,
                    border: "none",
                    backgroundColor: "#E2E8F0",
                    color: "#475569"
                };
            }

            if (type === "noshow") {
                return {
                    ...base,
                    border: "1px solid #DDD6FE",
                    backgroundColor: "#F5F3FF",
                    color: "#6D28D9"
                };
            }

            return {
                ...base,
                border: "none",
                backgroundColor: "#E2E8F0",
                color: "#475569"
            };
        },
        modalOverlay: {
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.62)",
            zIndex: 2147483647,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px"
        },
        modalBox: {
            width: "min(560px, calc(100vw - 48px))",
            maxHeight: "calc(100vh - 48px)",
            overflowY: "auto",
            backgroundColor: "#FFFFFF",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 32px 90px rgba(15, 23, 42, 0.38)",
            boxSizing: "border-box",
            position: "relative",
            zIndex: 2147483647
        },
        modalTitle: {
            margin: "0 0 8px 0",
            fontSize: "22px",
            fontWeight: "900",
            color: "#0F172A"
        },
        modalDesc: {
            margin: "0 0 18px 0",
            fontSize: "14px",
            fontWeight: "700",
            color: "#64748B",
            lineHeight: "22px"
        },
        modalForm: {
            display: "flex",
            flexDirection: "column",
            gap: "12px"
        },
        modalInput: {
            width: "100%",
            minHeight: "46px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            padding: "0 14px",
            fontSize: "14px",
            fontWeight: "700",
            color: "#0F172A",
            boxSizing: "border-box",
            outline: "none",
            backgroundColor: "#FFFFFF"
        },
        modalTextArea: {
            width: "100%",
            minHeight: "120px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            padding: "12px 14px",
            fontSize: "14px",
            fontWeight: "700",
            color: "#0F172A",
            lineHeight: "21px",
            boxSizing: "border-box",
            outline: "none",
            resize: "vertical",
            backgroundColor: "#FFFFFF"
        },
        modalActions: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginTop: "18px"
        },
        modalCancelBtn: {
            height: "48px",
            borderRadius: "12px",
            border: "1px solid #CBD5E1",
            backgroundColor: "#FFFFFF",
            color: "#475569",
            fontWeight: "900",
            cursor: "pointer"
        },
        modalSaveBtn: {
            height: "48px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "#16A34A",
            color: "#FFFFFF",
            fontWeight: "900",
            cursor: "pointer"
        }
    };

    return (
        <div style={styles.container}>
            <h3 style={styles.header}>
                <span style={{color: "#0066FF"}}>●</span> 예약 리스트
            </h3>

            {list.length === 0 ? (
                <div style={styles.emptyBox}>
                    <div style={{fontSize: "30px", marginBottom: "10px"}}>📭</div>
                    선택한 날짜에 예약이 없습니다.
                </div>
            ) : (
                list.map((r) => (
                    <div
                        key={r.id}
                        onClick={() => clickReservation(r)}
                        style={styles.card(selectedId === r.id, r.status)}
                    >
                        <div style={styles.statusBar(r.status)}/>

                        <div style={styles.cardTopRow}>
                            {r.imageUrl && (
                                <div style={styles.thumbnailBox}>
                                    <img
                                        src={toImageSrc(r.imageUrl)}
                                        alt="진단 사진"
                                        style={styles.thumbnailImage}
                                    />
                                </div>
                            )}

                            <div style={styles.cardTextArea}>
                                <span style={styles.customerName}>
                                    {r.customerName || "-"}
                                </span>

                                <div style={styles.infoText}>
                                    {formatVisitTime(r.visitTime)} ·{" "}
                                    <span style={{fontWeight: "600"}}>
                                        {getStatusText(r.status)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}

            {detail && (
                <div style={styles.detailBox}>
                    <div style={styles.detailTitle}>📋 예약 상세 정보</div>

                    <div style={styles.label}>고객</div>
                    <div style={styles.value}>
                        {detail.customerName || "-"}
                        {detail.phoneNumber ? ` (${detail.phoneNumber})` : ""}
                    </div>

                    <button
                        type="button"
                        style={{
                            ...styles.mailBtn,
                            marginBottom: "12px"
                        }}
                        onClick={() => openMessageThread(detail.customerId)}
                    >
                        ✉️ 쪽지 보내기
                    </button>

                    <div style={styles.label}>고객 이메일</div>
                    {canViewCustomerEmail(detail) && detail.customerEmail ? (
                        <div style={styles.emailBox}>
                            <div style={styles.emailText}>
                                {detail.customerEmail}
                            </div>

                            <button
                                type="button"
                                style={styles.mailBtn}
                                onClick={() => openMailToCustomer(detail)}
                            >
                                고객에게 메일 보내기
                            </button>
                        </div>
                    ) : (
                        <div style={styles.lockedEmailBox}>
                            예약 수락 후 고객 이메일을 확인할 수 있습니다.
                        </div>
                    )}

                    <div style={styles.label}>주소</div>
                    <div style={styles.value}>
                        {detail.address || "-"}
                    </div>

                    <div style={styles.label}>문제</div>
                    <div style={styles.value}>
                        {detail.issueSummary || "-"}
                    </div>

                    <div style={styles.label}>요청사항</div>
                    <div style={styles.value}>
                        {detail.requestNote || "-"}
                    </div>

                    <div style={styles.label}>진단 사진</div>

                    {detail.imageUrl ? (
                        <div style={styles.diagnosisImageBox}>
                            <img
                                src={toImageSrc(detail.imageUrl)}
                                alt="사용자 업로드 진단 사진"
                                style={styles.diagnosisImage}
                            />
                        </div>
                    ) : (
                        <div style={styles.imageEmptyBox}>
                            등록된 진단 사진이 없습니다.
                        </div>
                    )}

                    <div style={styles.label}>방문 시간</div>
                    <div style={styles.visitTimeCard}>
                        <div>
                            <div style={styles.visitDateText}>
                                {formatVisitDate(detail.visitDate)}
                            </div>
                            <div style={styles.visitTimeSubText}>
                                방문 예정 시간
                            </div>
                        </div>

                        <div style={styles.visitTimeBadge}>
                            {formatVisitTime(detail.visitTime)}
                        </div>
                    </div>

                    {detail.status === "DONE" && (
                        <>
                            <div style={styles.label}>수리 완료 정보</div>
                            <div style={styles.repairInfoBox}>
                                <div>완료일: {detail.repairCompletedDate || "-"}</div>
                                <div>
                                    총비용:{" "}
                                    {detail.repairTotalCost
                                        ? Number(detail.repairTotalCost).toLocaleString() + "원"
                                        : "-"}
                                </div>
                                <div>작업요약: {detail.repairSummary || "-"}</div>
                            </div>
                        </>
                    )}

                    {detail.status === "REJECTED" && (
                        <>
                            <div style={styles.label}>거절 사유</div>
                            <div style={styles.rejectReasonBox}>
                                {detail.rejectReason || "거절 사유가 저장되지 않았습니다."}
                            </div>
                        </>
                    )}

                    <div style={styles.statusBox(detail.status)}>
                        현재 상태: {getStatusText(detail.status)}
                    </div>

                    {detail.status === "PENDING" && (
                        <div style={styles.actions}>
                            <button
                                type="button"
                                disabled={loadingId === detail.id}
                                style={styles.btn("accept", loadingId === detail.id)}
                                onClick={() => acceptReservation(detail.id)}
                            >
                                수락
                            </button>

                            <button
                                type="button"
                                disabled={loadingId === detail.id}
                                style={styles.btn("reject", loadingId === detail.id)}
                                onClick={() => rejectReservation(detail.id)}
                            >
                                거절
                            </button>
                        </div>
                    )}

                    {detail.status === "ACCEPTED" && (
                        <div style={styles.doneActions}>
                            <button
                                type="button"
                                disabled={loadingId === detail.id}
                                style={styles.btn("done", loadingId === detail.id)}
                                onClick={() => openCompleteModal(detail)}
                            >
                                수리 완료
                            </button>

                            <button
                                type="button"
                                disabled={loadingId === detail.id}
                                style={styles.btn("pending", loadingId === detail.id)}
                                onClick={() => pendingReservation(detail.id)}
                            >
                                대기
                            </button>
                        </div>
                    )}

                    {detail.status === "DONE" && (
                        <div style={styles.doneActions}>
                            <button
                                type="button"
                                disabled={loadingId === detail.id}
                                style={styles.btn("done", loadingId === detail.id)}
                                onClick={() => openCompleteModal(detail)}
                            >
                                수리 정보 수정
                            </button>

                            <button
                                type="button"
                                disabled={loadingId === detail.id}
                                style={styles.btn("pending", loadingId === detail.id)}
                                onClick={() => pendingReservation(detail.id)}
                            >
                                대기
                            </button>
                        </div>
                    )}

                    {detail.status !== "PENDING" &&
                        detail.status !== "ACCEPTED" &&
                        detail.status !== "DONE" && (
                            <div style={styles.singleAction}>
                                <button
                                    type="button"
                                    disabled={loadingId === detail.id}
                                    style={styles.btn("pending", loadingId === detail.id)}
                                    onClick={() => pendingReservation(detail.id)}
                                >
                                    대기
                                </button>
                            </div>
                        )}
                </div>
            )}

            {completeForm
                ? createPortal(
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalBox}>
                            <h2 style={styles.modalTitle}>수리 완료 정보 입력</h2>
                            <p style={styles.modalDesc}>
                                입력한 수리 완료일, 총비용, 실제 작업 요약은 사용자 리포트 PDF에 자동 반영됩니다.
                            </p>

                            <div style={styles.modalForm}>
                                <div>
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

                                <div>
                                    <div style={styles.label}>총비용</div>
                                    <input
                                        type="text"
                                        value={formatCost(completeForm.totalCost)}
                                        onChange={(e) =>
                                            setCompleteForm((prev) => ({
                                                ...prev,
                                                totalCost: onlyNumber(e.target.value)
                                            }))
                                        }
                                        placeholder="예: 120000"
                                        style={styles.modalInput}
                                    />
                                </div>

                                <div>
                                    <div style={styles.label}>실제 작업 요약</div>
                                    <textarea
                                        value={completeForm.repairSummary}
                                        onChange={(e) =>
                                            setCompleteForm((prev) => ({
                                                ...prev,
                                                repairSummary: e.target.value
                                            }))
                                        }
                                        placeholder="예: 곰팡이 제거, 방습 처리 및 실리콘 마감 작업 완료"
                                        style={styles.modalTextArea}
                                    />
                                </div>
                            </div>

                            <div style={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={closeCompleteModal}
                                    style={styles.modalCancelBtn}
                                >
                                    취소
                                </button>

                                <button
                                    type="button"
                                    disabled={loadingId === completeForm.reservationId}
                                    onClick={completeReservation}
                                    style={{
                                        ...styles.modalSaveBtn,
                                        opacity: loadingId === completeForm.reservationId ? 0.6 : 1,
                                        cursor:
                                            loadingId === completeForm.reservationId
                                                ? "not-allowed"
                                                : "pointer"
                                    }}
                                >
                                    {loadingId === completeForm.reservationId
                                        ? "저장 중..."
                                        : "수리 완료 저장"}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
                : null}
        </div>
    );
}