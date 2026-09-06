import { Client } from "@stomp/stompjs";
import axios from "./axios";

function websocketUrl() {
    const apiUrl = new URL(axios.defaults.baseURL || window.location.origin, window.location.origin);
    apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
    apiUrl.pathname = "/ws";
    apiUrl.search = "";
    apiUrl.hash = "";
    return apiUrl.toString();
}

export function subscribeRealtime({ destination, onEvent, onConnectionChange }) {
    const token = localStorage.getItem("token");
    if (!token) return () => {};

    let subscription = null;
    const setConnected = (connected) => onConnectionChange?.(connected);
    const client = new Client({
        brokerURL: websocketUrl(),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        heartbeatIncoming: 20000,
        heartbeatOutgoing: 20000,
    });

    client.onConnect = () => {
        setConnected(true);
        subscription = client.subscribe(destination, (message) => {
            try {
                onEvent(JSON.parse(message.body));
            } catch {
                // 형식이 잘못된 이벤트는 무시하고 다음 이벤트를 기다립니다.
            }
        });
    };
    client.onWebSocketClose = () => setConnected(false);
    client.onStompError = () => setConnected(false);
    client.activate();

    return () => {
        setConnected(false);
        subscription?.unsubscribe();
        client.deactivate();
    };
}
