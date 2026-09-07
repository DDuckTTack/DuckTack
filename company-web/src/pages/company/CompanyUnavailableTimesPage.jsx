import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";

function CompanyUnavailableTimesPage() {

    const navigate = useNavigate();

    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [list, setList] = useState([]);

    const formatDate = (dateString) => {

        if (!dateString) return "";

        const date = new Date(dateString);

        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    };
    const load = async () => {

        try {

            const res = await axios.get("/api/company/unavailable-times");
            setList(res.data);

        } catch (e) {

            alert("조회 실패");

        }
    };

    const add = async () => {

        if (!date || !time) {

            alert("날짜/시간 입력");
            return;

        }

        try {

            await axios.post("/api/company/unavailable-times", {
                date,
                time
            });

            alert("차단 시간이 등록되었습니다.");

            setDate("");
            setTime("");

            load();

        } catch (e) {


            alert(
                e.response?.data?.message || "등록 실패"
            );

        }
    };

    const remove = async (id) => {

        try {

            await axios.delete(`/api/company/unavailable-times/${id}`);

            alert("삭제 완료");

            load();

        } catch (e) {

            alert("삭제 실패");

        }
    };

    useEffect(() => {

        load();

    }, []);

    const styles = {

        container: {
            padding: "30px",
            backgroundColor: "#F8FAFC",
            minHeight: "100vh"
        },

        card: {
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "16px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
            maxWidth: "700px",
            margin: "0 auto"
        },

        header: {
            display: "flex",
            alignItems: "center",
            marginBottom: "25px"
        },

        backBtn: {
            backgroundColor: "transparent",
            border: "none",
            color: "#64748B",
            cursor: "pointer",
            fontSize: "18px",
            marginRight: "10px"
        },

        title: {
            color: "#1E293B",
            fontSize: "20px",
            fontWeight: "bold",
            margin: 0
        },

        inputSection: {
            display: "flex",
            gap: "10px",
            marginBottom: "30px",
            padding: "20px",
            backgroundColor: "#F1F5F9",
            borderRadius: "12px"
        },

        input: {
            flex: 1,
            padding: "10px",
            border: "1px solid #CBD5E1",
            borderRadius: "8px",
            outline: "none"
        },

        addBtn: {
            padding: "10px 20px",
            backgroundColor: "#0066FF",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: "pointer"
        },

        listTitle: {
            fontSize: "16px",
            color: "#475569",
            marginBottom: "15px",
            fontWeight: "bold"
        },

        listItem: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 15px",
            backgroundColor: "white",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            marginBottom: "8px"
        },

        itemText: {
            color: "#334155",
            fontSize: "15px"
        },

        removeBtn: {
            padding: "5px 10px",
            backgroundColor: "#FEE2E2",
            color: "#DC2626",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            cursor: "pointer",
            fontWeight: "bold"
        }
    };

    return (

        <div style={styles.container}>

            <div style={styles.card}>

                <div style={styles.header}>

                    <button
                        onClick={() => navigate("/company")}
                        style={styles.backBtn}
                    >
                        ←
                    </button>

                    <h2 style={styles.title}>
                        시간 차단 관리
                    </h2>

                </div>

                <div style={styles.inputSection}>

                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={styles.input}
                    />

                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        style={styles.input}
                    />

                    <button
                        onClick={add}
                        style={styles.addBtn}
                    >
                        등록
                    </button>

                </div>

                <h3 style={styles.listTitle}>
                    차단된 시간 목록
                </h3>

                {list.length === 0 ? (

                    <p
                        style={{
                            textAlign: "center",
                            color: "#94A3B8",
                            fontSize: "14px"
                        }}
                    >
                        차단된 시간이 없습니다.
                    </p>

                ) : (

                    <div>

                        {list.map(item => (

                            <div
                                key={item.id}
                                style={styles.listItem}
                            >

                                <span style={styles.itemText}>

                                    📅{formatDate(item.date || item.blockedDate)}
                                    &nbsp; | &nbsp;

                                    ⏰ {item.time || item.blockedTime}

                                </span>

                                <button
                                    onClick={() => remove(item.id)}
                                    style={styles.removeBtn}
                                >
                                    삭제
                                </button>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>
    );
}

export default CompanyUnavailableTimesPage;
