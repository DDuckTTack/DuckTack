import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, FlatList, Alert } from "react-native";
import { router, Stack, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import {
  listConversations,
  listReservedCompanies,
  getOrCreateConversation,
  parseMessageTimestamp,
  ConversationItem,
  ConversationType,
  ReservedCompanyItem,
} from "../../src/api/message";

const C = {
  primary: "#4F46E5",
  primaryBg: "#EDEDFF",
  primaryDim: "#C7D2FE",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  danger: "#EF4444",
};

const TABS: { key: ConversationType; label: string }[] = [
  { key: "USER", label: "사용자" },
  { key: "COMPANY", label: "업체" },
];

function formatTime(value: string | null) {
  const date = parseMessageTimestamp(value);
  if (!date) return "";
  const now = new Date();
  const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

  return sameDay
      ? date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export default function MessagesInbox() {
  const [tab, setTab] = useState<ConversationType>("USER");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [reservedCompanies, setReservedCompanies] = useState<ReservedCompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingCompanyId, setOpeningCompanyId] = useState<number | null>(null);

  const load = useCallback(async (type: ConversationType) => {
    setLoading(true);

    const [conversationResult, companyResult] = await Promise.allSettled([
      listConversations({ type }),
      type === "COMPANY" ? listReservedCompanies() : Promise.resolve([]),
    ]);

    setConversations(
        conversationResult.status === "fulfilled" ? conversationResult.value.content : []
    );
    setReservedCompanies(
        companyResult.status === "fulfilled" ? companyResult.value : []
    );
    setLoading(false);
  }, []);

  useFocusEffect(
      useCallback(() => {
        load(tab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [tab])
  );

  const openCompanyConversation = useCallback(async (companyId: number) => {
    if (openingCompanyId !== null) return;

    try {
      setOpeningCompanyId(companyId);
      const conversation = await getOrCreateConversation({ targetCompanyId: companyId });
      router.push(`/messages/${conversation.conversationId}`);
    } catch (e: any) {
      Alert.alert("쪽지 시작 실패", e?.response?.data?.message || "잠시 후 다시 시도해주세요.");
    } finally {
      setOpeningCompanyId(null);
    }
  }, [openingCompanyId]);

  return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={C.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>쪽지함</Text>
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
        ) : conversations.length === 0 && (tab !== "COMPANY" || reservedCompanies.length === 0) ? (
            <View style={styles.emptyBox}>
              <Feather name="mail" size={40} color="#E2E8F0" />
              <Text style={styles.emptyText}>
                {tab === "USER" ? "사용자와 주고받은 쪽지가 없어요" : "업체와 주고받은 쪽지가 없어요"}
              </Text>
            </View>
        ) : (
            <FlatList
                data={conversations}
                keyExtractor={(item) => String(item.conversationId)}
                contentContainerStyle={styles.list}
                ListHeaderComponent={tab === "COMPANY" && reservedCompanies.length > 0 ? (
                    <View style={styles.reservedSection}>
                      <Text style={styles.sectionTitle}>예약한 업체</Text>
                      <Text style={styles.sectionDescription}>예약 이력이 있는 업체에 바로 쪽지를 보낼 수 있어요.</Text>
                      {reservedCompanies.map((company) => (
                          <Pressable
                              key={company.companyId}
                              style={styles.reservedCard}
                              disabled={openingCompanyId !== null}
                              onPress={() => openCompanyConversation(company.companyId)}
                          >
                            <View style={styles.reservedIcon}>
                              <Feather name="briefcase" size={18} color={C.primary} />
                            </View>
                            <View style={styles.reservedInfo}>
                              <Text style={styles.cardName} numberOfLines={1}>{company.companyName}</Text>
                              <Text style={styles.reservedMeta} numberOfLines={1}>
                                {company.address || "업체 주소 정보 없음"}
                              </Text>
                            </View>
                            {openingCompanyId === company.companyId ? (
                                <ActivityIndicator size="small" color={C.primary} />
                            ) : (
                                <View style={styles.messageButton}>
                                  <Feather name="message-circle" size={15} color="#fff" />
                                  <Text style={styles.messageButtonText}>쪽지</Text>
                                </View>
                            )}
                          </Pressable>
                      ))}
                      <Text style={styles.sectionTitle}>최근 쪽지</Text>
                    </View>
                ) : null}
                ListEmptyComponent={tab === "COMPANY" ? (
                    <Text style={styles.noConversationText}>아직 주고받은 쪽지가 없어요.</Text>
                ) : null}
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.card}
                        onPress={() => router.push(`/messages/${item.conversationId}`)}
                    >
                      <View style={styles.avatar}>
                        <Feather
                            name={item.otherIsCompany ? "briefcase" : "user"}
                            size={18}
                            color={C.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.cardTopRow}>
                          <Text style={styles.cardName} numberOfLines={1}>
                            {item.otherDisplayName}
                          </Text>
                          <Text style={styles.cardTime}>{formatTime(item.lastMessageAt)}</Text>
                        </View>
                        <Text style={styles.cardPreview} numberOfLines={1}>
                          {item.lastMessagePreview || "대화를 시작해보세요"}
                        </Text>
                      </View>
                      {item.unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>
                              {item.unreadCount > 99 ? "99+" : item.unreadCount}
                            </Text>
                          </View>
                      )}
                    </Pressable>
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

  list: { padding: 16, gap: 10 },
  reservedSection: { gap: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: C.text, marginTop: 2 },
  sectionDescription: { fontSize: 12, color: C.sub, marginTop: -4, marginBottom: 2 },
  reservedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    borderRadius: 16,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: C.primaryDim,
  },
  reservedIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  reservedInfo: { flex: 1 },
  reservedMeta: { fontSize: 12, color: C.sub, marginTop: 3 },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.primary,
  },
  messageButtonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  noConversationText: { textAlign: "center", color: "#94A3B8", paddingVertical: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardName: { fontSize: 15, fontWeight: "800", color: C.text, flexShrink: 1, marginRight: 8 },
  cardTime: { fontSize: 11, color: "#94A3B8" },
  cardPreview: { fontSize: 13, color: C.sub, marginTop: 3 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: C.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  emptyText: { fontSize: 14, color: "#94A3B8" },
});
