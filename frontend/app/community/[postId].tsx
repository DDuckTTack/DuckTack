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
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import ReportModal from "../../src/components/ReportModal";
import { getOrCreateConversation } from "../../src/api/message";
import {
  getPost,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  likePost,
  unlikePost,
  deletePost,
  reportContent,
  BOARD_TYPE_LABELS,
  REPORT_REASON_LABELS,
  REPORT_REASON_ORDER,
  PostDetail,
  CommentItem,
  ReportReason,
  ReportTargetType,
} from "../../src/api/community";

const C = {
  primary: "#4F46E5",
  primaryBg: "#EDEDFF",
  primaryDim: "#C7D2FE",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  danger: "#DC2626",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ReportTarget = { type: ReportTargetType; id: number };

export default function CommunityPostDetail() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  const [commentInput, setCommentInput] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("SPAM");
  const [reportDetail, setReportDetail] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const [postData, commentData] = await Promise.all([
        getPost(postId),
        getComments(postId),
      ]);
      setPost(postData);
      setComments(commentData);
    } catch (e) {
      console.log("게시글 조회 실패:", e);
      Alert.alert("불러오기 실패", "게시글을 찾을 수 없습니다.");
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function loadComments() {
    try {
      const data = await getComments(postId);
      setComments(data);
    } catch (e) {
      console.log("댓글 조회 실패:", e);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function handleToggleLike() {
    if (!post || liking) return;
    try {
      setLiking(true);
      const result = post.likedByMe ? await unlikePost(post.postId) : await likePost(post.postId);
      setPost((prev) => (prev ? { ...prev, likeCount: result.likeCount, likedByMe: result.likedByMe } : prev));
    } catch (e) {
      console.log("좋아요 처리 실패:", e);
    } finally {
      setLiking(false);
    }
  }

  function handleDeletePost() {
    if (!post) return;
    Alert.alert("게시글 삭제", "이 게시글을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingPost(true);
            await deletePost(post.postId);
            Alert.alert("삭제 완료", "게시글이 삭제되었습니다.");
            router.back();
          } catch (e: any) {
            console.log("게시글 삭제 실패:", e);
            Alert.alert("삭제 실패", e?.response?.data?.message || "다시 시도해주세요.");
          } finally {
            setDeletingPost(false);
          }
        },
      },
    ]);
  }

  function startEditComment(comment: CommentItem) {
    setEditingCommentId(comment.commentId);
    setCommentInput(comment.content);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setCommentInput("");
  }

  async function handleSubmitComment() {
    const text = commentInput.trim();
    if (!text) {
      Alert.alert("댓글을 입력해주세요");
      return;
    }
    try {
      setSubmittingComment(true);
      if (editingCommentId) {
        await updateComment(editingCommentId, text);
      } else {
        await createComment(postId, text);
        setPost((prev) => (prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev));
      }
      setCommentInput("");
      setEditingCommentId(null);
      await loadComments();
    } catch (e: any) {
      console.log("댓글 등록/수정 실패:", e);
      Alert.alert("실패", e?.response?.data?.message || "다시 시도해주세요.");
    } finally {
      setSubmittingComment(false);
    }
  }

  function handleDeleteComment(commentId: number) {
    Alert.alert("댓글 삭제", "이 댓글을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingCommentId(commentId);
            await deleteComment(commentId);
            setPost((prev) => (prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev));
            if (editingCommentId === commentId) cancelEditComment();
            await loadComments();
          } catch (e: any) {
            console.log("댓글 삭제 실패:", e);
            Alert.alert("삭제 실패", e?.response?.data?.message || "다시 시도해주세요.");
          } finally {
            setDeletingCommentId(null);
          }
        },
      },
    ]);
  }

  async function messageUser(targetUserId: number | string) {
    try {
      const conversation = await getOrCreateConversation({ targetUserId });
      router.push(`/messages/${conversation.conversationId}`);
    } catch (e: any) {
      console.log("쪽지 생성 실패:", e);
      Alert.alert("쪽지 보내기 실패", e?.response?.data?.message || "다시 시도해주세요.");
    }
  }

  function handleMessageAuthor() {
    if (!post) return;
    messageUser(post.authorId);
  }

  function openReport(target: ReportTarget) {
    setReportReason("SPAM");
    setReportDetail("");
    setReportTarget(target);
  }

  function closeReport() {
    setReportTarget(null);
    setReportDetail("");
  }

  async function handleSubmitReport() {
    if (!reportTarget || !post) return;
    try {
      setReportSubmitting(true);
      await reportContent({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        postId: post.postId,
        commentId: reportTarget.type === "COMMENT" ? reportTarget.id : undefined,
        reason: reportReason,
        detail: reportDetail.trim() || undefined,
      });
      Alert.alert("신고 접수", "신고가 접수되었습니다.");
      closeReport();
    } catch (e: any) {
      console.log("신고 실패:", e);
      Alert.alert("신고 실패", e?.response?.data?.message || "이미 신고했거나 처리할 수 없습니다.");
    } finally {
      setReportSubmitting(false);
    }
  }

  if (loading || !post) {
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

        {/* 헤더 */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={C.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>게시글</Text>
          <View style={styles.headerActions}>
            {post.editable && (
                <Pressable
                    onPress={() =>
                        router.push({
                          pathname: "/community/write",
                          params: { postId: String(post.postId), mode: "edit" },
                        })
                    }
                    style={styles.headerIconBtn}
                >
                  <Feather name="edit-3" size={18} color={C.primary} />
                </Pressable>
            )}
            {post.deletable && (
                <Pressable onPress={handleDeletePost} disabled={deletingPost} style={styles.headerIconBtn}>
                  {deletingPost ? (
                      <ActivityIndicator size="small" color={C.danger} />
                  ) : (
                      <Feather name="trash-2" size={18} color={C.danger} />
                  )}
                </Pressable>
            )}
          </View>
        </View>

        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
        >
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* 게시글 본문 */}
            <View style={styles.postCard}>
              <View style={styles.postTopRow}>
                <View style={styles.boardBadge}>
                  <Text style={styles.boardBadgeText}>{BOARD_TYPE_LABELS[post.boardType]}</Text>
                </View>
                {post.regionName ? <Text style={styles.tagText}>📍 {post.regionName}</Text> : null}
                {post.productName ? (
                    <Text style={styles.tagText} numberOfLines={1}>
                      🧴 {post.productName}
                    </Text>
                ) : null}
              </View>

              <Text style={styles.postTitle}>{post.title}</Text>

              <View style={styles.postMetaBlock}>
                <View style={styles.postAuthorRow}>
                  <Text style={styles.postAuthorText}>{post.authorName}</Text>
                  {!post.editable && (
                      <Pressable onPress={handleMessageAuthor} style={styles.authorMessageBtn} hitSlop={8}>
                        <Feather name="mail" size={13} color={C.primary} />
                        <Text style={styles.authorMessageBtnText}>쪽지</Text>
                      </Pressable>
                  )}
                </View>
                <View style={styles.postSubMetaRow}>
                  <Text style={styles.postMetaText}>{formatDate(post.createdAt)}</Text>
                  <Text style={styles.postMetaText}>조회 {post.viewCount}</Text>
                </View>
              </View>

              <Text style={styles.postContent}>{post.content}</Text>

              <View style={styles.postActionRow}>
                <Pressable onPress={handleToggleLike} disabled={liking} style={styles.likeBtn}>
                  <Feather
                      name="heart"
                      size={16}
                      color={post.likedByMe ? "#EF4444" : C.sub}
                      style={post.likedByMe ? { opacity: 1 } : { opacity: 0.8 }}
                  />
                  <Text style={[styles.likeText, post.likedByMe && { color: "#EF4444" }]}>
                    {post.likeCount}
                  </Text>
                </Pressable>

                {!post.editable && (
                    <Pressable
                        onPress={() => openReport({ type: "POST", id: post.postId })}
                        style={styles.reportBtn}
                    >
                      <Feather name="flag" size={14} color={C.sub} />
                      <Text style={styles.reportText}>신고</Text>
                    </Pressable>
                )}
              </View>
            </View>

            {/* 댓글 목록 */}
            <View style={styles.commentSection}>
              <Text style={styles.commentSectionTitle}>댓글 {comments.length}</Text>

              {comments.length === 0 ? (
                  <View style={styles.commentEmptyBox}>
                    <Text style={styles.commentEmptyText}>첫 번째 댓글을 남겨보세요!</Text>
                  </View>
              ) : (
                  <View style={{ gap: 10 }}>
                    {comments.map((c) => {
                      const deleting = deletingCommentId === c.commentId;
                      return (
                          <View key={c.commentId} style={styles.commentCard}>
                            <View style={styles.commentHeaderRow}>
                              <Text style={styles.commentAuthor} numberOfLines={1}>
                                {c.authorName}
                              </Text>
                              {c.mine && (
                                  <View style={styles.myBadge}>
                                    <Text style={styles.myBadgeText}>내 댓글</Text>
                                  </View>
                              )}
                              <Text style={styles.commentDate}>{formatDate(c.createdAt)}</Text>
                            </View>

                            <Text style={styles.commentContent}>{c.content}</Text>

                            <View style={styles.commentActionRow}>
                              {c.mine ? (
                                  <>
                                    <Pressable onPress={() => startEditComment(c)} style={styles.commentActionBtn}>
                                      <Feather name="edit-3" size={12} color={C.primary} />
                                      <Text style={styles.commentActionText}>수정</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => handleDeleteComment(c.commentId)}
                                        disabled={deleting}
                                        style={styles.commentActionBtn}
                                    >
                                      {deleting ? (
                                          <ActivityIndicator size="small" color={C.danger} />
                                      ) : (
                                          <>
                                            <Feather name="trash-2" size={12} color={C.danger} />
                                            <Text style={[styles.commentActionText, { color: C.danger }]}>
                                              삭제
                                            </Text>
                                          </>
                                      )}
                                    </Pressable>
                                  </>
                              ) : (
                                  <>
                                    <Pressable
                                        onPress={() => messageUser(c.authorId)}
                                        style={styles.commentActionBtn}
                                    >
                                      <Feather name="mail" size={12} color={C.primary} />
                                      <Text style={[styles.commentActionText, { color: C.primary }]}>쪽지</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => openReport({ type: "COMMENT", id: c.commentId })}
                                        style={styles.commentActionBtn}
                                    >
                                      <Feather name="flag" size={12} color={C.sub} />
                                      <Text style={styles.commentActionText}>신고</Text>
                                    </Pressable>
                                  </>
                              )}
                            </View>
                          </View>
                      );
                    })}
                  </View>
              )}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* 댓글 입력바 */}
          <View
              style={[
                styles.commentInputBar,
                { paddingBottom: keyboardVisible ? 12 : Math.max(insets.bottom, 12) },
              ]}
          >
            {editingCommentId && (
                <Pressable onPress={cancelEditComment} style={styles.cancelEditBtn}>
                  <Text style={styles.cancelEditText}>취소</Text>
                </Pressable>
            )}
            <TextInput
                style={styles.commentInput}
                placeholder={editingCommentId ? "댓글 수정하기" : "댓글을 입력하세요"}
                placeholderTextColor="#94A3B8"
                value={commentInput}
                onChangeText={setCommentInput}
                multiline
                maxLength={1000}
            />
            <Pressable
                onPress={handleSubmitComment}
                disabled={submittingComment}
                style={[styles.commentSubmitBtn, submittingComment && { opacity: 0.6 }]}
            >
              {submittingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
              ) : (
                  <Feather name="send" size={16} color="#fff" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        {/* 신고 모달 */}
        <ReportModal
            visible={reportTarget !== null}
            reasonOrder={REPORT_REASON_ORDER}
            reasonLabels={REPORT_REASON_LABELS}
            selectedReason={reportReason}
            onSelectReason={setReportReason}
            detail={reportDetail}
            onChangeDetail={setReportDetail}
            submitting={reportSubmitting}
            onCancel={closeReport}
            onSubmit={handleSubmitReport}
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
  headerActions: { flexDirection: "row", gap: 8, minWidth: 40, justifyContent: "flex-end" },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },

  postCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  postTopRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
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

  postTitle: { fontSize: 19, fontWeight: "900", color: C.text, lineHeight: 26 },
  postMetaBlock: { gap: 4 },
  postMetaText: { fontSize: 12, color: "#94A3B8" },
  postAuthorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  postAuthorText: { fontSize: 13, fontWeight: "700", color: C.text },
  postSubMetaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorMessageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.primaryBg,
    borderWidth: 1,
    borderColor: C.primaryDim,
  },
  authorMessageBtnText: { fontSize: 11, fontWeight: "700", color: C.primary },
  postContent: { fontSize: 15, color: "#334155", lineHeight: 23 },

  postActionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  likeText: { fontSize: 13, fontWeight: "800", color: C.sub },
  reportBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 8 },
  reportText: { fontSize: 12, fontWeight: "700", color: C.sub },

  commentSection: { gap: 10 },
  commentSectionTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  commentEmptyBox: { paddingVertical: 30, alignItems: "center" },
  commentEmptyText: { fontSize: 13, color: "#94A3B8" },

  commentCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  commentHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  commentAuthor: { fontSize: 13, fontWeight: "700", color: C.text, maxWidth: 130 },
  myBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: C.primaryBg,
    borderWidth: 1,
    borderColor: C.primaryDim,
  },
  myBadgeText: { fontSize: 9, fontWeight: "800", color: C.primary },
  commentDate: { fontSize: 11, color: "#94A3B8", marginLeft: "auto" },
  commentContent: { fontSize: 14, color: "#334155", lineHeight: 20 },
  commentActionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 2 },
  commentActionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  commentActionText: { fontSize: 12, fontWeight: "700", color: C.primary },

  commentInputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cancelEditBtn: { paddingVertical: 10, paddingHorizontal: 4 },
  cancelEditText: { fontSize: 12, fontWeight: "700", color: C.sub },
  commentInput: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
  },
  commentSubmitBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center" },
});
