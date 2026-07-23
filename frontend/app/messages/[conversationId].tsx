import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import ReportModal from "../../src/components/ReportModal";
import {
  getConversation,
  listMessages,
  sendMessage,
  reportMessage,
  parseMessageTimestamp,
  REPORT_REASON_LABELS,
  REPORT_REASON_ORDER,
  ConversationItem,
  MessageItem,
  ReportReason,
} from "../../src/api/message";

const C = {
  primary: "#4F46E5",
  primaryBg: "#EDEDFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  danger: "#EF4444",
};

const POLL_INTERVAL_MS = 1000;

function formatTime(value: string | null) {
  const date = parseMessageTimestamp(value);
  if (!date) return "";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageThread() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("SPAM");
  const [reportDetail, setReportDetail] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const lastIdRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [conv, initialMessages] = await Promise.all([
          getConversation(conversationId),
          listMessages(conversationId),
        ]);
        setConversation(conv);
        setMessages(initialMessages);
        if (initialMessages.length > 0) {
          lastIdRef.current = initialMessages[initialMessages.length - 1].id;
        }
      } catch (e) {
        console.log("대화 조회 실패:", e);
        Alert.alert("불러오기 실패", "대화를 가져오지 못했습니다.");
        router.back();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const poll = useCallback(async () => {
    if (lastIdRef.current === null) return;
    try {
      const newMessages = await listMessages(conversationId, { afterId: lastIdRef.current });
      if (newMessages.length > 0) {
        setMessages((prev) => [...prev, ...newMessages]);
        lastIdRef.current = newMessages[newMessages.length - 1].id;
      }
    } catch (e) {
      console.log("쪽지 폴링 실패:", e);
    }
  }, [conversationId]);

  useEffect(() => {
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;
    try {
      setSending(true);
      const sent = await sendMessage(conversationId, content);
      setMessages((prev) => [...prev, sent]);
      lastIdRef.current = sent.id;
      setInput("");
    } catch (e: any) {
      console.log("쪽지 전송 실패:", e);
      Alert.alert("전송 실패", e?.response?.data?.message || "다시 시도해주세요.");
    } finally {
      setSending(false);
    }
  }

  function toggleSelectionMode() {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  }

  function toggleMessageSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openReport() {
    if (selectedIds.size === 0) return;
    setReportReason("SPAM");
    setReportDetail("");
    setReportVisible(true);
  }

  async function handleSubmitReport() {
    try {
      setReportSubmitting(true);
      await Promise.all(
          Array.from(selectedIds).map((messageId) =>
              reportMessage({
                conversationId,
                messageId,
                reason: reportReason,
                detail: reportDetail.trim() || undefined,
              })
          )
      );
      Alert.alert("신고 접수", "선택한 메시지가 신고 접수되었습니다.");
      setReportVisible(false);
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (e: any) {
      console.log("쪽지 신고 실패:", e);
      Alert.alert("신고 실패", e?.response?.data?.message || "다시 시도해주세요.");
    } finally {
      setReportSubmitting(false);
    }
  }

  if (loading || !conversation) {
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
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={C.primary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectionMode ? "신고할 메시지 선택" : conversation.otherDisplayName}
          </Text>
          <Pressable onPress={toggleSelectionMode} style={styles.iconBtn}>
            <Feather name={selectionMode ? "x" : "flag"} size={18} color={C.sub} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
        >
          <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.scroll}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map((m) => {
              const selected = selectedIds.has(m.id);
              return (
                  <Pressable
                      key={m.id}
                      onPress={() => selectionMode && toggleMessageSelected(m.id)}
                      style={[
                        styles.bubbleRow,
                        m.mine ? styles.bubbleRowMine : styles.bubbleRowOther,
                        selectionMode && styles.bubbleRowSelectable,
                      ]}
                  >
                    {selectionMode && (
                        <View style={[styles.selectBox, selected && styles.selectBoxChecked]}>
                          {selected && <Feather name="check" size={12} color="#fff" />}
                        </View>
                    )}
                    <View style={{ alignItems: m.mine ? "flex-end" : "flex-start" }}>
                      <View style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleOther]}>
                        <Text style={[styles.bubbleText, m.mine && { color: "#fff" }]}>{m.content}</Text>
                      </View>
                      <Text style={styles.bubbleTime}>{formatTime(m.createdAt)}</Text>
                    </View>
                  </Pressable>
              );
            })}
            <View style={{ height: 12 }} />
          </ScrollView>

          {selectionMode ? (
              <View
                  style={[
                    styles.selectionBar,
                    { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 12) },
                  ]}
              >
                <Text style={styles.selectionCountText}>{selectedIds.size}개 선택됨</Text>
                <Pressable
                    onPress={openReport}
                    disabled={selectedIds.size === 0}
                    style={[styles.reportSubmitBtn, selectedIds.size === 0 && { opacity: 0.5 }]}
                >
                  <Feather name="flag" size={14} color="#fff" />
                  <Text style={styles.reportSubmitBtnText}>신고하기</Text>
                </Pressable>
              </View>
          ) : (
              <View
                  style={[
                    styles.inputBar,
                    { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 12) },
                  ]}
              >
                <TextInput
                    style={styles.input}
                    placeholder="쪽지를 입력하세요"
                    placeholderTextColor="#94A3B8"
                    value={input}
                    onChangeText={setInput}
                    multiline
                    maxLength={2000}
                />
                <Pressable
                    onPress={handleSend}
                    disabled={sending || !input.trim()}
                    style={[styles.sendBtn, (sending || !input.trim()) && { opacity: 0.5 }]}
                >
                  {sending ? (
                      <ActivityIndicator size="small" color="#fff" />
                  ) : (
                      <Feather name="send" size={16} color="#fff" />
                  )}
                </Pressable>
              </View>
          )}
        </KeyboardAvoidingView>

        <ReportModal
            visible={reportVisible}
            title="쪽지 신고하기"
            reasonOrder={REPORT_REASON_ORDER}
            reasonLabels={REPORT_REASON_LABELS}
            selectedReason={reportReason}
            onSelectReason={setReportReason}
            detail={reportDetail}
            onChangeDetail={setReportDetail}
            submitting={reportSubmitting}
            onCancel={() => setReportVisible(false)}
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
  headerTitle: { fontSize: 16, fontWeight: "800", color: C.text, flex: 1, textAlign: "center", marginHorizontal: 8 },
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

  scroll: { padding: 16, gap: 4 },

  bubbleRow: { maxWidth: "78%", marginBottom: 10, flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubbleRowSelectable: { maxWidth: "100%" },
  bubbleRowMine: { alignSelf: "flex-end" },
  bubbleRowOther: { alignSelf: "flex-start" },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: C.text, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: "#94A3B8", marginTop: 3 },

  selectBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  selectBoxChecked: { backgroundColor: C.primary, borderColor: C.primary },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  input: {
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
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  selectionCountText: { fontSize: 13, fontWeight: "700", color: C.sub },
  reportSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.danger,
  },
  reportSubmitBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center" },
});
