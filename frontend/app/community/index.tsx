import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import {
  listPosts,
  BOARD_TYPE_LABELS,
  BOARD_TYPE_ORDER,
  BoardType,
  PostListItem,
  SortOption,
} from "../../src/api/community";
import RegionPicker from "../../src/components/RegionPicker";

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

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "latest", label: "최신순" },
  { key: "views", label: "조회순" },
  { key: "likes", label: "인기순" },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function CommunityBoard() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedBoard, setSelectedBoard] = useState<BoardType | "ALL">("ALL");
  const [sort, setSort] = useState<SortOption>("latest");
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [region, setRegion] = useState<{ regionCode: string; regionName: string } | null>(null);
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);

  async function load(reset: boolean) {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      const targetPage = reset ? 0 : page + 1;
      const result = await listPosts({
        boardType: selectedBoard === "ALL" ? undefined : selectedBoard,
        keyword: submittedKeyword || undefined,
        regionCode: selectedBoard === "LOCAL" ? region?.regionCode : undefined,
        page: targetPage,
        sort,
      });
      setPosts((prev) => (reset ? result.content : [...prev, ...result.content]));
      setPage(result.number);
      setHasMore(!result.last);
    } catch (e) {
      console.log("커뮤니티 목록 조회 실패:", e);
      if (reset) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (selectedBoard !== "LOCAL") setRegion(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoard]);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoard, sort, submittedKeyword, region]);

  function handleSearchSubmit() {
    setSubmittedKeyword(keyword.trim());
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>커뮤니티</Text>
        <Pressable onPress={() => router.push("/community/my")} style={styles.myBtn}>
          <Feather name="user" size={18} color={C.primary} />
        </Pressable>
      </View>

      {/* 게시판 칩 */}
      <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipScrollContent}
      >
        <Pressable
            onPress={() => setSelectedBoard("ALL")}
            style={[styles.chip, selectedBoard === "ALL" && styles.chipActive]}
        >
          <Text style={[styles.chipText, selectedBoard === "ALL" && styles.chipTextActive]}>
            전체
          </Text>
        </Pressable>
        {BOARD_TYPE_ORDER.map((type) => (
            <Pressable
                key={type}
                onPress={() => setSelectedBoard(type)}
                style={[styles.chip, selectedBoard === type && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedBoard === type && styles.chipTextActive]}>
                {BOARD_TYPE_LABELS[type]}
              </Text>
            </Pressable>
        ))}
      </ScrollView>

      {/* 지역 필터 (지역별 게시판일 때만) */}
      {selectedBoard === "LOCAL" && (
          <View style={styles.regionFilterRow}>
            <Pressable style={styles.regionFilterBtn} onPress={() => setRegionPickerVisible(true)}>
              <Feather name="map-pin" size={13} color={C.primary} />
              <Text style={styles.regionFilterText}>{region ? region.regionName : "전체 지역"}</Text>
              <Feather name="chevron-down" size={13} color={C.primary} />
            </Pressable>
            {region && (
                <Pressable onPress={() => setRegion(null)} style={styles.regionClearBtn} hitSlop={8}>
                  <Text style={styles.regionClearText}>전체보기</Text>
                </Pressable>
            )}
          </View>
      )}

      {/* 검색바 */}
      <View style={styles.searchRow}>
        <Feather name="search" size={16} color={C.sub} />
        <TextInput
            style={styles.searchInput}
            placeholder="제목, 내용 검색"
            placeholderTextColor="#94A3B8"
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
        />
        {keyword.length > 0 && (
            <Pressable
                onPress={() => {
                  setKeyword("");
                  setSubmittedKeyword("");
                }}
                hitSlop={8}
            >
              <Feather name="x" size={16} color={C.sub} />
            </Pressable>
        )}
      </View>

      {/* 정렬 */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
            <Pressable key={opt.key} onPress={() => setSort(opt.key)} style={styles.sortItem}>
              <Text style={[styles.sortText, sort === opt.key && styles.sortTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator color={C.primary} />
            </View>
        ) : posts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="message-square" size={40} color="#E2E8F0" />
              <Text style={styles.emptyText}>
                {submittedKeyword ? "검색 결과가 없어요" : "아직 등록된 게시글이 없어요"}
              </Text>
            </View>
        ) : (
            <View style={styles.list}>
              {posts.map((item) => (
                  <Pressable
                      key={item.postId}
                      style={styles.card}
                      onPress={() => router.push(`/community/${item.postId}`)}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.boardBadge}>
                        <Text style={styles.boardBadgeText}>{BOARD_TYPE_LABELS[item.boardType]}</Text>
                      </View>
                      {item.regionName ? (
                          <Text style={styles.tagText}>📍 {item.regionName}</Text>
                      ) : null}
                      {item.productName ? (
                          <Text style={styles.tagText} numberOfLines={1}>
                            🧴 {item.productName}
                          </Text>
                      ) : null}
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardPreview} numberOfLines={2}>
                      {item.contentPreview}
                    </Text>

                    <View style={styles.metaRow}>
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.authorName} · {formatDate(item.createdAt)}
                      </Text>
                      <View style={styles.metaStats}>
                        <Feather name="eye" size={12} color={C.sub} />
                        <Text style={styles.metaStatText}>{item.viewCount}</Text>
                        <Feather name="heart" size={12} color={C.sub} style={{ marginLeft: 8 }} />
                        <Text style={styles.metaStatText}>{item.likeCount}</Text>
                        <Feather
                            name="message-circle"
                            size={12}
                            color={C.sub}
                            style={{ marginLeft: 8 }}
                        />
                        <Text style={styles.metaStatText}>{item.commentCount}</Text>
                      </View>
                    </View>
                  </Pressable>
              ))}

              {hasMore && (
                  <Pressable
                      style={[styles.loadMoreBtn, loadingMore && { opacity: 0.6 }]}
                      onPress={() => load(false)}
                      disabled={loadingMore}
                  >
                    {loadingMore ? (
                        <ActivityIndicator size="small" color={C.primary} />
                    ) : (
                        <Text style={styles.loadMoreText}>더보기</Text>
                    )}
                  </Pressable>
              )}
            </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* 글쓰기 플로팅 버튼 */}
      <Pressable
          style={styles.fab}
          onPress={() =>
              router.push({
                pathname: "/community/write",
                params: { boardType: selectedBoard !== "ALL" ? selectedBoard : "FREE" },
              })
          }
      >
        <Feather name="edit-2" size={20} color="#fff" />
      </Pressable>

      <RegionPicker
          visible={regionPickerVisible}
          onClose={() => setRegionPickerVisible(false)}
          onSelect={(selected) => {
            setRegion(selected);
            setRegionPickerVisible(false);
          }}
      />
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
  myBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },

  chipScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 56,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  chipScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, fontWeight: "700", color: C.sub },
  chipTextActive: { color: "#fff" },

  regionFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
  },
  regionFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.primaryBg,
    borderWidth: 1,
    borderColor: C.primaryDim,
  },
  regionFilterText: { fontSize: 12, fontWeight: "700", color: C.primary },
  regionClearBtn: { paddingVertical: 6 },
  regionClearText: { fontSize: 12, fontWeight: "700", color: C.sub },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },

  sortRow: {
    flexDirection: "row",
    gap: 14,
    marginHorizontal: 20,
    marginTop: 10,
  },
  sortItem: { paddingVertical: 4 },
  sortText: { fontSize: 13, fontWeight: "600", color: C.sub },
  sortTextActive: { color: C.primary, fontWeight: "800" },

  scroll: { paddingHorizontal: 20, paddingTop: 14 },

  list: { gap: 12 },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  boardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.primaryBg,
    borderWidth: 1,
    borderColor: C.primaryDim,
  },
  boardBadgeText: { fontSize: 11, fontWeight: "800", color: C.primary },
  tagText: { fontSize: 11, color: C.sub, fontWeight: "600" },

  cardTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  cardPreview: { fontSize: 13, color: "#475569", lineHeight: 19 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  metaText: { fontSize: 12, color: "#94A3B8", flexShrink: 1, marginRight: 8 },
  metaStats: { flexDirection: "row", alignItems: "center" },
  metaStatText: { fontSize: 12, color: C.sub, marginLeft: 3, fontWeight: "600" },

  loadMoreBtn: {
    marginTop: 4,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: { fontSize: 13, fontWeight: "700", color: C.sub },

  emptyBox: { paddingVertical: 60, alignItems: "center", gap: 14 },
  emptyText: { fontSize: 15, color: "#94A3B8", textAlign: "center", lineHeight: 22 },

  fab: {
    position: "absolute",
    right: 20,
    bottom: (Platform.OS === "ios" ? 90 : 70) + 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
});
