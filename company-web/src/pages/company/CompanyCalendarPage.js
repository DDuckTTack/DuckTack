import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "../../api/axios";

import ReservationList from "./ReservationList";
import TimeBlockModal from "./TimeBlockModal";
import BlockedTimeList from "./BlockedTimeList";

const calendarGlobalStyles = `
  .fc { font-family: 'Pretendard', sans-serif; border: none !important; }
  .fc-theme-standard td, .fc-theme-standard th { border: 1px solid #f1f5f9 !important; }
  
  .fc .fc-toolbar-title { font-size: 1.4rem !important; font-weight: 800; color: #1e293b; }
  .fc .fc-button { 
    background: #ffffff !important; 
    border: 1px solid #e2e8f0 !important; 
    color: #64748b !important; 
    font-weight: 600 !important;
    border-radius: 10px !important; 
    transition: all 0.2s ease !important;
  }
  .fc .fc-button:hover { 
    background: #f8fafc !important; 
    color: #0066ff !important; 
    border-color: #0066ff !important; 
  }
  .fc .fc-button-active { 
    background: #0066ff !important; 
    color: #fff !important; 
    border-color: #0066ff !important; 
  }

  .fc-daygrid-day-number { 
    font-size: 0.85rem; 
    font-weight: 600; 
    color: #475569; 
    padding: 10px !important; 
    text-decoration: none !important; 
  }

  .fc-day-today { 
    background-color: #f8fafc !important; 
  }

  .fc-event { 
    border-radius: 6px !important; 
    padding: 4px 8px !important; 
    margin: 2px 4px !important; 
    font-size: 0.78rem !important; 
    font-weight: 700 !important;
    border-left: 4px solid !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.04) !important;
    border-top: none !important;
    border-right: none !important;
    border-bottom: none !important;
    cursor: pointer;
    transition: transform 0.2s ease, filter 0.2s ease;
  }

  .fc-event:hover {
    filter: brightness(0.95);
    transform: translateY(-1px);
  }
`;

export default function CompanyCalendarPage() {
    const navigate = useNavigate();

    const [selectedDate, setSelectedDate] = useState(null);
    const [reservations, setReservations] = useState([]);
    const [events, setEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [mode, setMode] = useState("view");
    const [blockedMap, setBlockedMap] = useState({});
    const [blockedTimes, setBlockedTimes] = useState([]);

    const [currentMonth, setCurrentMonth] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
    });

    const extractList = (responseData) => {
        if (Array.isArray(responseData)) return responseData;
        if (Array.isArray(responseData?.data)) return responseData.data;
        if (Array.isArray(responseData?.data?.content)) return responseData.data.content;
        if (Array.isArray(responseData?.content)) return responseData.content;
        if (Array.isArray(responseData?.reservations)) return responseData.reservations;
        if (Array.isArray(responseData?.times)) return responseData.times;

        return [];
    };

    const normalizeDate = useCallback((value) => {
        if (!value) return "";

        if (Array.isArray(value)) {
            const [y, m, d] = value;
            return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }

        return String(value).slice(0, 10);
    }, []);

    const normalizeTime = (value) => {
        if (!value) return "";
        return String(value).slice(0, 5);
    };

    const getReservationDate = useCallback((item) => {
        return normalizeDate(
            item.date ??
            item.visitDate ??
            item.visit_date ??
            item.reservationDate
        );
    }, [normalizeDate]);

    const buildCalendarEventsFromCountRows = useCallback((list) => {
        return list.flatMap((d) => {
            const date = getReservationDate(d);
            const arr = [];

            if (!date) return arr;

            const pending = Number(d.pending ?? d.PENDING ?? 0);
            const accepted = Number(d.accepted ?? d.ACCEPTED ?? 0);
            const rejected = Number(d.rejected ?? d.REJECTED ?? 0);
            const done = Number(d.done ?? d.DONE ?? d.completed ?? d.COMPLETED ?? 0);

            if (pending > 0) {
                arr.push({
                    id: `${date}-pending`,
                    title: `⏳ 대기 ${pending}`,
                    date,
                    backgroundColor: "#E0EBFF",
                    textColor: "#0066FF",
                    borderColor: "#0066FF"
                });
            }

            if (accepted > 0) {
                arr.push({
                    id: `${date}-accepted`,
                    title: `✅ 수락 ${accepted}`,
                    date,
                    backgroundColor: "#DCFCE7",
                    textColor: "#15803D",
                    borderColor: "#15803D"
                });
            }

            if (rejected > 0) {
                arr.push({
                    id: `${date}-rejected`,
                    title: `🚫 거절 ${rejected}`,
                    date,
                    backgroundColor: "#FEE2E2",
                    textColor: "#B91C1C",
                    borderColor: "#B91C1C"
                });
            }

            if (done > 0) {
                arr.push({
                    id: `${date}-done`,
                    title: `🔧 완료 ${done}`,
                    date,
                    backgroundColor: "#DCFCE7",
                    textColor: "#166534",
                    borderColor: "#16A34A"
                });
            }

            return arr;
        });
    }, [getReservationDate]);

    const buildCalendarEventsFromReservationRows = useCallback((list) => {
        const grouped = {};

        list.forEach((r) => {
            const date = getReservationDate(r);
            const status = String(r.status || "").toUpperCase();

            if (!date) return;

            if (!grouped[date]) {
                grouped[date] = {
                    pending: 0,
                    accepted: 0,
                    rejected: 0,
                    done: 0
                };
            }

            if (status === "PENDING") grouped[date].pending += 1;
            if (status === "ACCEPTED") grouped[date].accepted += 1;
            if (status === "REJECTED") grouped[date].rejected += 1;
            if (status === "DONE") grouped[date].done += 1;
        });

        return buildCalendarEventsFromCountRows(
            Object.entries(grouped).map(([date, counts]) => ({
                date,
                ...counts
            }))
        );
    }, [buildCalendarEventsFromCountRows, getReservationDate]);

    const buildCalendarEvents = useCallback((list) => {
        if (!Array.isArray(list) || list.length === 0) {
            return [];
        }

        const first = list[0];

        const looksLikeReservationRows =
            first.status ||
            first.visitDate ||
            first.visit_date;

        if (looksLikeReservationRows) {
            return buildCalendarEventsFromReservationRows(list);
        }

        return buildCalendarEventsFromCountRows(list);
    }, [buildCalendarEventsFromCountRows, buildCalendarEventsFromReservationRows]);

    const fetchMonthData = useCallback(async () => {
        try {
            const res = await axios.get("/api/company/reservations/month", {
                params: {
                    year: currentMonth.year,
                    month: currentMonth.month
                }
            });

            const list = extractList(res.data);

            const mapped = buildCalendarEvents(list);

            setEvents(mapped);
        } catch (err) {

            if (err.response?.status === 401) {
                alert("로그인이 만료되었습니다. 다시 로그인하세요.");
                localStorage.clear();
                navigate("/");
                return;
            }

            setEvents([]);
        }
    }, [buildCalendarEvents, currentMonth.year, currentMonth.month, navigate]);

    const fetchReservationsByDate = useCallback(async (date) => {
        if (!date) return;

        try {
            const res = await axios.get("/api/company/reservations", {
                params: { date }
            });

            const list = extractList(res.data);

            setReservations(list);
        } catch (err) {

            if (err.response?.status === 401) {
                alert("로그인이 만료되었습니다. 다시 로그인하세요.");
                localStorage.clear();
                navigate("/");
                return;
            }

            setReservations([]);
            alert("예약 조회 실패");
        }
    }, [navigate]);

    const refreshReservationView = useCallback(async () => {
        await fetchMonthData();

        if (selectedDate && mode === "view") {
            await fetchReservationsByDate(selectedDate);
        }
    }, [fetchMonthData, fetchReservationsByDate, selectedDate, mode]);

    const fetchBlockedTimes = async (date) => {
        try {
            const res = await axios.get("/api/company/unavailable-times");
            const list = extractList(res.data);

            const filtered = list.filter(
                (item) => normalizeDate(item.date) === normalizeDate(date)
            );

            setBlockedTimes(filtered);

            return filtered;
        } catch (err) {

            if (err.response?.status === 401) {
                alert("로그인이 만료되었습니다. 다시 로그인하세요.");
                localStorage.clear();
                navigate("/");
                return [];
            }

            setBlockedTimes([]);
            alert("차단 시간 조회 실패");
            return [];
        }
    };

    const fetchBlockedDates = async () => {
        try {
            const res = await axios.get("/api/company/unavailable-times");
            const list = extractList(res.data);

            const map = {};

            list.forEach((item) => {
                const dateKey = normalizeDate(item.date);
                const timeValue = normalizeTime(item.time);

                if (!dateKey || !timeValue) return;

                if (!map[dateKey]) {
                    map[dateKey] = [];
                }

                if (!map[dateKey].includes(timeValue)) {
                    map[dateKey].push(timeValue);
                }
            });

            Object.keys(map).forEach((dateKey) => {
                map[dateKey].sort();
            });

            setBlockedMap(map);

            return map;
        } catch (err) {
            setBlockedMap({});
            return {};
        }
    };

    const refreshBlockedView = async (date = selectedDate) => {
        await fetchBlockedDates();

        if (date) {
            await fetchBlockedTimes(date);
        }
    };

    useEffect(() => {
        fetchMonthData();
    }, [fetchMonthData]);

    useEffect(() => {
        if (mode === "block") {
            refreshBlockedView(selectedDate);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    const handleDatesSet = (arg) => {
        const date = arg.view.currentStart;

        setCurrentMonth({
            year: date.getFullYear(),
            month: date.getMonth() + 1
        });
    };

    const handleDateClick = (info) => {
        const date = info.dateStr;

        setSelectedDate(date);

        if (mode === "view") {
            fetchReservationsByDate(date);
            return;
        }

        if (mode === "block") {
            refreshBlockedView(date);
            setShowModal(true);
        }
    };

    const FULL_DAY_TIMES = [
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

    const isFullDayBlocked = (times) => {
        const normalized = times.map((t) => normalizeTime(t));
        return FULL_DAY_TIMES.every((time) => normalized.includes(time));
    };

    const blockedEvents = Object.keys(blockedMap).map((dateKey) => {
        const times = blockedMap[dateKey] || [];
        const fullDay = isFullDayBlocked(times);

        return {
            id: `blocked-${dateKey}`,
            title: fullDay
                ? "🔒 휴무날"
                : `🔒 차단 ${times.length}개 ${times.join(", ")}`,
            date: dateKey,
            backgroundColor: "#FEE2E2",
            textColor: "#B91C1C",
            borderColor: "#EF4444",
            display: "block"
        };
    });

    const calendarEvents = mode === "view" ? events : blockedEvents;

    const styles = {
        mainContainer: {
            display: "flex",
            flexDirection: "column",
            padding: "40px 60px",
            backgroundColor: "#F8FAFC",
            minHeight: "100vh",
            fontFamily: "'Pretendard', sans-serif"
        },
        backBtn: {
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "white",
            border: "1px solid #e2e8f0",
            color: "#64748b",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "700",
            padding: "10px 18px",
            borderRadius: "12px",
            marginBottom: "24px",
            width: "fit-content",
            transition: "all 0.2s",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
        },
        headerSection: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "35px",
            backgroundColor: "white",
            padding: "25px 35px",
            borderRadius: "20px",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
        },
        title: {
            fontSize: "24px",
            fontWeight: "800",
            color: "#1e293b",
            margin: 0
        },
        subTitle: {
            color: "#94a3b8",
            fontSize: "14px",
            marginTop: "4px"
        },
        modeToggle: {
            display: "flex",
            backgroundColor: "#f1f5f9",
            padding: "6px",
            borderRadius: "14px"
        },
        toggleBtn: (active) => ({
            padding: "12px 24px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "800",
            fontSize: "14px",
            transition: "all 0.3s ease",
            backgroundColor: active ? "white" : "transparent",
            color: active ? "#0066ff" : "#94a3b8",
            boxShadow: active ? "0 4px 6px -1px rgba(0,0,0,0.1)" : "none",
            display: "flex",
            alignItems: "center",
            gap: "8px"
        }),
        layout: {
            display: "flex",
            gap: "30px",
            alignItems: "flex-start"
        },
        calendarCard: {
            flex: 2.3,
            backgroundColor: "white",
            padding: "35px",
            borderRadius: "24px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)"
        },
        sidePanel: {
            flex: 1,
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "24px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)",
            position: "sticky",
            top: "40px",
            minHeight: "500px"
        },
        dateBadge: {
            backgroundColor: "#F0F7FF",
            color: "#0066FF",
            padding: "8px 20px",
            borderRadius: "12px",
            fontSize: "15px",
            fontWeight: "800",
            marginBottom: "25px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
        },
        emptyPlaceholder: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "100px",
            color: "#cbd5e1",
            textAlign: "center"
        }
    };

    return (
        <div style={styles.mainContainer}>
            <style>{calendarGlobalStyles}</style>

            <button onClick={() => navigate(-1)} style={styles.backBtn}>
                <span>←</span> 대시보드
            </button>

            <div style={styles.headerSection}>
                <div>
                    <h2 style={styles.title}>스케줄 통합 관리</h2>
                    <p style={styles.subTitle}>
                        예약 상태와 차단된 시간을 관리하여 효율적으로 일정을 조절하세요.
                    </p>
                </div>

                <div style={styles.modeToggle}>
                    <button
                        type="button"
                        style={styles.toggleBtn(mode === "view")}
                        onClick={() => {
                            setMode("view");
                            setShowModal(false);

                            if (selectedDate) {
                                fetchReservationsByDate(selectedDate);
                            }

                            fetchMonthData();
                        }}
                    >
                        📅 예약 확인
                    </button>

                    <button
                        type="button"
                        style={styles.toggleBtn(mode === "block")}
                        onClick={() => {
                            setMode("block");
                            setReservations([]);
                            refreshBlockedView(selectedDate);
                        }}
                    >
                        🔒 시간 차단
                    </button>
                </div>
            </div>

            <div style={styles.layout}>
                <div style={styles.calendarCard}>
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        titleFormat={(arg) => `${arg.date.year}년 ${arg.date.month + 1}월`}
                        headerToolbar={{
                            left: "prev,next today",
                            center: "title",
                            right: ""
                        }}
                        dateClick={handleDateClick}
                        events={calendarEvents}
                        datesSet={handleDatesSet}
                        height="auto"
                        fixedWeekCount={false}
                    />
                </div>

                <div style={styles.sidePanel}>
                    {selectedDate ? (
                        <>
                            <div style={styles.dateBadge}>🗓️ {selectedDate}</div>

                            {mode === "view" ? (
                                <ReservationList
                                    reservations={reservations}
                                    setReservations={setReservations}
                                    refreshCalendar={refreshReservationView}
                                />
                            ) : (
                                <BlockedTimeList blockedTimes={blockedTimes} />
                            )}
                        </>
                    ) : (
                        <div style={styles.emptyPlaceholder}>
                            <div style={{ fontSize: "40px", marginBottom: "10px" }}>
                                🖱️
                            </div>
                            <p>
                                날짜를 선택하여
                                <br />
                                상세 내역을 확인하세요.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <TimeBlockModal
                    date={selectedDate}
                    onClose={async () => {
                        setShowModal(false);
                        await refreshBlockedView(selectedDate);
                    }}
                    refreshBlockedDates={() => refreshBlockedView(selectedDate)}
                    blockedTimes={blockedTimes}
                    setBlockedTimes={setBlockedTimes}
                />
            )}
        </div>
    );
}
