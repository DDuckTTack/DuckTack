import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from "react-native";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MORE_MENU_ITEMS } from "../constants/moreMenu";

const C = {
  primary: "#4F46E5",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  card: "#FFFFFF",
};

const PANEL_WIDTH = Math.min(300, Dimensions.get("window").width * 0.8);

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function MoreDrawer({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : PANEL_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, translateX, backdropOpacity]);

  if (!mounted) return null;

  return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
            style={[
              styles.panel,
              { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, transform: [{ translateX }] },
            ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>더보기</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Feather name="x" size={20} color={C.sub} />
            </Pressable>
          </View>

          <View style={styles.menuList}>
            {MORE_MENU_ITEMS.map((item) => (
                <Pressable
                    key={item.key}
                    style={styles.menuRow}
                    onPress={() => {
                      onClose();
                      router.push(item.path);
                    }}
                >
                  <View style={styles.menuIconWrap}>
                    <Ionicons name={item.icon} size={20} color={C.primary} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Feather name="chevron-right" size={18} color={C.sub} />
                </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  panel: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: C.card,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },

  menuList: { gap: 10 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.bg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#EDEDFF",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: C.text },
});
