import { useEffect, useState } from "react";
import axios from "../../api/axios";


export default function TimeSelector({ date }) {

    const [blockedTimes, setBlockedTimes] = useState([]);
    const [reservedTimes, setReservedTimes] = useState([]);

    const times = [
        "09:00", "10:00", "11:00", "12:00",
        "13:00", "14:00", "15:00", "16:00"
    ];

    useEffect(() => {
        if (!date) return;

        // 차단 시간 조회
        axios.get(`/api/company/unavailable/times?date=${date}`)
            .then(res => {
                // 응답 데이터 구조에 따라 t.time 혹은 t 추출
                const blocked = res.data.map(t => typeof t === 'object' ? t.time : t);
                setBlockedTimes(blocked);
            });

        // 예약된 시간 조회
        axios.get(`/api/company/reservations?date=${date}`)
            .then(res => {
                const reserved = res.data.map(r => r.visitTime);
                setReservedTimes(reserved);
            });

    }, [date]);

    // 스타일 정의
    const styles = {
        container: { marginTop: "20px" },
        title: { fontSize: "16px", fontWeight: "bold", color: "#1E293B", marginBottom: "15px" },
        grid: {
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "10px"
        },
        timeButton: (isBlocked, isReserved) => {
            const isDisabled = isBlocked || isReserved;
            return {
                padding: "12px 5px",
                fontSize: "14px",
                fontWeight: "600",
                borderRadius: "8px",
                cursor: isDisabled ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                border: "1px solid",
                backgroundColor: isBlocked
                    ? "#F1F5F9" // 차단: 연한 그레이
                    : isReserved
                        ? "#FFF1F2" // 예약됨: 연한 레드
                        : "#E5F0FF", // 선택가능: 메인 블루 연하게
                color: isBlocked
                    ? "#94A3B8"
                    : isReserved
                        ? "#F43F5E"
                        : "#0066FF",
                borderColor: isBlocked
                    ? "#E2E8F0"
                    : isReserved
                        ? "#FECDD3"
                        : "#CCE0FF",
                opacity: isDisabled ? 0.7 : 1
            };
        },
        legend: {
            display: "flex",
            gap: "15px",
            marginTop: "20px",
            fontSize: "12px",
            color: "#64748B"
        },
        dot: (color) => ({
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: color,
            marginRight: "5px"
        })
    };

    return (
        <div style={styles.container}>
            <h4 style={styles.title}>🕘 방문 희망 시간 선택</h4>

            <div style={styles.grid}>
                {times.map(t => {
                    const isBlocked = blockedTimes.includes(t);
                    const isReserved = reservedTimes.includes(t);
                    const isDisabled = isBlocked || isReserved;

                    return (
                        <button
                            key={t}
                            disabled={isDisabled}
                    style={styles.timeButton(isBlocked, isReserved)}
                        >
                        {t}
                </button>
                );
                })}
            </div>

            {/* 안내 라벨 */}
            <div style={styles.legend}>
                <span><span style={styles.dot("#E5F0FF")} />선택가능</span>
                <span><span style={styles.dot("#FFF1F2")} />예약완료</span>
                <span><span style={styles.dot("#F1F5F9")} />업무차단</span>
            </div>
        </div>
    );
}