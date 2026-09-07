import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

const TIMES = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00"
];

function TimeBlockModal({
                            date,
                            onClose,
                            refreshBlockedDates,
                            blockedTimes,
                            setBlockedTimes
                        }) {
    const [loadingTime, setLoadingTime] = useState(null);
    const [fullDayLoading, setFullDayLoading] = useState(false);
    const [localBlockedTimes, setLocalBlockedTimes] = useState([]);

    const extractList = (responseData) => {
        if (Array.isArray(responseData)) return responseData;
        if (Array.isArray(responseData?.data)) return responseData.data;
        if (Array.isArray(responseData?.data?.content)) return responseData.data.content;
        if (Array.isArray(responseData?.content)) return responseData.content;
        return [];
    };

    const normalizeTime = (time) => {
        if (!time) return "";
        return String(time).slice(0, 5);
    };

    const normalizeDate = useCallback((value) => {
        if (!value) return "";

        if (Array.isArray(value)) {
            const [y, m, d] = value;
            return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }

        return String(value).slice(0, 10);
    }, []);

    const isSameDate = useCallback((a, b) => {
        return normalizeDate(a) === normalizeDate(b);
    }, [normalizeDate]);

    const fetchBlockedTimes = useCallback(async () => {
        try {
            const res = await axios.get("/api/company/unavailable-times");
            const list = extractList(res.data);

            const filtered = list.filter((item) => isSameDate(item.date, date));

            setLocalBlockedTimes(filtered);

            if (typeof setBlockedTimes === "function") {
                setBlockedTimes(filtered);
            }

            return filtered;
        } catch (err) {
            alert("차단 시간 조회 실패");
            return [];
        }
    }, [date, isSameDate, setBlockedTimes]);

    useEffect(() => {
        if (Array.isArray(blockedTimes)) {
            const filtered = blockedTimes.filter((item) => isSameDate(item.date, date));
            setLocalBlockedTimes(filtered);
        }

        fetchBlockedTimes();
    }, [blockedTimes, date, fetchBlockedTimes, isSameDate]);

    const findBlockedTime = (time, source = localBlockedTimes) => {
        return source.find(
            (item) =>
                isSameDate(item.date, date) &&
                normalizeTime(item.time) === normalizeTime(time)
        );
    };

    const isBlocked = (time) => {
        return Boolean(findBlockedTime(time));
    };

    const isFullDayBlocked = (source = localBlockedTimes) => {
        const blockedTimeSet = new Set(
            source
                .filter((item) => isSameDate(item.date, date))
                .map((item) => normalizeTime(item.time))
        );

        return TIMES.every((time) => blockedTimeSet.has(time));
    };

    const refreshAll = async () => {
        const latest = await fetchBlockedTimes();

        if (typeof refreshBlockedDates === "function") {
            await refreshBlockedDates();
        }

        return latest;
    };

    const toggleTime = async (time) => {
        if (loadingTime || fullDayLoading) return;

        setLoadingTime(time);

        try {
            const latestBlockedTimes = await fetchBlockedTimes();
            const blocked = findBlockedTime(time, latestBlockedTimes);

            if (blocked) {
                await axios.delete(`/api/company/unavailable-times/${blocked.id}`);

                const next = latestBlockedTimes.filter((item) => item.id !== blocked.id);

                setLocalBlockedTimes(next);

                if (typeof setBlockedTimes === "function") {
                    setBlockedTimes(next);
                }

                if (typeof refreshBlockedDates === "function") {
                    await refreshBlockedDates();
                }

                return;
            }

            await axios.post("/api/company/unavailable-times", {
                date,
                time
            });

            await refreshAll();
        } catch (err) {

            if (err.response) {
                alert(err.response.data?.message || "시간 차단/해제 실패");
            } else {
                alert("서버 연결 실패");
            }
        } finally {
            setLoadingTime(null);
        }
    };

    const blockFullDay = async () => {
        if (fullDayLoading) return;

        if (!window.confirm("해당 날짜를 하루 전체 휴무 처리하시겠습니까?")) {
            return;
        }

        setFullDayLoading(true);

        try {
            const latestBlockedTimes = await fetchBlockedTimes();

            for (const time of TIMES) {
                const alreadyBlocked = findBlockedTime(time, latestBlockedTimes);

                if (!alreadyBlocked) {
                    await axios.post("/api/company/unavailable-times", {
                        date,
                        time
                    });
                }
            }

            await refreshAll();
        } catch (err) {

            if (err.response) {
                alert(err.response.data?.message || "하루 전체 휴무 처리 실패");
            } else {
                alert("서버 연결 실패");
            }
        } finally {
            setFullDayLoading(false);
        }
    };

    const cancelFullDay = async () => {
        if (fullDayLoading) return;

        if (!window.confirm("해당 날짜의 휴무 처리를 취소하시겠습니까?")) {
            return;
        }

        setFullDayLoading(true);

        try {
            const latestBlockedTimes = await fetchBlockedTimes();

            const targetBlocks = latestBlockedTimes.filter((item) =>
                isSameDate(item.date, date)
            );

            for (const block of targetBlocks) {
                await axios.delete(`/api/company/unavailable-times/${block.id}`);
            }

            setLocalBlockedTimes([]);

            if (typeof setBlockedTimes === "function") {
                setBlockedTimes([]);
            }

            if (typeof refreshBlockedDates === "function") {
                await refreshBlockedDates();
            }
        } catch (err) {

            if (err.response) {
                alert(err.response.data?.message || "휴무 취소 실패");
            } else {
                alert("서버 연결 실패");
            }
        } finally {
            setFullDayLoading(false);
        }
    };

    const fullDayBlocked = isFullDayBlocked();

    const styles = {
        overlay: {
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
        },
        modal: {
            width: "720px",
            maxWidth: "90vw",
            backgroundColor: "white",
            borderRadius: "24px",
            padding: "42px",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.25)"
        },
        date: {
            textAlign: "center",
            color: "#EF4444",
            fontSize: "18px",
            fontWeight: "800",
            marginBottom: "26px"
        },
        title: {
            textAlign: "center",
            fontSize: "30px",
            color: "#0F172A",
            fontWeight: "900",
            marginBottom: "18px"
        },
        guide: {
            textAlign: "center",
            fontSize: "13px",
            color: "#64748B",
            marginBottom: "24px",
            lineHeight: "1.6"
        },
        grid: {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "18px",
            marginBottom: "28px"
        },
        timeButton: (blocked, loading) => ({
            padding: "18px",
            borderRadius: "14px",
            border: blocked ? "1px solid #EF4444" : "1px solid #E2E8F0",
            backgroundColor: blocked ? "#EF4444" : "#F8FAFC",
            color: blocked ? "white" : "#334155",
            fontSize: "18px",
            fontWeight: "800",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            transition: "all 0.2s"
        }),
        fullDayBtn: {
            width: "100%",
            padding: "18px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: fullDayLoading
                ? "#94A3B8"
                : fullDayBlocked
                    ? "#334155"
                    : "#EF4444",
            color: "white",
            fontSize: "18px",
            fontWeight: "900",
            cursor: fullDayLoading ? "not-allowed" : "pointer",
            marginBottom: "14px"
        },
        closeBtn: {
            width: "100%",
            padding: "18px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "#0066FF",
            color: "white",
            fontSize: "18px",
            fontWeight: "900",
            cursor: "pointer"
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.date}>{date}</div>

                <div style={styles.title}>업무 시간 차단 설정</div>

                <div style={styles.guide}>
                    회색 시간은 차단 가능, 빨간 시간은 이미 차단된 상태입니다.
                    <br />
                    빨간 시간을 다시 누르면 해당 시간만 해제됩니다.
                    전체 휴무 상태에서는 아래 버튼으로 한 번에 취소할 수 있습니다.
                </div>

                <div style={styles.grid}>
                    {TIMES.map((time) => {
                        const blocked = isBlocked(time);
                        const loading = loadingTime === time;

                        return (
                            <button
                                key={time}
                                type="button"
                                disabled={loading || fullDayLoading}
                                style={styles.timeButton(blocked, loading || fullDayLoading)}
                                onClick={() => toggleTime(time)}
                            >
                                {time}
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    disabled={fullDayLoading}
                    style={styles.fullDayBtn}
                    onClick={fullDayBlocked ? cancelFullDay : blockFullDay}
                >
                    {fullDayLoading
                        ? "처리 중..."
                        : fullDayBlocked
                            ? "휴무 취소"
                            : "하루 전체 휴무 처리"}
                </button>

                <button
                    type="button"
                    style={styles.closeBtn}
                    onClick={onClose}
                >
                    닫기
                </button>
            </div>
        </div>
    );
}

export default TimeBlockModal;
