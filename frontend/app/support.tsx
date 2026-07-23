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
import { router, Stack } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import {
  getOrCreateThread,
  listMessages,
  sendMessage,
  parseMessageTimestamp,
  SupportThread,
  SupportMessageItem,
} from "../src/api/support";

const C = {
  primary: "#4F46E5",
  primaryBg: "#EDEDFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  card: "#FFFFFF",
};

const POLL_INTERVAL_MS = 1000;

function formatTime(value: string | null) {
  const date = parseMessageTimestamp(value);
  if (!date) return "";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [thread, setThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const lastIdRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const t = await getOrCreateThread();
        const initialMessages = await listMessages();
        setThread(t);
        setMessages(initialMessages);
        if (initialMessages.length > 0) {
          lastIdRef.current = initialMessages[initialMessages.length - 1].id;
        }
      } catch (e) {
        console.log("고객센터 조회 실패:", e);
        Alert.alert("불러오기 실패", "고객센터 정보를 가져오지 못했습니다.");
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const poll = useCallback(async () => {
    if (lastIdRef.current === null) return;
    try {
      const newMessages = await listMessages({ afterId: lastIdRef.current });
      if (newMessages.length > 0) {
        setMessages((prev) => [...prev, ...newMessages]);
        lastIdRef.current = newMessages[newMessages.length - 1].id;
      }
    } catch (e) {
      console.log("고객센터 폴링 실패:", e);
    }
  }, []);

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
      const sent = await sendMessage(content);
      setMessages((prev) => [...prev, sent]);
      lastIdRef.current = sent.id;
      setInput("");
    } catch (e: any) {
      console.log("문의 전송 실패:", e);
      Alert.alert("전송 실패", e?.response?.data?.message || "다시 시도해주세요.");
    } finally {
      setSending(false);
    }
  }

  if (loading || !thread) {
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
          <Text style={styles.headerTitle}>고객센터</Text>
          <View style={{ width: 40 }} />
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
            {messages.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Feather name="headphones" size={40} color="#E2E8F0" />
                  <Text style={styles.emptyText}>궁금한 점을 남겨주시면{"\n"}빠른 시일 내 답변드릴게요.</Text>
                </View>
            ) : (
                messages.map((m) => {
                  const mine = m.senderRole === "USER";
                  return (
                      <View key={m.id} style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
                        {!mine && <Text style={styles.senderLabel}>고객센터</Text>}
                        <View style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
                          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                            <Text style={[styles.bubbleText, mine && { color: "#fff" }]}>{m.content}</Text>
                          </View>
                          <Text style={styles.bubbleTime}>{formatTime(m.createdAt)}</Text>
                        </View>
                      </View>
                  );
                })
            )}
            <View style={{ height: 12 }} />
          </ScrollView>

          <View
              style={[
                styles.inputBar,
                { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 12) },
              ]}
          >
            <TextInput
                style={styles.input}
                placeholder="문의 내용을 입력하세요"
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
        </KeyboardAvoidingView>
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

  scroll: { padding: 16, gap: 4, flexGrow: 1 },

  bubbleRow: { maxWidth: "78%", marginBottom: 10 },
  bubbleRowMine: { alignSelf: "flex-end" },
  bubbleRowOther: { alignSelf: "flex-start" },
  senderLabel: { fontSize: 11, fontWeight: "700", color: C.sub, marginBottom: 3, marginLeft: 2 },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: C.text, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: "#94A3B8", marginTop: 3 },

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

  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center", lineHeight: 20 },
});
