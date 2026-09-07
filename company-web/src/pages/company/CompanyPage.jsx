import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import axios from "../../api/axios";
import {listConversations} from "../../api/messages";
import {subscribeRealtime} from "../../api/realtime";

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const asList = (value) => {
    const data = unwrap(value);
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.content) ? data.content : [];
};
const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const css = `
.partner-page{min-height:100vh;background:#f4f8ff;color:#0f172a;font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:36px 24px;box-sizing:border-box}.partner-shell{max-width:1120px;margin:auto}
.partner-header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:26px}.partner-eyebrow{margin:0 0 6px;color:#4f46e5;font-size:13px;font-weight:900;letter-spacing:.08em}.partner-title{margin:0;font-size:32px;letter-spacing:-.04em}.partner-subtitle{margin:8px 0 0;color:#64748b;font-size:14px}.partner-actions{display:flex;align-items:center;gap:10px}
.connection{display:flex;align-items:center;gap:7px;border:1px solid #dbeafe;background:#fff;padding:9px 12px;border-radius:999px;color:#475569;font-size:12px;font-weight:800}.dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px #dcfce7}.dot.off{background:#f59e0b;box-shadow:0 0 0 4px #fef3c7}.logout{border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:11px;padding:10px 14px;font-weight:800;cursor:pointer}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:22px}.stat{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:20px;box-shadow:0 10px 30px rgba(30,64,175,.05)}.stat-top{display:flex;justify-content:space-between;align-items:center;color:#64748b;font-size:13px;font-weight:800}.stat-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#eef2ff;font-size:19px}.stat-value{font-size:30px;font-weight:950;margin-top:14px}.unit{font-size:14px;color:#64748b;margin-left:4px}
.menus{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.menu{position:relative;text-align:left;border:1px solid #dbe3ef;background:#fff;border-radius:20px;padding:22px;min-height:154px;cursor:pointer;transition:.16s;box-shadow:0 8px 24px rgba(15,23,42,.04)}.menu:hover{transform:translateY(-3px);border-color:#a5b4fc;box-shadow:0 16px 32px rgba(79,70,229,.1)}.menu-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:#eef2ff;font-size:23px;margin-bottom:16px}.menu-title{display:flex;align-items:center;gap:8px;font-size:17px;font-weight:900}.menu-desc{display:block;margin-top:7px;color:#64748b;font-size:13px;line-height:1.55}.badge{display:inline-grid;place-items:center;min-width:21px;height:21px;padding:0 6px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px;font-weight:900;box-sizing:border-box}
.loading{height:3px;border-radius:99px;margin-bottom:18px;background:linear-gradient(90deg,#4f46e5,#60a5fa,#4f46e5);background-size:200%;animation:loading 1.2s linear infinite}@keyframes loading{to{background-position:-200%}}
@media(max-width:850px){.stats{grid-template-columns:repeat(2,1fr)}.menus{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.partner-page{padding:24px 16px}.partner-header{align-items:flex-start;flex-direction:column}.partner-title{font-size:27px}.partner-actions{width:100%;justify-content:space-between}.stats,.menus{grid-template-columns:1fr}.menu{min-height:130px}}
`;

export default function CompanyPage() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState({today: 0, pending: 0, newBids: 0, unread: 0});
    const [loading, setLoading] = useState(true);
    const [bidConnected, setBidConnected] = useState(false);
    const [messageConnected, setMessageConnected] = useState(false);
    const loadingRef = useRef(false);

    const load = useCallback(async () => {
        if (loadingRef.current || document.hidden || !navigator.onLine) return;
        loadingRef.current = true;
        try {
            const [reservationResult, bidResult, messageResult] = await Promise.allSettled([
                axios.get("/api/company/reservations", {params: {date: today()}}),
                axios.get("/api/company/bids"),
                listConversations({type: "USER", size: 50}),
            ]);
            const reservations = reservationResult.status === "fulfilled" ? asList(reservationResult.value) : [];
            const bids = bidResult.status === "fulfilled" ? asList(bidResult.value) : [];
            const conversations = messageResult.status === "fulfilled" ? asList(messageResult.value) : [];
            setSummary({
                today: reservations.length,
                pending: reservations.filter((item) => String(item.status).toUpperCase() === "PENDING").length,
                newBids: bids.filter((item) => !item.myBidId).length,
                unread: conversations.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0),
            });
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const disconnectBids = subscribeRealtime({destination: "/topic/bids", onEvent: load, onConnectionChange: setBidConnected});
        const disconnectMessages = subscribeRealtime({destination: "/user/queue/events", onEvent: (event) => event?.type === "MESSAGE_CREATED" && load(), onConnectionChange: setMessageConnected});
        const resume = () => !document.hidden && load();
        document.addEventListener("visibilitychange", resume);
        window.addEventListener("online", load);
        return () => {
            disconnectBids();
            disconnectMessages();
            document.removeEventListener("visibilitychange", resume);
            window.removeEventListener("online", load);
        };
    }, [load]);

    const menus = useMemo(() => [
        ["예약 관리", "🗓️", "일정과 예약 상태를 한눈에 관리합니다.", "/calendar", summary.pending],
        ["입찰 관리", "💰", "영업 반경 내 신규 요청에 견적을 제안합니다.", "/company/bids", summary.newBids],
        ["쪽지함", "✉️", "고객 문의와 예약 관련 대화를 확인합니다.", "/company/messages", summary.unread],
        ["리뷰 관리", "⭐", "고객 후기와 평점을 확인합니다.", "/company/reviews", 0],
        ["휴무 관리", "⏰", "예약을 받지 않을 날짜와 시간을 설정합니다.", "/unavailable", 0],
        ["커뮤니티", "💬", "사용자 게시글과 지역 소식을 확인합니다.", "/company/community", 0],
    ], [summary]);
    const connected = bidConnected && messageConnected;
    const logout = () => {
        ["token", "role", "companyId"].forEach((key) => localStorage.removeItem(key));
        navigate("/");
    };

    return <main className="partner-page"><style>{css}</style><div className="partner-shell">
        <header className="partner-header"><div><p className="partner-eyebrow">DDUCKTTACK PARTNER</p><h1 className="partner-title">파트너 센터</h1><p className="partner-subtitle">오늘 처리할 업무와 새로운 고객 요청을 확인하세요.</p></div><div className="partner-actions"><span className="connection"><i className={`dot ${connected ? "" : "off"}`}/>{connected ? "실시간 연결됨" : "재연결 중"}</span><button className="logout" onClick={logout}>로그아웃</button></div></header>
        {loading && <div className="loading"/>}
        <section className="stats" aria-label="오늘의 업무 요약"><Stat label="오늘 예약" value={summary.today} icon="📅"/><Stat label="처리 대기" value={summary.pending} icon="⏳"/><Stat label="새 입찰 요청" value={summary.newBids} icon="📨"/><Stat label="읽지 않은 쪽지" value={summary.unread} icon="✉️"/></section>
        <section className="menus">{menus.map(([title, icon, desc, path, badge]) => <button className="menu" key={path} onClick={() => navigate(path)}><span className="menu-icon">{icon}</span><span className="menu-title">{title}{badge > 0 && <span className="badge">{badge > 99 ? "99+" : badge}</span>}</span><span className="menu-desc">{desc}</span></button>)}</section>
    </div></main>;
}

function Stat({label, value, icon}) {
    return <article className="stat"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}<span className="unit">건</span></div></article>;
}
