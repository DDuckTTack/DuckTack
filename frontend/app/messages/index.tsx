import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, FlatList } from "react-native";
import { router, Stack, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import {
  listConversations,
  parseMessageTimestamp,
  ConversationItem,
  ConversationType,
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (type: ConversationType) => {
    try {
      setLoading(true);
      const result = await listConversations({ type });
      setConversations(result.content);
    } catch (e) {
      console.log("대화 목록 조회 실패:", e);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
      useCallback(() => {
        load(tab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [tab])
  );

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
        ) : conversations.length === 0 ? (
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
