import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";

const STATUS = {
    OPEN: { label: "진행 중", color: "#B45309", bg: "#FEF3C7" },
    SELECTED: { label: "업체 선정", color: "#047857", bg: "#D1FAE5" },
    EXPIRED: { label: "마감", color: "#475569", bg: "#E2E8F0" },
    CANCELLED: { label: "취소", color: "#B91C1C", bg: "#FEE2E2" },
};

const unwrap = (value) => value?.data?.data ?? value?.data ?? value;
const money = (value) => `${Number(value || 0).toLocaleString("ko-KR")}원`;
const dateTime = (value) => value ? new Date(value).toLocaleString("ko-KR") : "-";

export default function AdminBidsPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("ALL");
    const [expandedId, setExpandedId] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            setError("");
            const response = await axios.get("/api/admin/bids");
            const data = unwrap(response);
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("관리자 입찰 조회 실패", e);
            setError(e?.response?.data?.message || "입찰 정보를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return items.filter((item) => {
            if (status !== "ALL" && item.status !== status) return false;
            if (!keyword) return true;
            return [item.id, item.username, item.address, item.issueType, item.selectedCompanyName]
                .some((value) => String(value ?? "").toLowerCase().includes(keyword));
        });
    }, [items, query, status]);

    const count = (target) => items.filter((item) => item.status === target).length;

    return <div style={s.page}>
        <div style={s.headingRow}>
            <div><h1 style={s.title}>입찰 관리</h1><p style={s.desc}>사용자 요청부터 참여 업체와 최종 선정 결과까지 확인합니다.</p></div>
            <button style={s.refresh} onClick={load}>새로고침</button>
        </div>

        <div style={s.stats}>
            {[['전체 요청', items.length, '#4F46E5'], ['진행 중', count('OPEN'), '#D97706'], ['업체 선정', count('SELECTED'), '#059669'], ['마감·취소', count('EXPIRED') + count('CANCELLED'), '#64748B']]
                .map(([label, value, color]) => <div style={s.statCard} key={label}><span style={s.statLabel}>{label}</span><strong style={{...s.statValue, color}}>{value}</strong></div>)}
        </div>

        <div style={s.filters}>
            <input style={s.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="요청번호, 사용자, 주소, 업체명 검색" />
            <select style={s.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ALL">전체 상태</option><option value="OPEN">진행 중</option><option value="SELECTED">업체 선정</option><option value="EXPIRED">마감</option><option value="CANCELLED">취소</option>
            </select>
        </div>

        {loading ? <div style={s.state}>입찰 정보를 불러오는 중입니다.</div>
            : error ? <div style={{...s.state, color:'#B91C1C'}}>{error}<button style={s.retry} onClick={load}>다시 시도</button></div>
            : filtered.length === 0 ? <div style={s.state}>조건에 맞는 입찰 요청이 없습니다.</div>
            : <div style={s.list}>{filtered.map((item) => {
                const meta = STATUS[item.status] || STATUS.EXPIRED;
                const offers = Array.isArray(item.offers) ? item.offers : [];
                const expanded = expandedId === item.id;
                return <section key={item.id} style={s.card}>
                    <button style={s.cardHead} onClick={() => setExpandedId(expanded ? null : item.id)}>
                        <div style={s.idBox}>#{item.id}</div>
                        <div style={s.mainInfo}><div style={s.nameRow}><strong style={s.issue}>{item.issueType} 진단</strong><span style={{...s.badge,color:meta.color,backgroundColor:meta.bg}}>{meta.label}</span></div>
                            <div style={s.meta}>{item.username} · 입찰 {offers.length}개 · 생성 {dateTime(item.createdAt)}</div></div>
                        <div style={s.selectedSummary}>{item.selectedCompanyName ? <><span>선정 업체</span><strong>{item.selectedCompanyName}</strong></> : <span>선정 업체 없음</span>}</div>
                        <span style={s.chevron}>{expanded ? '▲' : '▼'}</span>
                    </button>
                    {expanded && <div style={s.detail}>
                        <div style={s.requestGrid}>
                            {item.imageUrl && <img src={item.imageUrl} alt="진단" style={s.image} />}
                            <div style={s.requestInfo}><Info label="사용자" value={`${item.username} (ID ${item.userId})`} /><Info label="요청 주소" value={item.address} /><Info label="요청 내용" value={item.requestNote || "없음"} /><Info label="마감 시간" value={dateTime(item.deadline)} /><Info label="진단 기록" value={`#${item.historyId} · 위험도 ${item.riskScore ?? '-'}점`} /></div>
                        </div>
                        <h3 style={s.offerTitle}>참여 업체 <span>{offers.length}</span></h3>
                        {offers.length === 0 ? <div style={s.noOffer}>아직 참여한 업체가 없습니다.</div> : <div style={s.offerGrid}>{offers.map((offer) => <div key={offer.id} style={{...s.offerCard, ...(offer.selected ? s.winner : {})}}>
                            <div style={s.offerTop}><strong>{offer.companyName}</strong>{offer.selected && <span style={s.winnerBadge}>최종 선정</span>}</div>
                            <div style={s.price}>{money(offer.price)}</div>
                            <div style={s.offerMeta}>★ {Number(offer.avgRating || 0).toFixed(1)} · 후기 {offer.reviewCount || 0}개 · {offer.distanceKm == null ? "거리 없음" : `${Number(offer.distanceKm).toFixed(1)}km`}</div>
                            <div style={s.offerMeta}>{offer.companyAddress || "주소 미등록"}</div>
                            {offer.message && <div style={s.message}>{offer.message}</div>}
                            <div style={s.bidTime}>입찰 시각 {dateTime(offer.createdAt)}</div>
                        </div>)}</div>}
                    </div>}
                </section>;
            })}</div>}
    </div>;
}

function Info({label, value}) { return <div style={s.info}><span>{label}</span><strong>{value || '-'}</strong></div>; }

const s = {
    page:{padding:28,minHeight:'100vh',background:'#F8FAFC',boxSizing:'border-box'},headingRow:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22},title:{margin:0,fontSize:28,color:'#0F172A'},desc:{margin:'7px 0 0',color:'#64748B'},refresh:{border:0,borderRadius:11,padding:'11px 17px',background:'#4F46E5',color:'#fff',fontWeight:800,cursor:'pointer'},
    stats:{display:'grid',gridTemplateColumns:'repeat(4,minmax(150px,1fr))',gap:14,marginBottom:18},statCard:{background:'#fff',border:'1px solid #E2E8F0',borderRadius:16,padding:'17px 19px',display:'flex',justifyContent:'space-between',alignItems:'center'},statLabel:{color:'#64748B',fontWeight:700},statValue:{fontSize:26},filters:{background:'#fff',border:'1px solid #E2E8F0',borderRadius:16,padding:15,display:'flex',gap:10,marginBottom:16},search:{flex:1,padding:'12px 14px',border:'1px solid #CBD5E1',borderRadius:10,fontSize:14},select:{padding:'0 14px',border:'1px solid #CBD5E1',borderRadius:10,background:'#fff'},state:{padding:60,textAlign:'center',background:'#fff',borderRadius:16,color:'#64748B',fontWeight:700},retry:{marginLeft:12,padding:'8px 12px'},list:{display:'flex',flexDirection:'column',gap:12},card:{background:'#fff',border:'1px solid #E2E8F0',borderRadius:18,overflow:'hidden'},cardHead:{width:'100%',border:0,background:'#fff',padding:18,display:'flex',alignItems:'center',gap:15,textAlign:'left',cursor:'pointer'},idBox:{padding:'8px 10px',borderRadius:10,background:'#EEF2FF',color:'#4F46E5',fontWeight:900},mainInfo:{flex:1},nameRow:{display:'flex',alignItems:'center',gap:9},issue:{fontSize:17,color:'#0F172A'},badge:{padding:'4px 9px',borderRadius:99,fontSize:12,fontWeight:800},meta:{fontSize:13,color:'#64748B',marginTop:6},selectedSummary:{minWidth:150,display:'flex',flexDirection:'column',gap:3,color:'#64748B',fontSize:12},chevron:{color:'#94A3B8'},detail:{borderTop:'1px solid #E2E8F0',padding:20,background:'#FAFBFF'},requestGrid:{display:'flex',gap:20},image:{width:180,height:130,objectFit:'cover',borderRadius:14,background:'#E2E8F0'},requestInfo:{flex:1,display:'grid',gridTemplateColumns:'repeat(2,minmax(220px,1fr))',gap:12},info:{display:'flex',flexDirection:'column',gap:4},offerTitle:{fontSize:16,color:'#1E293B',margin:'24px 0 12px'},offerGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:12},offerCard:{padding:16,border:'1px solid #E2E8F0',borderRadius:14,background:'#fff'},winner:{border:'2px solid #10B981',background:'#F0FDF4'},offerTop:{display:'flex',justifyContent:'space-between',gap:8},winnerBadge:{fontSize:11,padding:'3px 7px',borderRadius:99,background:'#10B981',color:'#fff'},price:{fontSize:21,fontWeight:900,color:'#4F46E5',margin:'12px 0 7px'},offerMeta:{fontSize:12,color:'#64748B',marginTop:5},message:{padding:9,marginTop:10,borderRadius:8,background:'#F1F5F9',fontSize:13},bidTime:{fontSize:11,color:'#94A3B8',marginTop:10},noOffer:{padding:25,textAlign:'center',background:'#fff',borderRadius:12,color:'#94A3B8'}
};
