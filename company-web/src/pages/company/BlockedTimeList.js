import { useEffect, useState } from "react";
import axios from "../../api/axios";

export default function BlockedTimeList({ date }) {
    const [blockedTimes, setBlockedTimes] = useState([]);

    useEffect(() => {
        if (!date) return;

        axios.get(`/api/company/unavailable/times?date=${date}`)
            .then(res => setBlockedTimes(res.data))
            .catch(() => alert("차단 시간 조회 실패"));
    }, [date]);

    // 스타일 정의
    const styles = {
        container: {
            marginTop: "25px",
            padding: "20px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #E5F0FF"
        },
        title: {
            fontSize: "16px",
            fontWeight: "bold",
            color: "#1E293B",
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
        },
        grid: {
            display: "flex",
            flexWrap: "wrap",
            gap: "10px"
        },
        timeTag: {
            padding: "8px 16px",
            backgroundColor: "#F0F7FF",
            color: "#0066FF",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "600",
            border: "1px solid #D1E4FF",
            display: "flex",
            alignItems: "center"
        },
        emptyMsg: {
            color: "#94A3B8",
            fontSize: "14px",
            textAlign: "center",
            padding: "20px 0"
        }
    };

    return (
        <div style={styles.container}>
            <h3 style={styles.title}>
                <span style={{ color: "#0066FF" }}>🔒</span> 차단된 시간 목록
            </h3>

            {blockedTimes.length === 0 ? (
                <p style={styles.emptyMsg}>해당 날짜에 차단된 시간이 없습니다.</p>
            ) : (
                <div style={styles.grid}>
                    {blockedTimes.map(t => (
                        <div key={t.id} style={styles.timeTag}>
                            <span style={{ marginRight: "5px", fontSize: "12px" }}>⏰</span>
                            {t.time}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}