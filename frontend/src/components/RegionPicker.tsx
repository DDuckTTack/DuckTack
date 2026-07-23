import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";

import { REGION_SI_DO_LIST, RegionSiDo, buildRegionCode, buildRegionName } from "../constants/regions";

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

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (region: { regionCode: string; regionName: string }) => void;
};

export default function RegionPicker({ visible, onClose, onSelect }: Props) {
  const [siDo, setSiDo] = useState<RegionSiDo | null>(null);

  function handleClose() {
    setSiDo(null);
    onClose();
  }

  function handleSelectSiDo(item: RegionSiDo) {
    if (!item.cities || item.cities.length === 0) {
      onSelect({ regionCode: buildRegionCode(item.code), regionName: buildRegionName(item.name) });
      setSiDo(null);
      return;
    }
    setSiDo(item);
  }

  function handleSelectCity(cityCode: string, cityName: string) {
    if (!siDo) return;
    onSelect({
      regionCode: buildRegionCode(siDo.code, cityCode),
      regionName: buildRegionName(siDo.name, cityName),
    });
    setSiDo(null);
  }

  return (
      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              {siDo && (
                  <Pressable onPress={() => setSiDo(null)} style={styles.backBtn} hitSlop={8}>
                    <Feather name="arrow-left" size={18} color={C.primary} />
                  </Pressable>
              )}
              <Text style={styles.title}>{siDo ? siDo.name : "시/도 선택"}</Text>
              <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
                <Feather name="x" size={20} color={C.sub} />
              </Pressable>
            </View>

            <FlatList
                data={siDo ? siDo.cities ?? [] : REGION_SI_DO_LIST}
                keyExtractor={(item) => item.code}
                style={styles.list}
                renderItem={({ item }) =>
                    siDo ? (
                        <Pressable
                            style={styles.row}
                            onPress={() => handleSelectCity((item as any).code, (item as any).name)}
                        >
                          <Text style={styles.rowText}>{(item as any).name}</Text>
                          <Feather name="chevron-right" size={16} color={C.sub} />
                        </Pressable>
                    ) : (
                        <Pressable style={styles.row} onPress={() => handleSelectSiDo(item as RegionSiDo)}>
                          <Text style={styles.rowText}>{(item as RegionSiDo).name}</Text>
                          <Feather name="chevron-right" size={16} color={C.sub} />
                        </Pressable>
                    )
                }
            />
          </View>
        </View>
      </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: { width: 30 },
  closeBtn: { width: 30, alignItems: "flex-end" },
  title: { fontSize: 16, fontWeight: "800", color: C.text, flex: 1, textAlign: "center" },
  list: { paddingHorizontal: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rowText: { fontSize: 15, color: C.text, fontWeight: "600" },
});
