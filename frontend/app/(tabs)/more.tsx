import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";

const C = {
  primary: "#4F46E5",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  card: "#FFFFFF",
};

const MENU_ITEMS = [
  { key: "histories", label: "히스토리", icon: "time-outline" as const, path: "/histories" as const },
  { key: "mypage", label: "마이페이지", icon: "person-outline" as const, path: "/mypage" as const },
];

export default function MoreScreen() {
  return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>더보기</Text>
        </View>

        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => (
              <Pressable
                  key={item.key}
                  style={styles.menuRow}
                  onPress={() => router.push(item.path)}
              >
                <View style={styles.menuIconWrap}>
                  <Ionicons name={item.icon} size={20} color={C.primary} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Feather name="chevron-right" size={18} color={C.sub} />
              </Pressable>
          ))}
        </View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: C.text },

  menuList: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EDEDFF",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: C.text },
});
