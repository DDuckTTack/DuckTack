import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, FlatList, Alert } from "react-native";
import { router, Stack, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { listMyCoupons, useCoupon, CouponItem } from "../src/api/coupon";

const C = {
  primary: "#4F46E5",
  primaryBg: "#EDEDFF",
  primaryDim: "#C7D2FE",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  card: "#FFFFFF",
};

const TABS = [
  { key: "AVAILABLE", label: "사용 가능" },
  { key: "USED", label: "사용 완료" },
] as const;

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function CouponsScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("AVAILABLE");
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingId, setUsingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listMyCoupons();
      setCoupons(result);
    } catch (e) {
      console.log("쿠폰 목록 조회 실패:", e);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
      useCallback(() => {
        load();
      }, [load])
  );

  function handleUse(coupon: CouponItem) {
    Alert.alert(
        "쿠폰 사용",
        `${coupon.companyName}에서 이 쿠폰(${coupon.discountPercent}% 할인)을 제시하고 사용 처리할까요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "사용 처리",
            onPress: async () => {
              try {
                setUsingId(coupon.couponId);
                await useCoupon(coupon.couponId);
                await load();
              } catch (e: any) {
                console.log("쿠폰 사용 처리 실패:", e);
                Alert.alert("처리 실패", e?.response?.data?.message || "다시 시도해주세요.");
              } finally {
                setUsingId(null);
              }
            },
          },
        ]
    );
  }

  const filtered = coupons.filter((c) => c.status === tab);

  return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={C.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>내 쿠폰함</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabRow}>
          {TABS.map((t) => (
              <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
          ))}
        </View>

        {loading ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator color={C.primary} />
            </View>
        ) : filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="tag" size={40} color="#E2E8F0" />
              <Text style={styles.emptyText}>
                {tab === "AVAILABLE" ? "사용 가능한 쿠폰이 없어요" : "사용한 쿠폰이 없어요"}
              </Text>
              <Text style={styles.emptySubText}>동일 업체를 재방문해 예약을 완료하면 쿠폰이 발급돼요</Text>
            </View>
        ) : (
            <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.couponId)}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                      <View style={styles.cardTopRow}>
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>{item.discountPercent}% 할인</Text>
                        </View>
                        <Text style={styles.cardDate}>
                          {item.status === "AVAILABLE"
                              ? `발급일 ${formatDate(item.issuedAt)}`
                              : `사용일 ${formatDate(item.usedAt)}`}
                        </Text>
                      </View>
                      <Text style={styles.companyName}>{item.companyName}</Text>
                      <Text style={styles.cardDesc}>다음 방문 시 {item.discountPercent}% 할인</Text>

                      {item.status === "AVAILABLE" && (
                          <Pressable
                              style={[styles.useBtn, usingId === item.couponId && { opacity: 0.6 }]}
                              onPress={() => handleUse(item)}
                              disabled={usingId === item.couponId}
                          >
                            {usingId === item.couponId ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.useBtnText}>사용 처리</Text>
                            )}
                          </Pressable>
                      )}
                    </View>
                )}
            />
        )}
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.text, flex: 1, textAlign: "center" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },

  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { fontSize: 14, fontWeight: "700", color: C.sub },
  tabTextActive: { color: "#fff" },

  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  discountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.primaryBg,
    borderWidth: 1,
    borderColor: C.primaryDim,
  },
  discountBadgeText: { fontSize: 12, fontWeight: "800", color: C.primary },
  cardDate: { fontSize: 11, color: "#94A3B8" },
  companyName: { fontSize: 17, fontWeight: "800", color: C.text },
  cardDesc: { fontSize: 13, color: C.sub },

  useBtn: {
    marginTop: 4,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  useBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 40 },
  emptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center" },
  emptySubText: { fontSize: 12, color: "#CBD5E1", textAlign: "center" },
});
