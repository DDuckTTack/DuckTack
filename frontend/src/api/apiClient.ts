import axios from "axios";
import { getAccessToken, clearAccessToken } from "../store/tokenStorage";
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

            // FormData일 경우 Content-Type 제거
            if (config.data instanceof FormData) {
                delete (config.headers as any)["Content-Type"];
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

// 응답 인터셉터
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error?.response?.status;

        if (__DEV__) {
            console.log("응답 실패:", status, error?.response?.data);
        }

        if (status === 401) {
            await clearAccessToken();
            router.replace("/login");
        }

        return Promise.reject(error);
    }
);

export default apiClient;