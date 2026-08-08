import {useState} from "react";
import {ActivityIndicator, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import {Feather} from "@expo/vector-icons";
import {AddressResult, searchAddresses} from "../api/addresses";

export default function AddressSearchModal({visible,onClose,onSelect}:{
  visible:boolean; onClose:()=>void; onSelect:(address:AddressResult)=>void;
}) {
  const [query,setQuery] = useState("");
  const [items,setItems] = useState<AddressResult[]>([]);
  const [loading,setLoading] = useState(false);
  const [searched,setSearched] = useState(false);

  const search = async () => {
    if (query.trim().length < 2) return;
    try { setLoading(true); setItems(await searchAddresses(query)); setSearched(true); }
    finally { setLoading(false); }
  };

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={s.safe}>
      <View style={s.header}><Pressable onPress={onClose} style={s.icon}><Feather name="x" size={22}/></Pressable>
        <Text style={s.title}>주소 검색</Text><View style={{width:42}}/></View>
      <View style={s.content}>
        <Text style={s.guide}>도로명, 건물명 또는 지번을 입력해주세요.</Text>
        <View style={s.searchRow}><TextInput autoFocus returnKeyType="search" onSubmitEditing={search}
          style={s.input} value={query} onChangeText={setQuery} placeholder="예: 테헤란로 123"/>
          <Pressable onPress={search} style={s.button}><Text style={s.buttonText}>검색</Text></Pressable></View>
        {loading ? <ActivityIndicator style={{marginTop:40}} color="#4F46E5"/> :
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.list}>
            {items.map((item,index) => <Pressable key={`${item.roadAddress}-${index}`} style={s.item} onPress={() => {onSelect(item);onClose();}}>
              <View style={s.pin}><Feather name="map-pin" size={17} color="#4F46E5"/></View>
              <View style={{flex:1}}><Text style={s.road}>{item.roadAddress}</Text>
                {!!item.jibunAddress && <Text style={s.jibun}>지번 {item.jibunAddress}</Text>}
                {!!item.postalCode && <Text style={s.zip}>우편번호 {item.postalCode}</Text>}</View>
            </Pressable>)}
            {searched && items.length === 0 && <View style={s.empty}><Text style={s.emptyTitle}>검색 결과가 없습니다.</Text>
              <Text style={s.emptySub}>도로명과 건물 번호를 확인해주세요.</Text></View>}
          </ScrollView>}
      </View>
    </SafeAreaView>
  </Modal>;
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:"#F8FAFC"},header:{height:62,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:18,backgroundColor:"#fff",borderBottomWidth:1,borderBottomColor:"#E2E8F0"},
  icon:{width:42,height:42,alignItems:"center",justifyContent:"center"},title:{fontSize:19,fontWeight:"900"},content:{flex:1,padding:20},guide:{color:"#64748B",marginBottom:13},
  searchRow:{flexDirection:"row",gap:9},input:{flex:1,height:48,borderWidth:1,borderColor:"#CBD5E1",backgroundColor:"#fff",borderRadius:12,paddingHorizontal:14,fontSize:16},
  button:{height:48,paddingHorizontal:19,borderRadius:12,backgroundColor:"#4F46E5",alignItems:"center",justifyContent:"center"},buttonText:{color:"#fff",fontWeight:"900"},
  list:{paddingTop:15,paddingBottom:35},item:{flexDirection:"row",gap:12,backgroundColor:"#fff",borderRadius:14,padding:16,marginBottom:10,borderWidth:1,borderColor:"#E2E8F0"},
  pin:{width:34,height:34,borderRadius:10,backgroundColor:"#EEF2FF",alignItems:"center",justifyContent:"center"},road:{fontSize:15,fontWeight:"800",color:"#0F172A"},jibun:{fontSize:13,color:"#64748B",marginTop:5},zip:{fontSize:12,color:"#94A3B8",marginTop:3},
  empty:{alignItems:"center",paddingTop:55},emptyTitle:{fontWeight:"800",color:"#475569"},emptySub:{color:"#94A3B8",marginTop:6}
});
