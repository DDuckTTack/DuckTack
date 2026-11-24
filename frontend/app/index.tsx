import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { getAccessToken } from "../src/store/tokenStorage";
import { getMe } from "../src/api/users";

// 앱 시작 시 저장된 로그인으로 자동 로그인한다.
// 액세스 토큰이 만료됐으면 apiClient 가 리프레시 토큰으로 재발급하고, 그것도 실패하면 로그인 화면으로 보낸다.
export default function Index() {
  const [target, setTarget] = useState<"/login" | "/(tabs)" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!(await getAccessToken())) {
          setTarget("/login");
          return;
        }
        await getMe();
        setTarget("/(tabs)");
      } catch {
        setTarget("/login");
      }
    })();
  }, []);

  if (!target) {
    return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
          <ActivityIndicator color="#4F46E5" />
        </View>
    );
  }

  return <Redirect href={target} />;
}
