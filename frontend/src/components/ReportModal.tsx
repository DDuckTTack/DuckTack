import { View, Text, Pressable, StyleSheet, TextInput, Modal, ActivityIndicator } from "react-native";

const C = {
  primary: "#4F46E5",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  card: "#FFFFFF",
};

type Props<T extends string> = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  reasonOrder: readonly T[];
  reasonLabels: Record<T, string>;
  detailReason?: T;
  selectedReason: T;
  onSelectReason: (reason: T) => void;
  detail: string;
  onChangeDetail: (value: string) => void;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
};

export default function ReportModal<T extends string>({
  visible,
  title = "신고하기",
  subtitle = "신고 사유를 선택해주세요.",
  reasonOrder,
  reasonLabels,
  detailReason = "OTHER" as T,
  selectedReason,
  onSelectReason,
  detail,
  onChangeDetail,
  submitting,
  onCancel,
  onSubmit,
}: Props<T>) {
  return (
      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onCancel}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.sub}>{subtitle}</Text>

            <View style={{ gap: 8, marginTop: 14 }}>
              {reasonOrder.map((reason) => (
                  <Pressable key={reason} onPress={() => onSelectReason(reason)} style={styles.reasonRow}>
                    <View style={[styles.radioOuter, selectedReason === reason && styles.radioOuterActive]}>
                      {selectedReason === reason && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.reasonText}>{reasonLabels[reason]}</Text>
                  </Pressable>
              ))}
            </View>

            {selectedReason === detailReason && (
                <TextInput
                    style={styles.detailInput}
                    placeholder="상세 사유를 입력해주세요 (선택)"
                    placeholderTextColor="#94A3B8"
                    value={detail}
                    onChangeText={onChangeDetail}
                    maxLength={500}
                    multiline
                />
            )}

            <View style={styles.btnRow}>
              <Pressable style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelText}>취소</Text>
              </Pressable>
              <Pressable
                  style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                  onPress={onSubmit}
                  disabled={submitting}
              >
                {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.submitText}>신고하기</Text>
                )}
              </Pressable>
            </View>
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
    padding: 22,
    paddingBottom: 32,
  },
  title: { fontSize: 17, fontWeight: "800", color: C.text },
  sub: { fontSize: 13, color: C.sub, marginTop: 4 },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: { borderColor: C.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  reasonText: { fontSize: 14, color: C.text, fontWeight: "600" },
  detailInput: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: C.text,
    minHeight: 70,
  },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: C.sub },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
