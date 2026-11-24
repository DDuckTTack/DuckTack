import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const DUST_INTRO_SEEN_PREFIX = "dustIntroSeen:";

// SecureStore(암호화 저장소)는 네이티브(iOS/Android)에서만 동작한다.
// 웹에서는 지원되지 않으므로 AsyncStorage로 대체한다.
const useSecureStore = Platform.OS !== "web";

export async function saveAccessToken(token: string) {
  if (useSecureStore) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  } else {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (!useSecureStore) {
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  }

  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token) return token;

  // 이전 버전에서 AsyncStorage(평문)에 저장돼 있던 토큰을 SecureStore로 1회 이전.
  // 이렇게 하면 업데이트 후에도 로그인이 유지된다.
  const legacy = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (legacy) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, legacy);
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    return legacy;
  }

  return null;
}

// 액세스 토큰(2시간) 만료 시 재발급에 쓰는 리프레시 토큰(30일).
export async function saveRefreshToken(token: string) {
  if (useSecureStore) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } else {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  return useSecureStore
      ? SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
      : AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

/** 로그아웃: 액세스·리프레시 토큰을 모두 지운다. */
export async function clearAccessToken() {
  if (useSecureStore) {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } else {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  // 남아있을 수 있는 이전(평문) 저장분도 함께 제거
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
}

function introKeyForUser(username: string) {
  const normalized = username.trim().toLowerCase() || "anonymous";
  return `${DUST_INTRO_SEEN_PREFIX}${normalized}`;
}

export async function shouldShowDustIntro(username: string) {
  return (await AsyncStorage.getItem(introKeyForUser(username))) !== "true";
}

export async function markDustIntroSeen(username: string) {
  await AsyncStorage.setItem(introKeyForUser(username), "true");
}
