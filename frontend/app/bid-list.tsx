import {useCallback, useMemo, useState} from "react";
import {ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {Stack, router} from "expo-router";
import {Feather, Ionicons} from "@expo/vector-icons";
import {useFocusEffect} from "@react-navigation/native";
import {apiClient} from "../src/api/apiClient";

const BLUE = "#4F46E5";
const body = (value:any) => value?.data?.data ?? value?.data ?? value;
const statusInfo = (status:string) => {
  switch (status) {
    case "SELECTED": return {label:"업체 선택 완료", color:"#15803D", bg:"#DCFCE7", icon:"checkmark-circle"};
    case "EXPIRED": return {label:"입찰 마감", color:"#64748B", bg:"#F1F5F9", icon:"time"};
    case "CANCELLED": return {label:"취소됨", color:"#DC2626", bg:"#FEE2E2", icon:"close-circle"};
    default: return {label:"입찰 진행 중", color:"#B45309", bg:"#FEF3C7", icon:"radio"};
  }
};
const left = (deadline:string) => {
  const minutes = Math.floor((new Date(deadline).getTime() - Date.now()) / 60000);
  if (minutes <= 0) return "마감";
  if (minutes < 60) return `${minutes}분 남음`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 남음`;
};
const formatDate = (value:string) => new Date(value).toLocaleString("ko-KR", {
  month:"long", day:"numeric", hour:"2-digit", minute:"2-digit",
});

export default function BidListPage() {
  const [items,setItems] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [filter,setFilter] = useState<"ALL"|"OPEN"|"ENDED">("ALL");

  const load = useCallback(async (refresh=false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      const response = await apiClient.get("/api/bids/me");
      const data = body(response);
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => items.filter((item) =>
    filter === "ALL" || (filter === "OPEN" ? item.status === "OPEN" : item.status !== "OPEN")
  ), [items,filter]);
  const activeCount = items.filter((item) => item.status === "OPEN").length;

  return <SafeAreaView style={s.safe} edges={["top","left","right"]}>
    <Stack.Screen options={{headerShown:false}}/>
    <View style={s.header}>
      <Pressable style={s.back} onPress={() => router.back()}><Feather name="arrow-left" size={21} color={BLUE}/></Pressable>
      <View style={{flex:1}}><Text style={s.title}>내 입찰 목록</Text><Text style={s.sub}>진행 상태와 업체 제안을 확인하세요</Text></View>
      <View style={s.activeCount}><Text style={s.activeNumber}>{activeCount}</Text><Text style={s.activeLabel}>진행 중</Text></View>
    </View>
    <View style={s.filters}>{[["ALL","전체"],["OPEN","진행 중"],["ENDED","종료"]].map(([value,label]) =>
      <Pressable key={value} style={[s.filter,filter === value && s.filterOn]} onPress={() => setFilter(value as any)}>
        <Text style={[s.filterText,filter === value && s.filterTextOn]}>{label}</Text></Pressable>)}</View>

    {loading ? <View style={s.center}><ActivityIndicator color={BLUE}/></View> :
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)}/>}>
        {filtered.length === 0 ? <View style={s.empty}><Ionicons name="pricetags-outline" size={40} color="#CBD5E1"/>
          <Text style={s.emptyTitle}>입찰 내역이 없습니다</Text><Text style={s.emptySub}>진단 결과에서 여러 업체에 입찰을 요청해보세요.</Text></View> :
          filtered.map((item) => {
            const status = statusInfo(item.status);
            return <Pressable key={item.id} style={s.card} onPress={() => router.push({pathname:"/bids" as any,params:{bidRequestId:String(item.id)}})}>
              <View style={s.cardTop}><View style={{...s.status,borderColor:status.bg,backgroundColor:status.bg}}>
                <Ionicons name={status.icon as any} size={15} color={status.color}/><Text style={{...s.statusText,color:status.color}}>{status.label}</Text></View>
                {item.status === "OPEN" && <Text style={s.deadline}>{left(item.deadline)}</Text>}</View>
              <Text style={s.issue}>{item.issueType} 수리 입찰</Text>
              <Text style={s.address} numberOfLines={1}>📍 {item.address}</Text>
              <View style={s.divider}/>
              <View style={s.bottom}><View><Text style={[s.offerCount, item.status === "OPEN" && (item.offers?.length || 0) <= 1 && s.offerCountLow]}>{item.offers?.length || 0}개 업체 참여</Text>
                <Text style={s.date}>{formatDate(item.createdAt)} 요청</Text></View>
                <View style={s.detail}><Text style={s.detailText}>상세보기</Text><Feather name="chevron-right" size={18} color={BLUE}/></View></View>
            </Pressable>;
          })}
      </ScrollView>}
  </SafeAreaView>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:"#F8FAFC"},header:{flexDirection:"row",alignItems:"center",gap:13,paddingHorizontal:20,paddingVertical:17,backgroundColor:"#fff",borderBottomWidth:1,borderBottomColor:"#F1F5F9"},
  back:{width:42,height:42,borderRadius:21,backgroundColor:"#EEF2FF",alignItems:"center",justifyContent:"center"},title:{fontSize:22,fontWeight:"900",color:"#0F172A"},sub:{fontSize:12,color:"#64748B",marginTop:3},
  activeCount:{alignItems:"center",backgroundColor:"#EEF2FF",borderRadius:12,paddingHorizontal:12,paddingVertical:7},activeNumber:{fontSize:18,fontWeight:"900",color:BLUE},activeLabel:{fontSize:10,fontWeight:"700",color:BLUE},
  filters:{flexDirection:"row",gap:8,padding:16,backgroundColor:"#fff"},filter:{paddingHorizontal:17,paddingVertical:9,borderRadius:99,backgroundColor:"#F1F5F9"},filterOn:{backgroundColor:BLUE},
  filterText:{fontSize:13,fontWeight:"800",color:"#64748B"},filterTextOn:{color:"#fff"},center:{flex:1,alignItems:"center",justifyContent:"center"},content:{padding:18,paddingBottom:45},
  card:{backgroundColor:"#fff",borderRadius:18,padding:18,marginBottom:13,borderWidth:1,borderColor:"#E2E8F0"},cardTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  status:{flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:9,paddingVertical:6,borderRadius:99,borderWidth:1},statusText:{fontSize:12,fontWeight:"900"},deadline:{fontSize:13,fontWeight:"900",color:"#EF4444"},
  issue:{fontSize:19,fontWeight:"900",color:"#0F172A",marginTop:14},address:{fontSize:13,color:"#64748B",marginTop:8},divider:{height:1,backgroundColor:"#F1F5F9",marginVertical:15},
  bottom:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},offerCount:{fontSize:14,fontWeight:"900",color:BLUE},offerCountLow:{color:"#B45309"},date:{fontSize:11,color:"#94A3B8",marginTop:4},
  detail:{flexDirection:"row",alignItems:"center"},detailText:{fontSize:13,fontWeight:"800",color:BLUE},empty:{alignItems:"center",paddingTop:90},emptyTitle:{fontSize:17,fontWeight:"900",color:"#475569",marginTop:14},emptySub:{fontSize:13,color:"#94A3B8",marginTop:7}
});
