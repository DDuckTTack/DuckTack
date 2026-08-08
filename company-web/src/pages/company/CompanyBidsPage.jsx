import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import axios from "../../api/axios";

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const won = (value) => `${Number(value || 0).toLocaleString("ko-KR")}원`;
const timeLeft = (deadline) => {
    const minutes = Math.floor((new Date(deadline).getTime() - Date.now()) / 60000);
    if (minutes <= 0) return "마감";
    if (minutes < 60) return `${minutes}분 남음`;
    return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 남음`;
};
const imageUrl = (value) => {
    if (!value) return "";
    const text = String(value);
    const storageIndex = text.indexOf("/storage/");
    const uploadIndex = text.indexOf("/uploads/");
    const pathIndex = storageIndex >= 0 ? storageIndex : uploadIndex;
    if (pathIndex >= 0) {
        return `${window.location.protocol}//${window.location.hostname}:8080${text.slice(pathIndex)}`;
    }
    return /^https?:/.test(text)
        ? text
        : `${window.location.protocol}//${window.location.hostname}:8080${text.startsWith("/") ? "" : "/"}${text}`;
};

export default function CompanyBidsPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [results, setResults] = useState([]);
    const [radius, setRadius] = useState(10);
    const [drafts, setDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [sendingId, setSendingId] = useState(null);
    const [, refreshClock] = useState(0);

    const load = async () => {
        try {
            const [itemsResponse, radiusResponse, resultsResponse] = await Promise.all([
                axios.get("/api/company/bids"),
                axios.get("/api/company/bids/settings/radius"),
                axios.get("/api/company/bids/mine"),
            ]);
            const nextItems = Array.isArray(unwrap(itemsResponse)) ? unwrap(itemsResponse) : [];
            setItems(nextItems);
            setDrafts((current) => {
                const next = {...current};
                nextItems.forEach((item) => {
                    if (item.myBidId && !next[item.id]) {
                        next[item.id] = {price:String(item.myBidPrice || ""), message:item.myBidMessage || ""};
                    }
                });
                return next;
            });
            setResults(Array.isArray(unwrap(resultsResponse)) ? unwrap(resultsResponse) : []);
            setRadius(Number(unwrap(radiusResponse)?.radiusKm || 10));
        } catch (error) {
            console.error("입찰 조회 실패", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const polling = setInterval(load, 10000);
        const clock = setInterval(() => refreshClock((value) => value + 1), 30000);
        return () => { clearInterval(polling); clearInterval(clock); };
    }, []);

    const updateDraft = (id, value) => setDrafts((current) => ({
        ...current, [id]: {...current[id], ...value},
    }));

    const saveRadius = async () => {
        try {
            await axios.put("/api/company/bids/settings/radius", {radiusKm:Number(radius)});
            alert(`입찰 수신 반경을 ${radius}km로 저장했습니다.`);
            load();
        } catch (error) {
            alert(error?.response?.data?.message || "입찰 반경 저장에 실패했습니다.");
        }
    };

    const submitBid = async (item) => {
        const form = drafts[item.id] || {};
        if (Number(form.price) < 1000) return alert("1,000원 이상의 입찰 가격을 입력해주세요.");
        try {
            setSendingId(item.id);
            await axios.post(`/api/company/bids/${item.id}`, {
                price:Number(form.price), message:form.message || "",
            });
            alert("입찰이 등록되었습니다.");
            load();
        } catch (error) {
            alert(error?.response?.data?.message || "입찰 등록에 실패했습니다.");
        } finally {
            setSendingId(null);
        }
    };

    return <main style={s.page}>
        <div style={s.container}>
            <button style={s.backButton} onClick={() => navigate("/company")}>← 파트너 센터</button>

            <section style={s.header}>
                <div style={s.titleRow}><span style={s.titleIcon}>₩</span><h1 style={s.title}>입찰 관리</h1></div>
                <p style={s.subtitle}>내 영업 반경 안에 접수된 수리 요청을 확인하고 합리적인 가격을 제안하세요.</p>
                <div style={s.summaryGrid}>
                    <Summary label="진행 중인 요청" value={items.length} unit="건" icon="📨"/>
                    <Summary label="참여한 입찰" value={results.length} unit="건" icon="🤝"/>
                    <Summary label="입찰 수신 반경" value={radius} unit="km" icon="📍"/>
                </div>
            </section>

            <section style={s.radiusCard}>
                <div style={s.radiusIcon}>◎</div>
                <div style={s.radiusText}>
                    <h2 style={s.sectionTitle}>입찰 수신 반경</h2>
                    <p style={s.sectionSub}>업체 등록 위치를 기준으로 설정한 거리 안의 요청만 보여드립니다.</p>
                </div>
                <input style={s.range} type="range" min="1" max="100" value={radius}
                       onChange={(event) => setRadius(event.target.value)}/>
                <div style={s.radiusValue}>{radius}<small>km</small></div>
                <button style={s.saveButton} onClick={saveRadius}>저장</button>
            </section>

            {results.length > 0 && <section style={s.resultSection}>
                <div style={s.sectionHeader}><div><h2 style={s.sectionTitle}>내 입찰 현황</h2>
                    <p style={s.sectionSub}>최근 참여한 입찰의 결과를 확인하세요.</p></div></div>
                <div style={s.resultList}>{results.slice(0, 5).map((result) => {
                    const success = result.result === "SUCCESS";
                    const failed = result.result === "FAILED";
                    return <div key={result.bidId} style={s.resultRow}>
                        <div style={{...s.resultIcon,background:success ? "#DCFCE7" : failed ? "#F1F5F9" : "#FEF3C7"}}>
                            {success ? "✓" : failed ? "–" : "…"}
                        </div>
                        <div style={{flex:1}}><b>{result.issueType} 수리 입찰</b>
                            <div style={s.resultMeta}>제안 금액 {won(result.price)}</div></div>
                        <span style={{...s.resultBadge,color:success ? "#15803D" : failed ? "#64748B" : "#B45309",
                            background:success ? "#DCFCE7" : failed ? "#F1F5F9" : "#FEF3C7"}}>
                            {success ? "입찰 성공" : failed ? "입찰 실패" : "결과 대기"}</span>
                        {success && <span style={s.calendarHint}>예약 후 캘린더를 확인해주세요</span>}
                    </div>;
                })}</div>
            </section>}

            <section style={s.requestSection}>
                <div style={s.sectionHeader}><div><h2 style={s.sectionTitle}>새로운 입찰 요청</h2>
                    <p style={s.sectionSub}>10초마다 새로운 요청을 자동으로 확인합니다.</p></div>
                    <span style={s.count}>{items.length}건</span></div>

                {loading ? <Empty text="입찰 요청을 불러오는 중입니다."/> :
                    items.length === 0 ? <Empty icon="📭" text="현재 수신 반경 안에 접수된 요청이 없습니다."/> :
                    <div style={s.grid}>{items.map((item) => <article style={s.card} key={item.id}>
                        {item.imageUrl ? <img style={s.image} src={imageUrl(item.imageUrl)} alt="사용자 진단 사진"/>
                            : <div style={s.noImage}><span>🖼️</span>진단 사진 없음</div>}
                        <div style={s.cardBody}>
                            <div style={s.cardTop}><div style={{display:"flex",gap:7,alignItems:"center"}}><span style={s.issueBadge}>{item.issueType}</span>
                                {item.myBidId && <span style={s.submittedBadge}>입찰 완료</span>}</div>
                                <b style={s.deadline}>⏱ {timeLeft(item.deadline)}</b></div>
                            <h3 style={s.requestTitle}>{item.userName}님의 수리 요청</h3>
                            <div style={s.infoRow}><span>위험도 <b>{item.riskScore}%</b></span><i/>
                                <span>{item.distanceKm == null ? "거리 확인 필요" : `${item.distanceKm}km 거리`}</span></div>
                            <div style={s.address}>📍 {item.address}</div>
                            {item.requestNote && <div style={s.note}>{item.requestNote}</div>}
                            <label style={s.label}>입찰 가격</label>
                            <div style={s.priceInput}><input style={s.priceInputField} inputMode="numeric" placeholder="예: 150000"
                                value={drafts[item.id]?.price || ""}
                                onChange={(event) => updateDraft(item.id, {price:event.target.value.replace(/\D/g, "")})}/>
                                <span>원</span></div>
                            {drafts[item.id]?.price && <div style={s.pricePreview}>{won(drafts[item.id].price)}</div>}
                            <textarea style={s.textarea} placeholder="작업 범위와 안내사항을 입력해주세요."
                                value={drafts[item.id]?.message || ""}
                                onChange={(event) => updateDraft(item.id, {message:event.target.value})}/>
                            <button style={s.bidButton} disabled={sendingId === item.id} onClick={() => submitBid(item)}>
                                {sendingId === item.id ? "저장 중..." : item.myBidId ? "입찰가 수정하기" : "이 가격으로 입찰하기"}</button>
                        </div>
                    </article>)}</div>}
            </section>
        </div>
    </main>;
}

function Summary({label,value,unit,icon}) {
    return <div style={s.summaryCard}><div><div style={s.summaryLabel}>{label}</div>
        <div style={s.summaryValue}>{value}<small>{unit}</small></div></div><div style={s.summaryIcon}>{icon}</div></div>;
}
function Empty({icon="◌",text}) {
    return <div style={s.empty}><div style={s.emptyIcon}>{icon}</div>{text}</div>;
}

const s = {
    page:{minHeight:"100vh",background:"#F0F7FF",padding:"40px 24px",fontFamily:"Pretendard, sans-serif",color:"#0F172A"},
    container:{maxWidth:1180,margin:"0 auto"},backButton:{border:0,background:"transparent",padding:0,color:"#64748B",fontSize:14,fontWeight:800,cursor:"pointer",marginBottom:20},
    header:{background:"linear-gradient(135deg,#FFFFFF 0%,#F4F8FF 100%)",border:"1px solid #DBEAFE",borderRadius:24,padding:30,boxShadow:"0 14px 34px rgba(15,23,42,.06)",marginBottom:20},
    titleRow:{display:"flex",alignItems:"center",gap:12},titleIcon:{width:46,height:46,borderRadius:15,display:"grid",placeItems:"center",background:"#DBEAFE",color:"#2563EB",fontSize:24,fontWeight:900},
    title:{margin:0,fontSize:30,fontWeight:900},subtitle:{margin:"11px 0 25px",color:"#64748B",fontSize:15},
    summaryGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14},summaryCard:{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff",border:"1px solid #E2E8F0",borderRadius:18,padding:"18px 20px"},
    summaryLabel:{fontSize:13,color:"#64748B",fontWeight:800},summaryValue:{fontSize:29,color:"#2563EB",fontWeight:900,marginTop:5},summaryIcon:{width:52,height:52,borderRadius:16,background:"#EFF6FF",display:"grid",placeItems:"center",fontSize:24},
    radiusCard:{display:"flex",alignItems:"center",gap:16,background:"#fff",border:"1px solid #E2E8F0",borderRadius:20,padding:22,boxShadow:"0 8px 22px rgba(15,23,42,.045)",marginBottom:20},
    radiusIcon:{width:45,height:45,borderRadius:14,background:"#EFF6FF",color:"#2563EB",display:"grid",placeItems:"center",fontSize:24},radiusText:{flex:1},
    sectionTitle:{margin:0,fontSize:20,fontWeight:900},sectionSub:{margin:"6px 0 0",fontSize:13,color:"#64748B"},range:{width:230,accentColor:"#2563EB"},
    radiusValue:{minWidth:70,fontSize:23,fontWeight:900,color:"#2563EB",textAlign:"right"},saveButton:{border:0,borderRadius:11,background:"#2563EB",color:"#fff",padding:"11px 19px",fontWeight:900,cursor:"pointer"},
    resultSection:{background:"#fff",border:"1px solid #E2E8F0",borderRadius:22,padding:24,boxShadow:"0 8px 22px rgba(15,23,42,.045)",marginBottom:20},
    sectionHeader:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18},resultList:{display:"grid",gap:8},resultRow:{display:"flex",alignItems:"center",gap:13,padding:13,background:"#F8FAFC",borderRadius:13},
    resultIcon:{width:34,height:34,borderRadius:11,display:"grid",placeItems:"center",fontWeight:900},resultMeta:{fontSize:12,color:"#64748B",marginTop:3},
    resultBadge:{padding:"6px 10px",borderRadius:99,fontSize:12,fontWeight:900},calendarHint:{fontSize:12,color:"#64748B"},
    requestSection:{background:"#fff",border:"1px solid #E2E8F0",borderRadius:24,padding:26,boxShadow:"0 14px 34px rgba(15,23,42,.06)"},count:{background:"#EFF6FF",color:"#2563EB",padding:"7px 12px",borderRadius:99,fontWeight:900},
    grid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:18},card:{border:"1px solid #E2E8F0",borderRadius:19,overflow:"hidden",background:"#fff",boxShadow:"0 8px 22px rgba(15,23,42,.045)"},
    image:{width:"100%",height:205,objectFit:"cover"},noImage:{height:205,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,background:"#F1F5F9",color:"#94A3B8"},
    cardBody:{padding:20},cardTop:{display:"flex",justifyContent:"space-between",alignItems:"center"},issueBadge:{background:"#DBEAFE",color:"#2563EB",padding:"6px 10px",borderRadius:99,fontSize:12,fontWeight:900},
    submittedBadge:{background:"#DCFCE7",color:"#15803D",padding:"6px 10px",borderRadius:99,fontSize:12,fontWeight:900},
    deadline:{fontSize:13,color:"#DC2626"},requestTitle:{fontSize:19,margin:"14px 0 9px"},infoRow:{display:"flex",alignItems:"center",gap:9,color:"#475569",fontSize:13},address:{fontSize:13,color:"#64748B",marginTop:10},
    note:{background:"#F8FAFC",borderRadius:11,padding:11,color:"#475569",fontSize:13,lineHeight:1.45,marginTop:12},label:{display:"block",fontSize:13,fontWeight:900,margin:"17px 0 7px"},
    priceInput:{height:45,display:"flex",alignItems:"center",border:"1px solid #CBD5E1",borderRadius:11,overflow:"hidden"},pricePreview:{fontSize:12,color:"#2563EB",fontWeight:800,marginTop:5},
    priceInputField:{flex:1,height:"100%",border:0,outline:"none",padding:"0 12px",fontSize:15},
    textarea:{width:"100%",boxSizing:"border-box",minHeight:75,resize:"vertical",border:"1px solid #CBD5E1",borderRadius:11,padding:12,marginTop:11,fontFamily:"inherit"},
    bidButton:{width:"100%",border:0,borderRadius:11,background:"#2563EB",color:"#fff",padding:14,fontWeight:900,cursor:"pointer",marginTop:11},
    empty:{padding:65,textAlign:"center",color:"#94A3B8",fontWeight:800},emptyIcon:{fontSize:37,marginBottom:10},
};
