import axios from "axios";
import {
    getAccessToken,
    clearAccessToken,
    getRefreshToken,
    saveAccessToken,
    saveRefreshToken,
} from "../store/tokenStorage";
import { router } from "expo-router";

export const apiClient = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
    timeout: 120000,
});

if (__DEV__) {
    console.log("API baseURL:", process.env.EXPO_PUBLIC_API_BASE_URL);
}

// 요청 인터셉터
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await getAccessToken();

            if (token) {
                config.headers = config.headers ?? {};
                (config.headers as any).Authorization = `Bearer ${token}`;
            }

            // FormData일 경우 multipart 로 고정 (boundary 는 RN 네이티브가 붙임).
            // 헤더를 지우면 axios 가 POST 기본값 x-www-form-urlencoded 를 넣어
            // 안드로이드 OkHttp 가 "multipart != application/x-www-form-urlencoded" 로 전송을 거부한다.
            if (config.data instanceof FormData) {
                (config.headers as any)["Content-Type"] = "multipart/form-data";
            }
        } catch (e) {
            if (__DEV__) console.log("토큰 가져오기 실패", e);
        }

        if (__DEV__) {
            console.log("요청 URL:", `${config.baseURL ?? ""}${config.url ?? ""}`);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// 리프레시 토큰으로 액세스 토큰 재발급. 동시에 여러 요청이 401 을 받아도 재발급은 한 번만 한다.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    try {
        // apiClient 가 아닌 axios 로 호출해 인터셉터(만료된 토큰 첨부·401 처리)를 타지 않게 한다.
        const res = await axios.post(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/auth/refresh`, { refreshToken });
        const data = res.data?.data ?? res.data;
        if (!data?.accessToken) return null;
        await saveAccessToken(data.accessToken);
        if (data.refreshToken) await saveRefreshToken(data.refreshToken);
        return data.accessToken;
    } catch {
        return null;
    }
}

// 응답 인터셉터
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error?.response?.status;
        const config = error?.config;

        if (__DEV__) {
            console.warn("응답 실패:", status, config?.url);
        }

        if (status === 401) {
            const isAuthCall = String(config?.url ?? "").startsWith("/api/auth/");
            if (config && !config._retried && !isAuthCall) {
                refreshing = refreshing ?? refreshAccessToken().finally(() => { refreshing = null; });
                const newToken = await refreshing;
                if (newToken) {
                    config._retried = true;
                    config.headers = config.headers ?? {};
                    (config.headers as any).Authorization = `Bearer ${newToken}`;
                    return apiClient(config);
                }
            }
            await clearAccessToken();
            router.replace("/login");
        }

        return Promise.reject(error);
    }
);

export default apiClient;