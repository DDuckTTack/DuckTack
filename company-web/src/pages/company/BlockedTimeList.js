import { useEffect, useState } from "react";
import axios from "../../api/axios";

// 캘린더 화면이 선택 날짜의 차단 시간을 이미 불러와 blockedTimes 로 넘긴다.
// (예전에는 date 만 받아 직접 조회했는데, 넘겨준 목록을 무시해 항상 "없음"으로 보였다)
export default function BlockedTimeList({ blockedTimes: blockedTimesProp, date }) {
    const [fetched, setFetched] = useState([]);

    useEffect(() => {
        if (blockedTimesProp || !date) return;

        axios.get("/api/company/unavailable-times")
            .then(res => {
                const list = res.data?.data ?? res.data;
                setFetched((Array.isArray(list) ? list : []).filter(t => String(t.date) === String(date)));
            })
            .catch(() => alert("차단 시간 조회 실패"));
    }, [blockedTimesProp, date]);

    const blockedTimes = blockedTimesProp ?? fetched;

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