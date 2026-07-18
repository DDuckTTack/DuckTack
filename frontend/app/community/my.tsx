import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { listPosts, BOARD_TYPE_LABELS, PostListItem } from "../../src/api/community";
import { getMe } from "../../src/api/users";

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

const MAX_PAGES = 10;
const PAGE_SIZE = 20;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function CommunityMy() {
  const [tab, setTab] = useState<"written" | "commented">("written");
  const [myPosts, setMyPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function scanMyPosts(username: string) {
    const collected: PostListItem[] = [];
    let page = 0;
    while (page < MAX_PAGES) {
      const result = await listPosts({ page, size: PAGE_SIZE, sort: "latest" });
      collected.push(...result.content.filter((p) => p.authorName === username));
      if (result.last) break;
      page += 1;
    }
    return collected;
  }

  async function load() {
    try {
      setLoading(true);
      const meData = await getMe();
      const posts = await scanMyPosts(meData.username);
      setMyPosts(posts);
    } catch (e) {
      console.log("내 활동 조회 실패:", e);
      setMyPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={C.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>내 활동</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabRow}>
          <Pressable
              onPress={() => setTab("written")}
              style={[styles.tabItem, tab === "written" && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, tab === "written" && styles.tabTextActive]}>
              내가 쓴 글
            </Text>
          </Pressable>
          <Pressable
              onPress={() => setTab("commented")}
              style={[styles.tabItem, tab === "commented" && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, tab === "commented" && styles.tabTextActive]}>
              내가 댓글단 글
            </Text>
          </Pressable>
        </View>

        {tab === "written" ? (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {loading ? (
                  <View style={styles.emptyBox}>
                    <ActivityIndicator color={C.primary} />
                  </View>
              ) : myPosts.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Feather name="edit-2" size={40} color="#E2E8F0" />
                    <Text style={styles.emptyText}>아직 작성한 글이 없어요</Text>
                  </View>
              ) : (
                  <View style={styles.list}>
                    {myPosts.map((item) => (
                        <Pressable
                            key={item.postId}
                            style={styles.card}
                            onPress={() => router.push(`/community/${item.postId}`)}
                        >
                          <View style={styles.cardHeaderRow}>
                            <View style={styles.boardBadge}>
                              <Text style={styles.boardBadgeText}>
                                {BOARD_TYPE_LABELS[item.boardType]}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.cardPreview} numberOfLines={2}>
                            {item.contentPreview}
                          </Text>
                          <Text style={styles.metaText}>
                            {formatDate(item.createdAt)} · 조회 {item.viewCount} · 좋아요{" "}
                            {item.likeCount} · 댓글 {item.commentCount}
                          </Text>
                        </Pressable>
                    ))}
                  </View>
              )}

              {!loading && (
                  <Text style={styles.noticeText}>
                    최근 게시글 기준으로 조회됩니다. 오래된 글은 목록에 나타나지 않을 수 있어요.
                  </Text>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
        ) : (
            <View style={styles.emptyBox}>
              <Feather name="message-circle" size={40} color="#E2E8F0" />
              <Text style={styles.emptyText}>
                댓글단 글 목록은 준비 중입니다.{"\n"}빠른 시일 내 지원 예정입니다.
              </Text>
            </View>
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
  backBtn: {
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
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabItemActive: { borderBottomColor: C.primary },
  tabText: { fontSize: 14, fontWeight: "700", color: C.sub },
  tabTextActive: { color: C.primary },

  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  list: { gap: 12 },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  cardHeaderRow: { flexDirection: "row" },
  boardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.primaryBg,
    borderWidth: 1,
    borderColor: C.primaryDim,
  },
  boardBadgeText: { fontSize: 11, fontWeight: "800", color: C.primary },
  cardTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  cardPreview: { fontSize: 13, color: "#475569", lineHeight: 19 },
  metaText: { fontSize: 12, color: "#94A3B8", marginTop: 4 },

  noticeText: { fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 16 },

  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingVertical: 60 },
  emptyText: { fontSize: 15, color: "#94A3B8", textAlign: "center", lineHeight: 22 },
});
