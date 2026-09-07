import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import { getAccessToken } from "../store/tokenStorage";

export type RealtimeEvent = { type: string; resourceId: number | null };
export type ConnectionState = "connecting" | "connected" | "disconnected";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
const WS_URL = API_BASE_URL.replace(/^http/, "ws") + "/ws";

type PendingSubscription = {
  destination: string;
  onEvent: (event: RealtimeEvent) => void;
  subscription: StompSubscription | null;
  cancelled: boolean;
};

const DISCONNECT_GRACE_MS = 3000;

let client: Client | null = null;
let refCount = 0;
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
const pendingSubscriptions = new Set<PendingSubscription>();
const connectionListeners = new Set<(state: ConnectionState) => void>();
let currentState: ConnectionState = "disconnected";

function setState(state: ConnectionState) {
  currentState = state;
  connectionListeners.forEach((listener) => listener(state));
}

function attachSubscription(entry: PendingSubscription) {
  // 이미 붙어있으면 다시 구독하지 않는다 (중복 구독 시 같은 이벤트를 두 번 받는다).
  if (entry.cancelled || entry.subscription || !client?.connected) return;
  entry.subscription = client.subscribe(entry.destination, (message: IMessage) => {
    try {
      entry.onEvent(JSON.parse(message.body));
    } catch {
      // 잘못된 payload는 무시
    }
  });
}

function getClient(): Client {
  if (client) return client;

  client = new Client({
    webSocketFactory: () => new WebSocket(WS_URL) as unknown as WebSocket,
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    beforeConnect: async () => {
      const token = await getAccessToken();
      client!.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    },
    onConnect: () => {
      setState("connected");
      pendingSubscriptions.forEach(attachSubscription);
    },
    onWebSocketClose: () => {
      // 연결이 끊기면 서버쪽 구독도 사라지므로, 재연결 때 다시 붙을 수 있도록 비워둔다.
      pendingSubscriptions.forEach((entry) => {
        entry.subscription = null;
      });
      setState("disconnected");
    },
    onStompError: () => setState("disconnected"),
  });

  return client;
}

export function connectSocket() {
  refCount += 1;

  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }

  const c = getClient();
  if (!c.active) {
    setState("connecting");
    c.activate();
  }
}

export function disconnectSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount > 0 || disconnectTimer) return;

  // 화면 전환 중에는 구독자 수가 잠깐 0이 되는데, 그때마다 끊었다 붙으면
  // 매번 TCP 재연결 + STOMP 핸드셰이크가 다시 일어난다. 잠깐 기다렸다 정리한다.
  disconnectTimer = setTimeout(() => {
    disconnectTimer = null;
    if (refCount === 0 && client?.active) {
      client.deactivate();
      setState("disconnected");
    }
  }, DISCONNECT_GRACE_MS);
}

export function subscribeRealtime(
  destination: string,
  onEvent: (event: RealtimeEvent) => void
): () => void {
  const entry: PendingSubscription = { destination, onEvent, subscription: null, cancelled: false };
  pendingSubscriptions.add(entry);
  attachSubscription(entry);

  return () => {
    entry.cancelled = true;
    entry.subscription?.unsubscribe();
    pendingSubscriptions.delete(entry);
  };
}

export function onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
  connectionListeners.add(listener);
  listener(currentState);
  return () => connectionListeners.delete(listener);
}

export function getConnectionState(): ConnectionState {
  return currentState;
}
