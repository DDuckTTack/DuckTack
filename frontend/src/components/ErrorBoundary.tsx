import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * 예상 못 한 오류로 화면이 하얗게 꺼지는 것을 막는 안전망.
 * 하위 트리에서 렌더 중 예외가 나면 안내 화면을 대신 보여주고,
 * "다시 시도"를 누르면 해당 트리를 다시 그린다.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (__DEV__) console.warn("[ErrorBoundary]", error);
  }

  private handleRetry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>문제가 발생했어요</Text>
        <Text style={styles.desc}>잠시 후 다시 시도해 주세요.</Text>
        <Pressable style={styles.button} onPress={this.handleRetry}>
          <Text style={styles.buttonText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  desc: { fontSize: 14, color: "#64748b", textAlign: "center" },
  button: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#4F46E5",
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
