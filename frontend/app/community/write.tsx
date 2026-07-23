import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import {
  createPost,
  updatePost,
  getPost,
  BOARD_TYPE_LABELS,
  BOARD_TYPE_ORDER,
  BoardType,
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

export default function CommunityWrite() {
  const { postId, mode, boardType: initialBoardType } = useLocalSearchParams<{
    postId?: string;
    mode?: string;
    boardType?: string;
  }>();

  const isEdit = mode === "edit" && !!postId;

  const [boardType, setBoardType] = useState<BoardType>(
      (initialBoardType as BoardType) || "FREE"
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [productName, setProductName] = useState("");
  const [region, setRegion] = useState<{ regionCode: string; regionName: string } | null>(null);
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const post = await getPost(postId!);
        setBoardType(post.boardType);
        setTitle(post.title);
        setContent(post.content);
        setProductName(post.productName || "");
        if (post.regionCode && post.regionName) {
          setRegion({ regionCode: post.regionCode, regionName: post.regionName });
        }
      } catch (e) {
        console.log("게시글 조회 실패:", e);
        Alert.alert("불러오기 실패", "게시글 정보를 가져오지 못했습니다.");
        router.back();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  function validate(): string | null {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!isEdit && !boardType) return "게시판을 선택해주세요.";
    if (boardType === "LOCAL" && !region) return "지역을 선택해주세요.";
    if (trimmedTitle.length === 0) return "제목을 입력해주세요.";
    if (trimmedTitle.length > 100) return "제목은 100자 이하로 입력해주세요.";
    if (trimmedContent.length === 0) return "내용을 입력해주세요.";
    if (trimmedContent.length > 3000) return "내용은 3000자 이하로 입력해주세요.";
    if (productName.trim().length > 120) return "제품명은 120자 이하로 입력해주세요.";
    return null;
  }

  async function handleSubmit() {
    const error = validate();
    if (error) {
      Alert.alert(error);
      return;
    }

    const req = {
      boardType,
      title: title.trim(),
      content: content.trim(),
      ...(boardType === "LOCAL" && region ? region : {}),
      ...(boardType === "DIY_REVIEW" && productName.trim()
          ? { productName: productName.trim() }
          : {}),
    };

    try {
      setSubmitting(true);
      if (isEdit) {
        await updatePost(postId!, req);
        Alert.alert("수정 완료", "게시글이 수정되었습니다.");
        router.back();
      } else {
        const created = await createPost(req);
        Alert.alert("등록 완료", "게시글이 등록되었습니다.");
        router.replace(`/community/${created.postId}`);
      }
    } catch (e: any) {
      console.log(isEdit ? "게시글 수정 실패:" : "게시글 등록 실패:", e);
      Alert.alert(isEdit ? "수정 실패" : "등록 실패", e?.response?.data?.message || "다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
        <SafeAreaView edges={["top"]} style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.emptyBox}>
            <ActivityIndicator color={C.primary} />
          </View>
        </SafeAreaView>
    );
  }

  return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={C.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>{isEdit ? "글 수정" : "글쓰기"}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!isEdit && (
              <View style={styles.section}>
                <Text style={styles.label}>게시판</Text>
                <View style={styles.boardChipRow}>
                  {BOARD_TYPE_ORDER.map((type) => (
                      <Pressable
                          key={type}
                          onPress={() => setBoardType(type)}
                          style={[styles.boardChip, boardType === type && styles.boardChipActive]}
                      >
                        <Text
                            style={[
                              styles.boardChipText,
                              boardType === type && styles.boardChipTextActive,
                            ]}
                        >
                          {BOARD_TYPE_LABELS[type]}
                        </Text>
                      </Pressable>
                  ))}
                </View>
              </View>
          )}

          {boardType === "LOCAL" && (
              <Pressable style={styles.regionNotice} onPress={() => setRegionPickerVisible(true)}>
                <Feather name="map-pin" size={14} color={C.primary} />
                <Text style={styles.regionNoticeText}>
                  {region ? `지역: ${region.regionName}` : "지역을 선택해주세요"}
                </Text>
                <Feather name="chevron-right" size={14} color={C.primary} style={{ marginLeft: "auto" }} />
              </Pressable>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>제목</Text>
            <TextInput
                style={styles.titleInput}
                placeholder="제목을 입력해주세요"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
            />
            <Text style={styles.charCount}>{title.length} / 100</Text>
          </View>

          {boardType === "DIY_REVIEW" && (
              <View style={styles.section}>
                <Text style={styles.label}>사용한 제품명 (선택)</Text>
                <TextInput
                    style={styles.titleInput}
                    placeholder="예: OO 곰팡이 제거제"
                    placeholderTextColor="#94A3B8"
                    value={productName}
                    onChangeText={setProductName}
                    maxLength={120}
                />
              </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>내용</Text>
            <TextInput
                style={styles.contentInput}
                placeholder="내용을 입력해주세요"
                placeholderTextColor="#94A3B8"
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={3000}
                textAlignVertical="top"
            />
            <Text style={styles.charCount}>{content.length} / 3000</Text>
          </View>

          <Pressable
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
          >
            {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <Text style={styles.submitText}>{isEdit ? "수정 완료" : "등록하기"}</Text>
            )}
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>

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

  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 18 },

  section: { gap: 8 },
  label: { fontSize: 13, fontWeight: "700", color: C.sub },

  boardChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  boardChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  boardChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  boardChipText: { fontSize: 13, fontWeight: "700", color: C.sub },
  boardChipTextActive: { color: "#fff" },

  regionNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.primaryBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.primaryDim,
  },
  regionNoticeText: { fontSize: 13, fontWeight: "700", color: C.primary },

  titleInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.card,
  },
  contentInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: C.text,
    minHeight: 180,
    lineHeight: 21,
    backgroundColor: C.card,
  },
  charCount: { fontSize: 12, color: "#94A3B8", textAlign: "right" },

  submitBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center" },
});
