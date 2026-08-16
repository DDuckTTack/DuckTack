import {useEffect, useMemo, useState} from "react";
import {ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {Stack, router, useLocalSearchParams} from "expo-router";
import {Feather} from "@expo/vector-icons";
import {apiClient} from "../src/api/apiClient";
import {getMe} from "../src/api/users";
import AddressSearchModal from "../src/components/AddressSearchModal";
import {AddressResult} from "../src/api/addresses";

const BLUE = "#4F46E5";
const durations = [
  {label:"30분", minutes:30}, {label:"1시간", minutes:60}, {label:"3시간", minutes:180},
  {label:"6시간", minutes:360}, {label:"12시간", minutes:720}, {label:"24시간", minutes:1440},
];
const distanceOptions: {label:string; km:number | null}[] = [
  {label:"1km", km:1}, {label:"3km", km:3}, {label:"5km", km:5}, {label:"10km", km:10}, {label:"전체", km:null},
];
const extendOptions = [{label:"+30분", minutes:30}, {label:"+1시간", minutes:60}, {label:"+3시간", minutes:180}];
const body = (v:any) => v?.data?.data ?? v?.data ?? v;
const won = (v:any) => `${Number(v || 0).toLocaleString("ko-KR")}원`;
const left = (v:string) => {
  const m = Math.floor((new Date(v).getTime() - Date.now()) / 60000);
  return m <= 0 ? "입찰 마감" : m < 60 ? `${m}분 남음` : `${Math.floor(m / 60)}시간 ${m % 60}분 남음`;
};

export default function BidsPage() {
  const p = useLocalSearchParams<{historyId?:string; bidRequestId?:string; imageUrl?:string; issueType?:string}>();
  const [request, setRequest] = useState<any>(null);
  const [address, setAddress] = useState("");
  const [roadAddress, setRoadAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [addressSearchOpen, setAddressSearchOpen] = useState(false);
  const [note, setNote] = useState("");
  const [minutes, setMinutes] = useState(180);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(Boolean(p.bidRequestId));
  const [sending, setSending] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [extendPickerOpen, setExtendPickerOpen] = useState(false);
  const [widenPickerOpen, setWidenPickerOpen] = useState(false);
  const [, tick] = useState(0);

  const load = async (id = p.bidRequestId) => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/api/bids/${id}`);
      setRequest(body(res));
    } catch (e:any) {
      Alert.alert("조회 실패", e?.response?.data?.message || "입찰 정보를 불러오지 못했습니다.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!p.bidRequestId) {
      getMe().then((me:any) => {
        setAddress(me?.address || "");
        setRoadAddress(me?.roadAddress || "");
        setAddressDetail(me?.addressDetail || "");
        setPostalCode(me?.postalCode || "");
        setLatitude(me?.latitude);
        setLongitude(me?.longitude);
      }).catch(() => {});
      return;
    }
    load();
    const poll = setInterval(() => load(), 5000);
    return () => clearInterval(poll);
  }, [p.bidRequestId]);

  useEffect(() => {
    const clock = setInterval(() => tick(v => v + 1), 30000);
    return () => clearInterval(clock);
  }, []);

  const offers = useMemo(() => request?.offers || [], [request]);

  const create = async () => {
    if (!p.historyId) return Alert.alert("진단 필요", "진단 결과에서 입찰을 시작해주세요.");
    if (!roadAddress.trim() || latitude == null || longitude == null) {
      return Alert.alert("주소 검색 필요", "정확한 거리 계산을 위해 주소 검색으로 수리 주소를 선택해주세요.");
    }
    try {
      setSending(true);
      const deadline = new Date(Date.now() + minutes * 60000).toISOString();
      const res = await apiClient.post("/api/bids", {
        historyId:Number(p.historyId),
        address:`${roadAddress}${addressDetail.trim() ? ` ${addressDetail.trim()}` : ""}`,
        latitude, longitude, requestNote:note.trim(), deadline, maxDistanceKm,
      });
      const created = body(res);
      setRequest(created);
      router.setParams({bidRequestId:String(created.id)});
    } catch (e:any) {
      Alert.alert("입찰 등록 실패", e?.response?.data?.message || "잠시 후 다시 시도해주세요.");
    } finally { setSending(false); }
  };

  const extend = async (mins:number) => {
    try {
      setMutating(true);
      const res = await apiClient.post(`/api/bids/${request.id}/extend`, {minutes:mins});
      setRequest(body(res));
      setExtendPickerOpen(false);
    } catch (e:any) {
      Alert.alert("연장 실패", e?.response?.data?.message || "잠시 후 다시 시도해주세요.");
    } finally { setMutating(false); }
  };

  const widen = async (km:number | null) => {
    try {
      setMutating(true);
      const res = await apiClient.post(`/api/bids/${request.id}/widen-radius`, {maxDistanceKm:km});
      setRequest(body(res));
      setWidenPickerOpen(false);
    } catch (e:any) {
      Alert.alert("반경 조정 실패", e?.response?.data?.message || "잠시 후 다시 시도해주세요.");
    } finally { setMutating(false); }
  };

  const select = async (offer:any) => {
    Alert.alert("이 업체를 선택할까요?", `${offer.companyName} · ${won(offer.price)}`, [
      {text:"취소", style:"cancel"},
      {text:"선택", onPress: async () => {
        try {
          const res = await apiClient.post(`/api/bids/${request.id}/select/${offer.id}`);
          const selected = body(res);
          router.push({pathname:"/expert-booking", params:{
            historyId:String(selected.historyId), companyId:String(selected.companyId),
            vendorName:selected.companyName, vendorMinPrice:String(selected.price),
          }});
        } catch (e:any) {
          Alert.alert("선택 실패", e?.response?.data?.message || "입찰 마감 여부를 확인해주세요.");
        }
      }},
    ]);
  };

  const openCompany = (offer:any) => {
    router.push({
      pathname: "/expert-reviews/[vendorId]",
      params: {
        vendorId: String(offer.companyId),
        companyId: String(offer.companyId),
        companyName: offer.companyName,
        companyPhone: offer.companyPhone || "",
        companyAddress: offer.companyAddress || "",
        distanceKm: offer.distanceKm == null ? "" : String(offer.distanceKm),
        bidPrice: String(offer.price || ""),
        readOnly: "true",
        from: "bid",
      },
    });
  };

  if (loading) return <SafeAreaView style={s.center}><ActivityIndicator color={BLUE}/></SafeAreaView>;

  return <SafeAreaView style={s.safe}><Stack.Screen options={{headerShown:false}}/>
    <View style={s.header}><Pressable style={s.back} onPress={() => router.back()}><Feather name="arrow-left" size={22} color={BLUE}/></Pressable>
      <Text style={s.headerTitle}>업체 입찰받기</Text><View style={{width:42}}/></View>
    <ScrollView contentContainerStyle={s.content}>
      {!request ? <>
        <Text style={s.title}>원하는 시간 동안{"\n"}여러 업체의 가격을 받아보세요</Text>
        <Text style={s.sub}>진단 사진과 결과가 업체에 함께 전달됩니다.</Text>
        {p.imageUrl ? <Image source={{uri:String(p.imageUrl)}} style={s.hero}/> : <View style={s.noImage}>진단 사진이 함께 전송됩니다.</View>}
        <Text style={s.label}>입찰 받을 시간</Text>
        <View style={s.chips}>{durations.map(v => <Pressable key={v.minutes} onPress={() => setMinutes(v.minutes)}
          style={[s.chip, minutes === v.minutes && s.chipOn]}><Text style={[s.chipText, minutes === v.minutes && s.chipTextOn]}>{v.label}</Text></Pressable>)}</View>
        <Text style={s.label}>희망 반경</Text>
        <View style={s.chips}>{distanceOptions.map(v => <Pressable key={v.label} onPress={() => setMaxDistanceKm(v.km)}
          style={[s.chip, maxDistanceKm === v.km && s.chipOn]}><Text style={[s.chipText, maxDistanceKm === v.km && s.chipTextOn]}>{v.label}</Text></Pressable>)}</View>
        <Text style={s.label}>수리 주소</Text>
        <Pressable style={s.addressButton} onPress={() => setAddressSearchOpen(true)}>
          <Feather name="search" size={18} color={BLUE}/>
          <Text style={s.addressText}>{roadAddress || "도로명 주소 검색"}</Text>
          <Text style={s.addressAction}>검색</Text>
        </Pressable>
        {!!postalCode && <Text style={s.postal}>우편번호 {postalCode}</Text>}
        <TextInput style={s.input} value={addressDetail} onChangeText={setAddressDetail}
          placeholder="동·호수 등 상세주소"/>
        <Text style={s.label}>업체에 전달할 내용</Text>
        <TextInput style={[s.input,s.multi]} value={note} onChangeText={setNote} multiline placeholder="현장 상황이나 요청사항을 적어주세요."/>
        <Pressable style={s.primary} disabled={sending} onPress={create}><Text style={s.primaryText}>{sending ? "등록 중..." : "입찰 시작하기"}</Text></Pressable>
        <Text style={s.preGuide}>등록하면 5초마다 자동으로 새 업체 제안을 확인해요.</Text>
      </> : <>
        <View style={s.status}><View><Text style={s.statusLabel}>입찰 현황</Text><Text style={s.statusTitle}>{offers.length}개 업체가 참여했어요</Text></View>
          <Text style={s.time}>{left(request.deadline)}</Text></View>
        {request.imageUrl ? <Image source={{uri:request.imageUrl}} style={s.hero}/> : null}
        <Text style={s.guide}>{request.status === "OPEN" ? "업체명, 거리, 가격을 비교해보세요. 5초마다 자동 갱신됩니다." : "입찰이 종료되었습니다."}</Text>
        {request.status === "OPEN" && <View style={s.actionsRow}>
          <Pressable style={[s.pillButton, extendPickerOpen && s.pillButtonActive]} disabled={mutating}
            onPress={() => {setExtendPickerOpen(v => !v); setWidenPickerOpen(false);}}>
            <Feather name="clock" size={14} color={BLUE}/><Text style={s.pillButtonText}>마감 연장</Text>
            <Feather name={extendPickerOpen ? "chevron-up" : "chevron-down"} size={14} color={BLUE}/>
          </Pressable>
          <Pressable style={[s.pillButton, widenPickerOpen && s.pillButtonActive, request.maxDistanceKm == null && s.pillButtonDisabled]}
            disabled={mutating || request.maxDistanceKm == null}
            onPress={() => {setWidenPickerOpen(v => !v); setExtendPickerOpen(false);}}>
            <Feather name="maximize-2" size={14} color={request.maxDistanceKm == null ? "#94A3B8" : BLUE}/>
            <Text style={[s.pillButtonText, request.maxDistanceKm == null && s.pillButtonTextDisabled]}>
              {request.maxDistanceKm == null ? "반경 전체 설정됨" : "반경 넓히기"}
            </Text>
            {request.maxDistanceKm != null && <Feather name={widenPickerOpen ? "chevron-up" : "chevron-down"} size={14} color={BLUE}/>}
          </Pressable>
        </View>}
        {extendPickerOpen && <View style={s.pickerRow}>{extendOptions.map(v => <Pressable key={v.minutes} disabled={mutating}
          style={s.chip} onPress={() => extend(v.minutes)}><Text style={s.chipText}>{v.label}</Text></Pressable>)}</View>}
        {widenPickerOpen && <View style={s.pickerRow}>{distanceOptions.filter(o => o.km === null || (request.maxDistanceKm != null && o.km > request.maxDistanceKm)).map(v => <Pressable key={v.label} disabled={mutating}
          style={s.chip} onPress={() => widen(v.km)}><Text style={s.chipText}>{v.label}</Text></Pressable>)}</View>}
        {offers.length === 1 && request.status === "OPEN" && <View style={s.warningBanner}>
          <Feather name="alert-triangle" size={16} color="#b45309"/>
          <Text style={s.warningBannerText}>아직 입찰이 1건뿐이에요. 조금 더 기다리면 비교할 선택지가 늘어날 수 있어요.</Text>
        </View>}
        {offers.length === 0 ? <View style={s.empty}><Feather name="clock" size={28} color="#94A3B8"/><Text style={s.emptyTitle}>업체의 입찰을 기다리고 있어요</Text></View> :
          offers.map((o:any, i:number) => <View style={[s.offer, o.selected && s.offerSelected]} key={o.id}>
            <Pressable style={s.offerTop} onPress={() => openCompany(o)}>
              <View style={s.rank}><Text style={s.rankText}>{i+1}</Text></View><View style={{flex:1}}>
              <View style={{flexDirection:"row", alignItems:"center", gap:7}}>
                <Text style={s.company}>{o.companyName}</Text>
                {i === 0 && <View style={s.bestBadge}><Text style={s.bestBadgeText}>최저가</Text></View>}
                {o.selected && <Feather name="check-circle" size={16} color="#10B981"/>}
              </View>
              <Text style={s.meta}>★ {Number(o.avgRating || 0).toFixed(1)} · 후기 {o.reviewCount || 0}개 · {o.distanceKm == null ? "거리 정보 없음" : `${o.distanceKm}km`}</Text></View>
              <View style={s.priceArea}><Text style={s.price}>{won(o.price)}</Text></View>
            </Pressable>
            {o.message ? <Text style={s.message}>{o.message}</Text> : null}
            {o.companyAddress ? <Text style={s.address}>{o.companyAddress}</Text> : null}
            <Pressable style={s.detailButton} onPress={() => openCompany(o)}><Feather name="map-pin" size={15} color={BLUE}/><Text style={s.detailButtonText}>업체 정보 · 후기 보기</Text></Pressable>
            <Pressable disabled={request.status !== "OPEN"} style={[s.select,request.status !== "OPEN" && s.disabled]} onPress={() => select(o)}>
              <Text style={s.selectText}>{o.selected ? "선택한 업체" : "이 업체 예약하기"}</Text></Pressable>
          </View>)}
      </>}
    </ScrollView>
    <AddressSearchModal visible={addressSearchOpen} onClose={() => setAddressSearchOpen(false)}
      onSelect={(selected:AddressResult) => {
        setRoadAddress(selected.roadAddress);
        setAddress(selected.roadAddress);
        setPostalCode(selected.postalCode);
        setLatitude(selected.latitude);
        setLongitude(selected.longitude);
      }}/>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:"#F8FAFC"},center:{flex:1,alignItems:"center",justifyContent:"center"},header:{height:62,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:"#fff"},
  back:{width:42,height:42,borderRadius:21,backgroundColor:"#EEF2FF",alignItems:"center",justifyContent:"center"},headerTitle:{fontSize:19,fontWeight:"800",color:"#0F172A"},
  content:{padding:20,paddingBottom:50},title:{fontSize:27,lineHeight:37,fontWeight:"900",color:"#0F172A"},sub:{color:"#64748B",fontSize:15,marginTop:8,marginBottom:20},
  hero:{width:"100%",height:210,borderRadius:18,marginBottom:22},noImage:{height:110,borderRadius:18,backgroundColor:"#EEF2F7",alignItems:"center",justifyContent:"center",color:"#64748B",marginBottom:22},
  label:{fontSize:15,fontWeight:"800",color:"#1E293B",marginTop:18,marginBottom:9},chips:{flexDirection:"row",flexWrap:"wrap",gap:8},chip:{paddingVertical:10,paddingHorizontal:16,borderRadius:99,backgroundColor:"#fff",borderWidth:1,borderColor:"#CBD5E1"},
  chipOn:{backgroundColor:"#EEF2FF",borderColor:BLUE},chipText:{fontWeight:"700",color:"#475569"},chipTextOn:{color:BLUE},input:{backgroundColor:"#fff",borderWidth:1,borderColor:"#CBD5E1",borderRadius:13,padding:14,fontSize:15},multi:{height:100,textAlignVertical:"top"},
  addressButton:{minHeight:50,flexDirection:"row",alignItems:"center",gap:9,backgroundColor:"#fff",borderWidth:1,borderColor:"#A5B4FC",borderRadius:13,paddingHorizontal:14},
  addressText:{flex:1,color:"#334155",fontSize:14,fontWeight:"700"},addressAction:{color:BLUE,fontWeight:"900"},postal:{fontSize:12,color:"#64748B",marginTop:7,marginBottom:7,marginLeft:4},
  primary:{backgroundColor:BLUE,borderRadius:14,padding:17,alignItems:"center",marginTop:25},primaryText:{color:"#fff",fontWeight:"900",fontSize:16},
  preGuide:{color:"#94A3B8",fontSize:12.5,textAlign:"center",marginTop:11},
  status:{backgroundColor:"#171C2B",borderRadius:20,padding:20,flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:18},statusLabel:{color:"#A5B4FC",fontWeight:"700"},statusTitle:{color:"#fff",fontSize:20,fontWeight:"900",marginTop:5},time:{color:"#FCA5A5",fontWeight:"900"},
  guide:{color:"#64748B",lineHeight:21,marginBottom:14},empty:{backgroundColor:"#fff",borderRadius:18,padding:40,alignItems:"center"},emptyTitle:{fontWeight:"800",color:"#475569",marginTop:12},
  actionsRow:{flexDirection:"row",gap:8,marginBottom:12},
  pillButton:{flexDirection:"row",alignItems:"center",gap:6,paddingVertical:10,paddingHorizontal:14,borderRadius:12,backgroundColor:"#fff",borderWidth:1.5,borderColor:BLUE,
    shadowColor:"#000",shadowOpacity:0.06,shadowRadius:4,shadowOffset:{width:0,height:2},elevation:1},
  pillButtonActive:{backgroundColor:"#EEF2FF"},
  pillButtonDisabled:{backgroundColor:"#F1F5F9",borderColor:"#E2E8F0",shadowOpacity:0},
  pillButtonText:{color:BLUE,fontWeight:"800",fontSize:13},
  pillButtonTextDisabled:{color:"#94A3B8"},
  pickerRow:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:16,marginTop:2},
  warningBanner:{flexDirection:"row",alignItems:"flex-start",gap:8,backgroundColor:"#fffbeb",borderRadius:12,padding:12,borderWidth:1,borderColor:"#fde68a",marginBottom:14},
  warningBannerText:{flex:1,fontSize:13,color:"#92400e",lineHeight:18},
  offer:{backgroundColor:"#fff",borderRadius:18,padding:18,marginBottom:14,borderWidth:1,borderColor:"#E2E8F0"},
  offerSelected:{borderWidth:2,borderColor:"#10B981",backgroundColor:"#F0FDF4"},
  offerTop:{flexDirection:"row",alignItems:"center",gap:12},rank:{width:34,height:34,borderRadius:17,backgroundColor:"#EEF2FF",alignItems:"center",justifyContent:"center"},rankText:{color:BLUE,fontWeight:"900"},
  company:{fontSize:18,fontWeight:"900",color:"#0F172A"},meta:{color:"#64748B",fontSize:13,marginTop:3},priceArea:{alignItems:"flex-end",gap:4},price:{fontSize:19,fontWeight:"900",color:BLUE},message:{backgroundColor:"#F8FAFC",padding:12,borderRadius:10,color:"#334155",marginTop:14},address:{color:"#64748B",fontSize:13,marginTop:10},
  bestBadge:{backgroundColor:"#DCFCE7",borderRadius:99,paddingHorizontal:8,paddingVertical:2},bestBadgeText:{color:"#15803D",fontSize:11,fontWeight:"900"},
  detailButton:{height:42,marginTop:12,borderRadius:11,backgroundColor:"#EEF2FF",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},detailButtonText:{color:BLUE,fontSize:14,fontWeight:"800"},
  select:{backgroundColor:BLUE,borderRadius:12,padding:14,alignItems:"center",marginTop:14},disabled:{backgroundColor:"#94A3B8"},selectText:{color:"#fff",fontWeight:"900"}
});
